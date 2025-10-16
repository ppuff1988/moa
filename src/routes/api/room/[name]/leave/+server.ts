import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games, gamePlayers, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { getGameState } from '$lib/server/game';

export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { user: currentUser, game } = verifyResult;

	// 檢查是否為房主
	const isHost = game.hostId === currentUser.id;

	// 獲取 Socket.IO 實例
	const io = getSocketIO();

	// 移除玩家
	await db
		.delete(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, currentUser.id)));

	// 更新房間玩家數量
	const newPlayerCount = game.playerCount - 1;

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

				// 通知玩家離開
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
};
