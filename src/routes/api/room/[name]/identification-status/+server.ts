import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, gamePlayers, roles, identificationVotes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 獲取鑑人階段投票狀態
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	try {
		// 檢查當前是否在鑑人階段
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'identification') {
			return json({ message: '當前不在鑑人階段' }, { status: 400 });
		}

		// 獲取所有玩家及其角色
		const allPlayersWithRoles = await db
			.select({
				playerId: gamePlayers.id,
				roleName: roles.name
			})
			.from(gamePlayers)
			.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
			.where(eq(gamePlayers.gameId, game.id));

		// 計算有投票權的玩家數量（排除鄭國渠）
		const eligibleVoters = allPlayersWithRoles.filter((p) => p.roleName !== '鄭國渠');
		const totalEligibleVoters = eligibleVoters.length;

		// 獲取已投票數量
		const allVotes = await db
			.select()
			.from(identificationVotes)
			.where(eq(identificationVotes.gameId, game.id));

		// 檢查當前玩家是否已投票
		const hasVoted = allVotes.some((v) => v.playerId === player.id);

		// 檢查當前玩家是否為鄭國渠
		const currentPlayerRole = allPlayersWithRoles.find((p) => p.playerId === player.id);
		const isZhengGuoQu = currentPlayerRole?.roleName === '鄭國渠';

		return json({
			votedCount: allVotes.length,
			totalEligibleVoters: totalEligibleVoters,
			hasVoted: hasVoted,
			isZhengGuoQu: isZhengGuoQu,
			allVoted: allVotes.length >= totalEligibleVoters
		});
	} catch (error) {
		console.error('獲取鑑人投票狀態錯誤:', error);
		return json({ message: '獲取狀態失敗' }, { status: 500 });
	}
};
