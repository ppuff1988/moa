import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import {
	gameArtifacts,
	gamePlayers,
	roles,
	user,
	identificationVotes
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// 獲取遊戲最終結果
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 檢查遊戲是否已結束
	if (game.status !== 'finished') {
		return json({ message: '遊戲尚未結束' }, { status: 400 });
	}

	try {
		// 獲取所有獸首資料
		const allArtifacts = await db
			.select()
			.from(gameArtifacts)
			.where(eq(gameArtifacts.gameId, game.id));

		// 只保留被選中的獸首（每回合的第一名和第二名）
		const selectedArtifacts = allArtifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);

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

		// 獲取鑑人結果（如果有）
		let identificationResults = null;
		const votes = await db
			.select()
			.from(identificationVotes)
			.where(eq(identificationVotes.gameId, game.id));

		if (votes.length > 0) {
			// 找出各角色的玩家
			const laoChaoFengPlayer = playersWithRoles.find((p) => p.roleName === '老朝奉');
			const xuYuanPlayer = playersWithRoles.find((p) => p.roleName === '許愿');
			const fangZhenPlayer = playersWithRoles.find((p) => p.roleName === '方震');

			identificationResults = {
				laoChaoFeng: null as {
					success: boolean;
					targetName: string;
					actualName: string;
					votes: number;
					required: number;
				} | null,
				xuYuan: null as {
					success: boolean;
					targetName: string;
					actualName: string;
				} | null,
				fangZhen: null as {
					success: boolean;
					targetName: string;
					actualName: string;
				} | null
			};

			// 1. 許愿陣營投票老朝奉
			const xuYuanCampRoles = ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'];
			const xuYuanCampPlayers = playersWithRoles.filter((p) =>
				xuYuanCampRoles.includes(p.roleName || '')
			);
			const laoChaoFengVotes = votes.filter((v) => v.votedLaoChaoFeng !== null);

			const laoChaoFengVoteCount = new Map<number, number>();
			laoChaoFengVotes.forEach((v) => {
				const targetId = v.votedLaoChaoFeng!;
				laoChaoFengVoteCount.set(targetId, (laoChaoFengVoteCount.get(targetId) || 0) + 1);
			});

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
			const xuYuanVote = votes.find((v) => v.votedXuYuan !== null);
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
			const fangZhenVote = votes.find((v) => v.votedFangZhen !== null);
			const fangZhenSuccess =
				fangZhenVote && fangZhenVote.votedFangZhen === fangZhenPlayer?.playerId;
			const fangZhenTarget = fangZhenVote
				? playersWithRoles.find((p) => p.playerId === fangZhenVote.votedFangZhen)
				: null;

			identificationResults.fangZhen = {
				success: fangZhenSuccess || false,
				targetName: fangZhenTarget?.nickname || '無',
				actualName: fangZhenPlayer?.nickname || '未知'
			};
		}

		// 決定獲勝陣營
		const xuYuanScore = game.totalScore || 0;
		const winner = xuYuanScore >= 4 ? '許愿陣營' : '老朝奉陣營';

		return json({
			success: true,
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
		});
	} catch (error) {
		console.error('獲取最終結果錯誤:', error);
		return json({ message: '獲取最終結果失敗' }, { status: 500 });
	}
};
