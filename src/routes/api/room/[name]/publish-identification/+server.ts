import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import {
	games,
	gameRounds,
	gamePlayers,
	roles,
	identificationVotes,
	gameArtifacts,
	user
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToRoom } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;

		// 檢查是否為房主
		if (!player.isHost) {
			return json({ message: '只有房主可以公布結果' }, { status: 403 });
		}

		// 檢查當前是否在鑑人階段
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'identification') {
			return json({ message: '當前不在鑑人階段' }, { status: 400 });
		}

		// 獲取所有投票
		const allVotes = await db
			.select()
			.from(identificationVotes)
			.where(eq(identificationVotes.gameId, game.id));

		// 獲取所有玩家及其角色資訊
		const playersWithRoles = await db
			.select({
				playerId: gamePlayers.id,
				userId: gamePlayers.userId,
				nickname: user.nickname,
				roleName: roles.name,
				camp: roles.camp,
				colorCode: gamePlayers.colorCode
			})
			.from(gamePlayers)
			.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
			.innerJoin(user, eq(gamePlayers.userId, user.id))
			.where(eq(gamePlayers.gameId, game.id));

		// 找出各角色的玩家
		const laoChaoFengPlayer = playersWithRoles.find((p) => p.roleName === '老朝奉');
		const xuYuanPlayer = playersWithRoles.find((p) => p.roleName === '許愿');
		const fangZhenPlayer = playersWithRoles.find((p) => p.roleName === '方震');
		const yaoburanPlayer = playersWithRoles.find((p) => p.roleName === '藥不然');

		// 計算投票結果
		const identificationResults: {
			laoChaoFeng?: {
				success: boolean;
				votes: number;
				required: number;
				targetName: string;
				actualName: string;
			};
			xuYuan?: { success: boolean; targetName: string; actualName: string };
			fangZhen?: { success: boolean; targetName: string; actualName: string };
		} = {};

		// 1. 許愿陣營投票老朝奉 (需過半)
		const xuYuanCampRoles = ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'];
		const xuYuanCampPlayers = playersWithRoles.filter((p) =>
			xuYuanCampRoles.includes(p.roleName || '')
		);
		const laoChaoFengVotes = allVotes.filter((v) => v.votedLaoChaoFeng !== null);

		// 統計投給每個玩家的票數
		const laoChaoFengVoteCount = new Map<number, number>();
		laoChaoFengVotes.forEach((v) => {
			const targetId = v.votedLaoChaoFeng!;
			laoChaoFengVoteCount.set(targetId, (laoChaoFengVoteCount.get(targetId) || 0) + 1);
		});

		// 找出得票最多的玩家
		let maxVotes = 0;
		let mostVotedPlayerId: number | null = null;
		laoChaoFengVoteCount.forEach((count, playerId) => {
			if (count > maxVotes) {
				maxVotes = count;
				mostVotedPlayerId = playerId;
			}
		});

		const requiredVotes = Math.floor(xuYuanCampPlayers.length / 2) + 1;
		const laoChaoFengSuccess =
			mostVotedPlayerId === laoChaoFengPlayer?.playerId && maxVotes >= requiredVotes;

		const targetPlayer = mostVotedPlayerId
			? playersWithRoles.find((p) => p.playerId === mostVotedPlayerId)
			: null;

		identificationResults.laoChaoFeng = {
			success: laoChaoFengSuccess,
			votes: maxVotes,
			required: requiredVotes,
			targetName: targetPlayer?.nickname || '無',
			actualName: laoChaoFengPlayer?.nickname || '未知'
		};

		// 2. 老朝奉投票許愿
		const xuYuanVote = allVotes.find((v) => v.votedXuYuan !== null);
		const xuYuanSuccess = xuYuanVote && xuYuanVote.votedXuYuan === xuYuanPlayer?.playerId;
		const xuYuanTarget = xuYuanVote
			? playersWithRoles.find((p) => p.playerId === xuYuanVote.votedXuYuan)
			: null;

		identificationResults.xuYuan = {
			success: xuYuanSuccess || false,
			targetName: xuYuanTarget?.nickname || '無',
			actualName: xuYuanPlayer?.nickname || '未知'
		};

		// 3. 藥不然投票方震
		const fangZhenVote = allVotes.find((v) => v.votedFangZhen !== null);
		const fangZhenSuccess = fangZhenVote && fangZhenVote.votedFangZhen === fangZhenPlayer?.playerId;
		const fangZhenTarget = fangZhenVote
			? playersWithRoles.find((p) => p.playerId === fangZhenVote.votedFangZhen)
			: null;

		identificationResults.fangZhen = {
			success: fangZhenSuccess || false,
			targetName: fangZhenTarget?.nickname || '無',
			actualName: fangZhenPlayer?.nickname || '未知'
		};

		// 計算最終分數
		let xuYuanScore = game.totalScore || 0;

		// 許愿陣營找出老朝奉 → +1 分
		if (laoChaoFengSuccess) {
			xuYuanScore += 1;
		}

		// 老朝奉找出許愿 → 許愿陣營不加分（防守成功）
		// 老朝奉沒找出許愿 → 許愿陣營 +2 分（進攻成功）
		if (!xuYuanSuccess) {
			xuYuanScore += 2;
		}

		// 藥不然找出方震 → 許愿陣營不加分（防守成功）
		// 藥不然沒找出方震 → 許愿陣營 +1 分（進攻成功）
		if (yaoburanPlayer && !fangZhenSuccess) {
			xuYuanScore += 1;
		}

		// 決定獲勝陣營
		const winner = xuYuanScore >= 6 ? '許愿陣營' : '老朝奉陣營';

		// 更新遊戲狀態
		await db
			.update(games)
			.set({
				status: 'finished',
				totalScore: xuYuanScore,
				finishedAt: new Date()
			})
			.where(eq(games.id, game.id));

		// 更新回合狀態
		await db
			.update(gameRounds)
			.set({
				phase: 'completed',
				completedAt: new Date()
			})
			.where(eq(gameRounds.id, currentRound[0].id));

		// 獲取所有獸首資料
		const allArtifacts = await db
			.select()
			.from(gameArtifacts)
			.where(eq(gameArtifacts.gameId, game.id));

		// 只保留被選中的獸首（每回合的第一名和第二名）
		const selectedArtifacts = allArtifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);

		const finalResult = {
			winner,
			xuYuanScore,
			allArtifacts: selectedArtifacts.map((a) => ({
				id: a.id,
				round: a.round,
				animal: a.animal,
				isGenuine: a.isGenuine,
				voteRank: a.voteRank,
				votes: a.votes
			})),
			players: playersWithRoles.map((p) => ({
				id: p.playerId,
				nickname: p.nickname,
				roleName: p.roleName,
				camp: p.camp,
				colorCode: p.colorCode
			})),
			identificationResults
		};

		// 廣播遊戲結束
		emitToRoom(params.name!, 'game-finished', finalResult);

		return json({
			message: `遊戲結束，${winner}獲勝！`,
			winner,
			xuYuanScore,
			identificationResults
		});
	} catch (error) {
		console.error('公布鑑人結果錯誤:', error);
		return json({ message: '公布結果失敗' }, { status: 500 });
	}
};
