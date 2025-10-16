import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyHostWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games, gamePlayers, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { getGameState } from '$lib/server/game';

export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyHostWithStatus(request, params.name!, 'waiting');
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 安全地解析 JSON，處理可能的錯誤
	let requestBody;
	try {
		requestBody = await request.json();
	} catch {
		return json({ message: '無效的 JSON 格式' }, { status: 400 });
	}

	const { targetUserId } = requestBody;

	if (!targetUserId) {
		return json({ message: '目標玩家ID是必需的' }, { status: 400 });
	}

	// 驗證 targetUserId 是否為有效數字
	if (typeof targetUserId !== 'number' || !Number.isInteger(targetUserId) || targetUserId <= 0) {
		return json({ message: '無效的玩家ID' }, { status: 400 });
	}

	// 檢查目標玩家是否在房間中
	const [targetPlayer] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, targetUserId)))
		.limit(1);

	if (!targetPlayer) {
		return json({ message: '目標玩家不在房間中' }, { status: 404 });
	}

	// 不能踢出自己
	if (targetUserId === game.hostId) {
		return json({ message: '不能踢出自己' }, { status: 400 });
	}

	// 獲取被踢玩家的暱稱（在刪除前獲取）
	const [kickedUser] = await db.select().from(user).where(eq(user.id, targetUserId)).limit(1);

	// 移除玩家
	await db
		.delete(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, targetUserId)));

	// 更新房間玩家數量
	await db
		.update(games)
		.set({
			playerCount: game.playerCount - 1,
			updatedAt: new Date()
		})
		.where(eq(games.id, game.id));

	// 通過 Socket.IO 廣播房間更新
	const io = getSocketIO();
	if (io) {
		try {
			// 先通知被踢玩家（使用個人頻道）
			io.to(`user-${targetUserId}`).emit('player-kicked', {
				userId: targetUserId,
				nickname: kickedUser?.nickname
			});

			// 讓被踢玩家離開房間（從 Socket.IO 房間中移除）
			const socketsInRoom = await io.in(game.roomName).fetchSockets();
			for (const socket of socketsInRoom) {
				if (socket.data.userId === targetUserId) {
					socket.leave(game.roomName);
				}
			}

			// 獲取更新後的遊戲狀態
			const gameState = await getGameState(game.id);

			// 廣播完整的房間更新給剩餘的玩家
			io.to(game.roomName).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});

			// 通知其他玩家有人被踢出
			io.to(game.roomName).emit('player-kicked', {
				userId: targetUserId,
				nickname: kickedUser?.nickname
			});
		} catch (error) {
			console.error('廣播踢出玩家更新失敗:', error);
		}
	}

	return json({
		message: '成功踢出玩家',
		targetUserId
	});
};
