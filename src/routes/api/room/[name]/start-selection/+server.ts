import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyHostWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { MIN_PLAYERS } from '$lib/server/constants';
import { getSocketIO } from '$lib/server/socket';
import { getGameState } from '$lib/server/game';

export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyHostWithStatus(request, params.name!, 'waiting');
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 檢查玩家數量 (最少需要6人)
	if (game.playerCount < MIN_PLAYERS) {
		return json({ message: `至少需要${MIN_PLAYERS}名玩家才能開始遊戲` }, { status: 400 });
	}

	// 更新遊戲狀態為選角階段
	await db
		.update(games)
		.set({
			status: 'selecting',
			updatedAt: new Date()
		})
		.where(eq(games.id, game.id));

	// 獲取更新後的遊戲狀態
	const gameState = await getGameState(game.id);

	// 通過 Socket.IO 廣播通知所有玩家
	const io = getSocketIO();

	if (io) {
		// 檢查房間內有多少連接
		try {
			await io.in(params.name!).fetchSockets();

			// 發送選角開始事件
			io.to(params.name!).emit('selection-started');

			// 發送房間更新事件（包含完整遊戲狀態）
			io.to(params.name!).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});
		} catch (error) {
			console.error(`[start-selection] 獲取房間連接或發送事件失敗:`, error);
		}
	} else {
		console.error(`[start-selection] ❌ Socket.IO 未初始化！無法發送事件`);
	}

	return json({
		message: '成功開始遊戲，進入選角階段',
		gameId: game.id,
		roomName: game.roomName,
		status: 'selecting',
		playerCount: game.playerCount
	});
};
