import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { COLOR_MAP, VALID_COLORS } from '$lib/server/constants';
import { db } from '$lib/server/db';
import { gamePlayers, roles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

	// 如果玩家已經鎖定，不能再次鎖定
	if (player.isReady) {
		return json({ message: '已經鎖定，請先取消鎖定' }, { status: 400 });
	}

	const body = await event.request.json();
	const { roleId, color } = body;

	// 驗證必須提供角色和顏色
	if (!roleId || !color) {
		return json({ message: '請選擇角色和顏色' }, { status: 400 });
	}

	// 驗證角色ID
	if (typeof roleId !== 'number' || roleId < 1) {
		return json({ message: '無效的角色ID' }, { status: 400 });
	}

	// 驗證角色是否存在於資料庫中
	const [roleExists] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);

	if (!roleExists) {
		return json({ message: '無效的角色ID' }, { status: 400 });
	}

	// 根據玩家人數驗證角色選擇
	const playerCount = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game.id));

	const totalPlayers = playerCount.length;

	// 6人局：不能選擇姬云浮和鄭國渠
	if (totalPlayers === 6) {
		if (roleExists.name === '姬云浮' || roleExists.name === '鄭國渠') {
			return json({ message: `6人局不能選擇${roleExists.name}` }, { status: 400 });
		}
	}

	// 7人局：不能選擇姬云浮
	if (totalPlayers === 7) {
		if (roleExists.name === '姬云浮') {
			return json({ message: '7人局不能選擇姬云浮' }, { status: 400 });
		}
	}

	// 驗證顏色
	if (!VALID_COLORS.includes(color)) {
		return json({ message: '無效的顏色' }, { status: 400 });
	}

	// 獲取顏色代碼
	const colorCode = COLOR_MAP[color];

	// 獲取所有其他已鎖定的玩家
	const otherPlayers = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.isReady, true)));

	// 檢查顏色是否與其他已鎖定的玩家重複
	const colorConflict = otherPlayers.find((p) => p.color === color && p.id !== player.id);
	if (colorConflict) {
		return json(
			{
				message: '此顏色已被其他玩家鎖定，請重新選擇',
				conflict: 'color',
				color
			},
			{ status: 409 }
		);
	}

	// 鎖定玩家的選擇
	await db
		.update(gamePlayers)
		.set({
			roleId,
			color,
			colorCode,
			isReady: true,
			lastActiveAt: new Date()
		})
		.where(eq(gamePlayers.id, player.id));

	// 獲取更新後的遊戲狀態
	const gameState = await getGameState(game.id);

	// 透過 Socket.IO 廣播給房間內的所有玩家
	const io = getSocketIO();
	if (io) {
		// 發送玩家鎖定事件
		io.to(game.roomName).emit('player-locked', {
			playerId: player.id,
			userId: player.userId,
			roleId,
			color,
			colorCode,
			isReady: true
		});

		// 發送房間更新事件（包含完整遊戲狀態）
		io.to(game.roomName).emit('room-update', {
			game: gameState.game,
			players: gameState.players
		});
	} else {
		console.error('[lock-role] Socket.IO 未初始化');
	}

	return json(
		{
			message: '鎖定成功',
			color,
			colorCode,
			isReady: true
		},
		{ status: 200 }
	);
};
