import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startGame, startRoleSelection } from '$lib/server/game';
import { verifyHostPermission } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, gameRounds, gameActions, roles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { chineseNumeral } from '$lib/utils/round';

export const POST: RequestHandler = async (event) => {
	// 驗證房主權限
	const verifyResult = await verifyHostPermission(event.request, event.params.name);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	// 確保有 game 屬性
	if (!('game' in verifyResult)) {
		return json({ message: '驗證失敗' }, { status: 500 });
	}

	const { game } = verifyResult;
	const roomName = event.params.name;

	try {
		// 解析請求體（可選參數 round，用於指定要開始的回合）
		let body;
		try {
			body = await event.request.json();
		} catch {
			body = {};
		}
		const { round: requestedRound } = body;

		// 獲取所有玩家（用於各種檢查）
		const players = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game.id));

		// 如果遊戲在等待階段，開始選角
		if (game.status === 'waiting') {
			// 開始選角階段（startRoleSelection 會檢查玩家人數）
			try {
				await startRoleSelection(game.id);
				return json(
					{
						message: '遊戲已開始選角階段',
						status: 'selecting',
						roomName: game.roomName
					},
					{ status: 200 }
				);
			} catch (error) {
				return json(
					{
						message: error instanceof Error ? error.message : '開始選角失敗'
					},
					{ status: 400 }
				);
			}
		}

		// 如果遊戲在選角階段，開始第1回合
		if (game.status === 'selecting') {
			// 檢查玩家人數
			if (players.length < 6 || players.length > 8) {
				console.error(`[start-game] 玩家人數不正確: ${players.length} 人`);
				return json(
					{
						message: `玩家人數不正確，目前 ${players.length} 人，需要 6-8 人`
					},
					{ status: 400 }
				);
			}

			// 檢查是否所有玩家都已選擇角色
			const playersWithoutRole = players.filter((p) => !p.roleId);
			if (playersWithoutRole.length > 0) {
				console.error(`[start-game] 還有 ${playersWithoutRole.length} 位玩家未選擇角色`);
				return json(
					{
						message: `還有 ${playersWithoutRole.length} 位玩家未選擇角色`
					},
					{ status: 400 }
				);
			}

			// 檢查是否所有玩家都已選擇顏色
			const playersWithoutColor = players.filter((p) => !p.color);
			if (playersWithoutColor.length > 0) {
				console.error(`[start-game] 還有 ${playersWithoutColor.length} 位玩家未選擇顏色`);
				return json(
					{
						message: `還有 ${playersWithoutColor.length} 位玩家未選擇顏色`
					},
					{ status: 400 }
				);
			}

			// 檢查是否所有玩家都已準備
			const notReadyPlayers = players.filter((p) => !p.isReady);
			if (notReadyPlayers.length > 0) {
				console.error(`[start-game] 還有 ${notReadyPlayers.length} 位玩家未準備完成`);
				return json(
					{
						message: `還有 ${notReadyPlayers.length} 位玩家未準備完成`
					},
					{ status: 400 }
				);
			}

			// 檢查是否有重複的角色
			// 先獲取所有角色信息
			const allRoles = await db.select().from(roles);
			const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));

			// 統計每個角色被選擇的次數
			const roleCount = new Map<number, string>();

			for (const player of players) {
				if (player.roleId) {
					const roleName = roleMap.get(player.roleId) || '未知角色';
					const existing = roleCount.get(player.roleId);
					if (existing) {
						// 如果已經存在，表示重複了
						roleCount.set(player.roleId, roleName);
					} else {
						roleCount.set(player.roleId, roleName);
					}
				}
			}

			// 找出重複的角色
			const duplicateRoles: string[] = [];
			const roleCountMap = new Map<number, number>();

			for (const player of players) {
				if (player.roleId) {
					roleCountMap.set(player.roleId, (roleCountMap.get(player.roleId) || 0) + 1);
				}
			}

			for (const [roleId, count] of roleCountMap.entries()) {
				if (count > 1) {
					const roleName = roleMap.get(roleId) || '未知角色';
					duplicateRoles.push(roleName);
				}
			}

			if (duplicateRoles.length > 0) {
				console.error(`[start-game] 發現重複的角色: ${duplicateRoles.join('、')}`);
				return json(
					{
						message: `發現重複的角色，請重新選擇：${duplicateRoles.join('、')}`,
						duplicateRoles
					},
					{ status: 400 }
				);
			}

			// 開始遊戲（第1回合）
			// startGame 函數內部已經會廣播 game-started 事件，這裡不需要再次廣播
			const result = await startGame(game.id);

			// 注意：game-started 事件已經在 startGame 函數內部廣播，不需要在這裡重複發送

			return json(
				{
					message: '遊戲開始成功',
					gameId: result.gameId,
					roundId: result.roundId,
					round: 1
				},
				{ status: 200 }
			);
		}

		// 如果遊戲正在進行中，開始新回合（第2或第3回合）
		if (game.status === 'playing') {
			// 確定要開始的回合數
			let nextRoundNumber: number;

			if (requestedRound) {
				// 如果請求中指定了回合數
				if (requestedRound < 2 || requestedRound > 3) {
					return json({ message: '無效的回合數字（只能是 2 或 3）' }, { status: 400 });
				}
				nextRoundNumber = requestedRound;
			} else {
				// 如果沒有指定，自動判斷下一回合
				const existingRounds = await db
					.select()
					.from(gameRounds)
					.where(eq(gameRounds.gameId, game.id))
					.orderBy(gameRounds.round);

				const currentRound =
					existingRounds.length > 0 ? existingRounds[existingRounds.length - 1].round : 0;
				nextRoundNumber = currentRound + 1;

				if (nextRoundNumber > 3) {
					return json({ message: '遊戲已完成所有回合' }, { status: 400 });
				}
			}

			// 查找上一回合
			const previousRoundNumber = nextRoundNumber - 1;
			const [previousRound] = await db
				.select()
				.from(gameRounds)
				.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, previousRoundNumber)))
				.limit(1);

			if (!previousRound) {
				return json({ message: `找不到第 ${previousRoundNumber} 回合` }, { status: 404 });
			}

			// 檢查上一回合的狀態，根據情況進行相應處理
			if (!previousRound.completedAt) {
				// 如果前一回合還未完成
				if (previousRound.phase === 'action' || previousRound.phase === 'discussion') {
					// 行動或討論階段未完成，不允許開始新回合
					return json(
						{
							message: `第 ${previousRoundNumber} 回合尚未準備好進入下一回合。當前狀態：${previousRound.phase}`
						},
						{ status: 400 }
					);
				} else if (previousRound.phase === 'voting') {
					// 如果前一回合還在投票階段，自動跳過到結果階段
					await db
						.update(gameRounds)
						.set({ phase: 'result' })
						.where(eq(gameRounds.id, previousRound.id));
				}

				// 無論如何，如果前一回合還未標記完成，就在這裡完成它
				if (previousRound.phase === 'result' || previousRound.phase === 'voting') {
					await db
						.update(gameRounds)
						.set({
							phase: 'completed',
							completedAt: new Date()
						})
						.where(eq(gameRounds.id, previousRound.id));
				}
			}

			// 檢查新回合是否已經存在
			const [existingRound] = await db
				.select()
				.from(gameRounds)
				.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, nextRoundNumber)))
				.limit(1);

			if (existingRound) {
				return json({ message: `第 ${nextRoundNumber} 回合已經存在` }, { status: 400 });
			}

			// 獲取上一回合的最後一個行動玩家
			const lastActions = await db
				.select({
					playerId: gameActions.playerId,
					ordering: gameActions.ordering
				})
				.from(gameActions)
				.where(and(eq(gameActions.gameId, game.id), eq(gameActions.roundId, previousRound.id)))
				.orderBy(gameActions.ordering);

			if (lastActions.length === 0) {
				return json({ message: '上一回合沒有任何玩家行動記錄' }, { status: 400 });
			}

			// 獲取最後一個行動的玩家
			const lastPlayerId = lastActions[lastActions.length - 1].playerId;

			// 創建新回合，最後行動的玩家成為新回合的起始玩家
			const [newRound] = await db
				.insert(gameRounds)
				.values({
					gameId: game.id,
					round: nextRoundNumber,
					phase: 'action',
					actionOrder: [lastPlayerId] // 上一輪最後的玩家為新一輪的起始玩家
				})
				.returning();

			// 通過 Socket.IO 通知所有玩家
			try {
				const { getSocketIO } = await import('$lib/server/socket');
				const io = getSocketIO();
				if (io) {
					io.to(roomName).emit('round-started', {
						roundId: newRound.id,
						round: nextRoundNumber,
						firstPlayerId: lastPlayerId,
						previousRoundCompleted: true
					});
				}
			} catch (error) {
				console.error('發送 Socket 事件失敗:', error);
			}

			return json({
				success: true,
				roundId: newRound.id,
				round: nextRoundNumber,
				firstPlayerId: lastPlayerId,
				message: `第${chineseNumeral(nextRoundNumber)}回合已開始`
			});
		}

		// 其他狀態
		return json({ message: `遊戲狀態不正確（當前: ${game.status}）` }, { status: 400 });
	} catch (error) {
		console.error('開始遊戲/回合錯誤:', error);
		return json({ message: error instanceof Error ? error.message : '開始失敗' }, { status: 500 });
	}
};
