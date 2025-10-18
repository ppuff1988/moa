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

	console.log(`[start-selection] 房間 ${params.name} 準備開始選角階段`, {
		gameId: game.id,
		playerCount: game.playerCount,
		currentStatus: game.status
	});

	// 更新遊戲狀態為選角階段
	await db
		.update(games)
		.set({
			status: 'selecting',
			updatedAt: new Date()
		})
		.where(eq(games.id, game.id));

	console.log(`[start-selection] 已更新遊戲狀態為 selecting`);

	// 獲取更新後的遊戲狀態
	const gameState = await getGameState(game.id);

	console.log(`[start-selection] 獲取遊戲狀態完成`, {
		status: gameState.game.status,
		playerCount: gameState.players.length
	});

	// 通過 Socket.IO 廣播通知所有玩家
	const io = getSocketIO();

	console.log(`[start-selection] Socket.IO 實例狀態:`, {
		isInitialized: !!io,
		roomName: params.name
	});

	if (io) {
		// 檢查房間內有多少連接
		try {
			const roomSockets = await io.in(params.name!).fetchSockets();
			console.log(`[start-selection] 房間 ${params.name} 內有 ${roomSockets.length} 個連接`);

			// 發送選角開始事件
			io.to(params.name!).emit('selection-started');
			console.log(`[start-selection] ✅ 已發送 selection-started 事件到房間 ${params.name}`);

			// 發送房間更新事件（包含完整遊戲狀態）
			io.to(params.name!).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});
			console.log(`[start-selection] ✅ 已發送 room-update 事件到房間 ${params.name}`);
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
