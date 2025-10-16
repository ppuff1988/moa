import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { getGameState } from '$lib/server/game';

export const POST: RequestHandler = async (event) => {
	// 驗證用戶、房間和玩家信息，並確保遊戲在選角階段
	const verifyResult = await verifyPlayerInRoomWithStatus(
		event.request,
		event.params.name!,
		'selecting'
	);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	// 如果玩家沒有鎖定，不能取消鎖定
	if (!player.isReady) {
		return json({ message: '尚未鎖定，無需取消' }, { status: 400 });
	}

	// 取消鎖定玩家的選擇
	await db
		.update(gamePlayers)
		.set({
			roleId: null, // 清除角色選擇
			color: null, // 清除顏色選擇
			colorCode: null, // 清除顏色代碼
			isReady: false,
			lastActiveAt: new Date()
		})
		.where(eq(gamePlayers.id, player.id));

	// 獲取更新後的遊戲狀態
	const gameState = await getGameState(game.id);

	// 透過 Socket.IO 廣播給房間內的所有玩家
	const io = getSocketIO();
	if (io) {
		// 發送玩家解鎖事件
		io.to(game.roomName).emit('player-unlocked', {
			playerId: player.id,
			userId: player.userId,
			isReady: false
		});

		// 發送房間更新事件（包含完整遊戲狀態）
		io.to(game.roomName).emit('room-update', {
			game: gameState.game,
			players: gameState.players
		});
	} else {
		console.error('[unlock-role] Socket.IO 未初始化');
	}

	return json(
		{
			message: '取消鎖定成功',
			isReady: false
		},
		{ status: 200 }
	);
};
