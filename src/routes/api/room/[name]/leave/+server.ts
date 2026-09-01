import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, gameRounds, games, user } from '$lib/server/db/schema';
import { getGameState } from '$lib/server/game';
import { finalizeOnlineVotingIfComplete } from '$lib/server/game-voting';
import { getSocketIO } from '$lib/server/socket';
import { json } from '@sveltejs/kit';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { user: currentUser, game } = verifyResult;
	const isHost = game.hostId === currentUser.id;
	const io = getSocketIO();

	// 取得最新遊戲狀態
	const [gameRow] = await db.select().from(games).where(eq(games.id, game.id)).limit(1);
	const status = gameRow?.status;

	if (status === 'waiting' || status === 'selecting') {
		// waiting 或 selecting 狀態：直接刪除 game_players
		await db
			.delete(gamePlayers)
			.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, currentUser.id)));

		// 更新房間玩家數量
		const newPlayerCount = game.playerCount - 1;

		// 如果是 selecting 狀態，解鎖所有玩家（取消 lock 狀態）
		if (status === 'selecting') {
			await db.update(gamePlayers).set({ isReady: false }).where(eq(gamePlayers.gameId, game.id));

			// 先更新玩家數量
			await db
				.update(games)
				.set({
					playerCount: newPlayerCount,
					updatedAt: new Date()
				})
				.where(eq(games.id, game.id));

			// 發送 room-update 讓前端更新玩家列表
			if (io) {
				const gameState = await getGameState(game.id);
				io.to(game.roomName).emit('room-update', {
					game: gameState.game,
					players: gameState.players
				});

				io.to(game.roomName).emit('player-left', {
					userId: currentUser.id,
					nickname: currentUser.nickname
				});
			}

			// 檢查人數是否不足6人，如果是則強制結束遊戲
			if (newPlayerCount < 6) {
				const { forceEndGame } = await import('$lib/server/game');
				await forceEndGame(game.id, '由於人數不足，遊戲已強制結束');

				// 通知房間內的其他玩家遊戲被強制結束
				if (io) {
					io.to(game.roomName).emit('game-force-ended', {
						reason: '由於人數不足，遊戲已強制結束',
						playerLeft: {
							userId: currentUser.id,
							nickname: currentUser.nickname
						}
					});
				}

				return json({
					message: '成功離開房間，因人數不足遊戲已結束',
					roomName: game.roomName,
					gameEnded: true
				});
			}

			// 如果人數足夠，只是離開房間
			return json({
				message: '成功離開房間',
				roomName: game.roomName
			});
		}

		// 如果房間沒有玩家了，刪除房間
		if (newPlayerCount === 0) {
			await db.delete(games).where(eq(games.id, game.id));

			// 通知房間已關閉（雖然沒有人在了，但為了完整性）
			if (io) {
				io.to(game.roomName).emit('room-closed', {
					message: '房間已關閉',
					roomName: game.roomName
				});
			}

			return json({
				message: '成功離開房間，房間已關閉',
				roomName: game.roomName,
				roomDeleted: true
			});
		}

		// 如果是房主離開，轉移房主給第一個玩家
		if (isHost) {
			const [newHost] = await db
				.select()
				.from(gamePlayers)
				.where(eq(gamePlayers.gameId, game.id))
				.limit(1);

			if (newHost) {
				// 獲取新房主的用戶信息
				const [newHostUser] = await db
					.select()
					.from(user)
					.where(eq(user.id, newHost.userId))
					.limit(1);

				// 更新新房主
				await db.update(gamePlayers).set({ isHost: true }).where(eq(gamePlayers.id, newHost.id));

				// 更新遊戲的房主ID
				await db
					.update(games)
					.set({
						hostId: newHost.userId,
						playerCount: newPlayerCount,
						updatedAt: new Date()
					})
					.where(eq(games.id, game.id));

				// 通知房間內的其他玩家
				if (io) {
					// 獲取更新後的遊戲狀態
					const gameState = await getGameState(game.id);

					// 廣播完整的房間更新
					io.to(game.roomName).emit('room-update', {
						game: gameState.game,
						players: gameState.players
					});

					// 通知玩家離開和房主轉移
					io.to(game.roomName).emit('player-left', {
						userId: currentUser.id,
						nickname: currentUser.nickname,
						newHost: {
							userId: newHost.userId,
							nickname: newHostUser.nickname
						}
					});
				}

				return json({
					message: '成功離開房間，已轉移房主',
					roomName: game.roomName,
					newHostId: newHost.userId
				});
			}
		}

		// 更新玩家數量
		await db
			.update(games)
			.set({
				playerCount: newPlayerCount,
				updatedAt: new Date()
			})
			.where(eq(games.id, game.id));

		// 通知房間內的其他玩家
		if (io) {
			// 獲取更新後的遊戲狀態
			const gameState = await getGameState(game.id);

			// 廣播完整的房間更新
			io.to(game.roomName).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});

			// 通知玩家離開
			io.to(game.roomName).emit('player-left', {
				userId: currentUser.id,
				nickname: currentUser.nickname
			});
		}

		return json({
			message: '成功離開房間',
			roomName: game.roomName
		});
	} else {
		if (status === 'playing') {
			const { remainingCount, votingFinalization } = await db.transaction(async (tx) => {
				// 與線上投票提交維持相同鎖順序：先鎖回合，再鎖／更新玩家列。
				const [currentRound] = await tx
					.select()
					.from(gameRounds)
					.where(eq(gameRounds.gameId, game.id))
					.orderBy(desc(gameRounds.round))
					.limit(1)
					.for('update');

				await tx
					.update(gamePlayers)
					.set({ leftAt: new Date() })
					.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, currentUser.id)));

				const remainingPlayers = await tx
					.select({ id: gamePlayers.id })
					.from(gamePlayers)
					.where(and(eq(gamePlayers.gameId, game.id), isNull(gamePlayers.leftAt)));
				let votingFinalization = null;
				if (
					remainingPlayers.length >= 6 &&
					game.onlineVotingEnabled &&
					currentRound?.phase === 'voting'
				) {
					votingFinalization = await finalizeOnlineVotingIfComplete(tx, game.id, currentRound);
				}

				return { remainingCount: remainingPlayers.length, votingFinalization };
			});

			// 如果剩餘人數少於6人，強制結束遊戲
			if (remainingCount < 6) {
				const { forceEndGame } = await import('$lib/server/game');
				await forceEndGame(game.id, '由於人數不足，遊戲已強制結束');

				// 通知房間內的其他玩家遊戲被強制結束
				if (io) {
					io.to(game.roomName).emit('game-force-ended', {
						reason: '由於人數不足，遊戲已強制結束',
						playerLeft: {
							userId: currentUser.id,
							nickname: currentUser.nickname
						}
					});
				}

				return json({
					message: '成功離開房間，因人數不足遊戲已結束',
					roomName: game.roomName,
					gameEnded: true
				});
			}

			if (votingFinalization?.completed && io) {
				io.to(game.roomName).emit('voting-completed', {
					phase: 'result',
					votingResult: votingFinalization.votingResult
				});
			}

			// 在 playing 狀態下通知玩家離開（包含剩餘人數）
			if (io) {
				io.to(game.roomName).emit('player-left', {
					userId: currentUser.id,
					nickname: currentUser.nickname,
					remainingCount
				});
			}

			return json({
				message: '成功離開房間',
				roomName: game.roomName,
				votingCompleted: votingFinalization?.completed ?? false
			});
		}

		// finished／terminated 狀態保留玩家歷史，只標記離房時間。
		await db
			.update(gamePlayers)
			.set({ leftAt: new Date() })
			.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, currentUser.id)));

		return json({ message: '成功離開房間', roomName: game.roomName });
	}
};
