import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, gameActions, roles, gamePlayers } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

// 獲取玩家的所有回合行動歷史
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	try {
		// 獲取玩家的 attackedRounds 資訊
		const [playerData] = await db
			.select({
				attackedRounds: gamePlayers.attackedRounds
			})
			.from(gamePlayers)
			.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, player.userId)))
			.limit(1);

		const attackedRounds = (playerData?.attackedRounds as number[]) || [];

		// 獲取遊戲的所有回合，按回合數排序
		const rounds = await db
			.select({
				id: gameRounds.id,
				round: gameRounds.round,
				phase: gameRounds.phase,
				actionOrder: gameRounds.actionOrder,
				startedAt: gameRounds.startedAt,
				completedAt: gameRounds.completedAt
			})
			.from(gameRounds)
			.where(eq(gameRounds.gameId, game.id))
			.orderBy(asc(gameRounds.round));

		// 為每個回合獲取該玩家的行動記錄
		const roundsWithActions = await Promise.all(
			rounds.map(async (round) => {
				// 獲取該玩家在此回合的所有行動
				const actions = await db
					.select({
						id: gameActions.id,
						ordering: gameActions.ordering,
						actionData: gameActions.actionData,
						timestamp: gameActions.timestamp
					})
					.from(gameActions)
					.where(
						and(
							eq(gameActions.gameId, game.id),
							eq(gameActions.roundId, round.id),
							eq(gameActions.playerId, player.id)
						)
					)
					.orderBy(asc(gameActions.ordering));

				// 解析行動數據
				const parsedActions = actions.map((action) => {
					const actionData = action.actionData as Record<string, unknown> | null;
					return {
						id: action.id,
						ordering: action.ordering,
						type: (actionData?.type as string) || 'unknown',
						data: actionData || {},
						timestamp: action.timestamp
					};
				});

				// 獲取該回合的行動順序（所有玩家）
				const actionOrder = (round.actionOrder as number[]) || [];
				const myOrderIndex = actionOrder.indexOf(player.id);

				// actionOrder 是倒序的（最新行動的在前面），需要轉換為正序
				// 例如：8人遊戲，第1個行動的玩家在 index 7，應該顯示為第 1 位
				// 計算公式：正序位置 = 總人數 - 倒序索引
				const myActualOrder = myOrderIndex >= 0 ? actionOrder.length - myOrderIndex : null;

				// 檢查該回合是否被攻擊
				const isAttacked = attackedRounds.includes(round.round);

				return {
					roundNumber: round.round,
					phase: round.phase,
					startedAt: round.startedAt,
					completedAt: round.completedAt,
					myOrderIndex: myActualOrder, // 使用正確的正序位置
					totalPlayers: actionOrder.length,
					actions: parsedActions,
					isCompleted: round.completedAt !== null,
					isAttacked: isAttacked // 新增：是否在此回合被攻擊
				};
			})
		);

		// 獲取當前玩家的角色信息（如果有的話）
		let roleInfo = null;
		if (player.roleId) {
			const [role] = await db
				.select({
					name: roles.name,
					camp: roles.camp
				})
				.from(roles)
				.where(eq(roles.id, player.roleId))
				.limit(1);

			roleInfo = role || null;
		}

		return json({
			success: true,
			playerInfo: {
				id: player.id,
				nickname: player.color || '未知',
				role: roleInfo
			},
			rounds: roundsWithActions,
			currentRound: rounds.find((r) => !r.completedAt)?.round || null
		});
	} catch (error) {
		console.error('獲取行動歷史錯誤:', error);
		return json(
			{
				success: false,
				error: '無法獲取行動歷史'
			},
			{ status: 500 }
		);
	}
};
