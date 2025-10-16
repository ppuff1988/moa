import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, gamePlayers, roles, identificationVotes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToRoom } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;
		const body = await request.json();
		const { votes } = body;

		// 檢查當前是否在鑑人階段
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'identification') {
			return json({ message: '當前不在鑑人階段' }, { status: 400 });
		}

		// 檢查是否已經投過票
		const existingVote = await db
			.select()
			.from(identificationVotes)
			.where(
				and(eq(identificationVotes.gameId, game.id), eq(identificationVotes.playerId, player.id))
			)
			.limit(1);

		if (existingVote.length > 0) {
			return json({ message: '您已經投過票了' }, { status: 400 });
		}

		// 檢查玩家的角色和投票權限
		const playerRole = await db
			.select({
				name: roles.name
			})
			.from(gamePlayers)
			.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
			.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, player.userId)))
			.limit(1);

		if (playerRole.length === 0 || !playerRole[0].name) {
			return json({ message: '您沒有角色' }, { status: 400 });
		}

		const roleName = playerRole[0].name;

		// 驗證投票權限
		const xuYuanCamp = ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'];
		const canVoteLaoChaoFeng = xuYuanCamp.includes(roleName);
		const canVoteXuYuan = roleName === '老朝奉';
		const canVoteFangZhen = roleName === '藥不然';

		// 建立投票記錄
		const voteData = {
			gameId: game.id,
			playerId: player.id,
			votedLaoChaoFeng: null as number | null,
			votedXuYuan: null as number | null,
			votedFangZhen: null as number | null
		};

		if (canVoteLaoChaoFeng && votes.laoChaoFeng) {
			voteData.votedLaoChaoFeng = votes.laoChaoFeng;
		}
		if (canVoteXuYuan && votes.xuYuan) {
			voteData.votedXuYuan = votes.xuYuan;
		}
		if (canVoteFangZhen && votes.fangZhen) {
			voteData.votedFangZhen = votes.fangZhen;
		}

		// 儲存投票
		await db.insert(identificationVotes).values(voteData);

		// 獲取所有玩家及其角色
		const allPlayersWithRoles = await db
			.select({
				playerId: gamePlayers.id,
				userId: gamePlayers.userId,
				roleName: roles.name
			})
			.from(gamePlayers)
			.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
			.where(eq(gamePlayers.gameId, game.id));

		// 計算有投票權的玩家數量（排除鄭國渠）
		const eligibleVoters = allPlayersWithRoles.filter((p) => p.roleName !== '鄭國渠');
		const totalEligibleVoters = eligibleVoters.length;

		const allVotes = await db
			.select()
			.from(identificationVotes)
			.where(eq(identificationVotes.gameId, game.id));

		// 通知房間有玩家完成投票
		emitToRoom(params.name!, 'player-voted-identification', {
			playerId: player.id,
			votedCount: allVotes.length,
			totalEligibleVoters: totalEligibleVoters
		});

		// 如果所有有投票權的玩家都投票了，通知房主可以公布結果
		if (allVotes.length >= totalEligibleVoters) {
			emitToRoom(params.name!, 'all-players-voted-identification', {
				message: '所有玩家已完成投票，房主可以公布結果'
			});
		}

		return json({
			message: '投票成功',
			votedCount: allVotes.length,
			totalEligibleVoters: totalEligibleVoters
		});
	} catch (error) {
		console.error('提交鑑人投票錯誤:', error);
		return json({ message: '提交失敗' }, { status: 500 });
	}
};
