import { verifyAuthToken } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, games } from '$lib/server/db/schema';
import { getGameState } from '$lib/server/game';
import { getSocketIO } from '$lib/server/socket';
import { json } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult.error;
	}
	const { user } = authResult;

	let requestBody;
	try {
		requestBody = await request.json();
	} catch {
		return json({ message: '無效的 JSON 格式' }, { status: 400 });
	}

	const { roomName, password } = requestBody;

	// 驗證輸入
	if (!roomName || !password) {
		return json({ message: '請填寫房間名稱和密碼' }, { status: 400 });
	}

	// 查找房間
	const [game] = await db.select().from(games).where(eq(games.roomName, roomName.trim())).limit(1);

	if (!game) {
		return json({ message: '房間不存在' }, { status: 404 });
	}

	// 驗證房間密碼
	if (game.roomPassword !== password) {
		return json({ message: '房間密碼錯誤' }, { status: 401 });
	}

	// 檢查遊戲狀態
	if (game.status !== 'waiting') {
		return json({ message: '遊戲已開始，無法加入' }, { status: 400 });
	}

	// 檢查房間是否已滿
	if (game.playerCount >= 8) {
		return json({ message: '房間已滿' }, { status: 400 });
	}

	// 檢查玩家是否已在房間中
	const [existingPlayer] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, user.id)))
		.limit(1);

	if (existingPlayer) {
		return json({ message: '您已經在房間中' }, { status: 400 });
	}

	// 加入房間 - 使用 try-catch 處理並發情況下的重複鍵錯誤
	let newPlayer;
	try {
		[newPlayer] = await db
			.insert(gamePlayers)
			.values({
				gameId: game.id,
				userId: user.id,
				isHost: false
			})
			.returning();
	} catch (error) {
		// 處理重複鍵錯誤（並發情況下可能發生）
		if (error instanceof Error && error.message.includes('duplicate key')) {
			return json({ message: '您已經在房間中' }, { status: 400 });
		}
		// 其他錯誤則拋出
		throw error;
	}

	// 使用 SQL 的原子遞增操作來避免並發情況下的玩家計數錯誤
	await db
		.update(games)
		.set({
			playerCount: sql`${games.playerCount} + 1`,
			updatedAt: new Date()
		})
		.where(eq(games.id, game.id));

	// 立即通過 Socket.IO 廣播房間更新，確保已在房間的玩家能即時看到新玩家加入
	// 注意：只廣播 room-update（更新玩家列表），不廣播 player-joined（避免重複通知）
	// player-joined 會在玩家 socket 連接時由 socket.ts 的 join-room 事件觸發
	try {
		const io = getSocketIO();
		if (io) {
			// 獲取最新的遊戲狀態
			const gameState = await getGameState(game.id);

			// 向房間內所有已連接的玩家廣播更新（靜默更新，不顯示通知）
			io.to(game.roomName).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});
		} else {
			console.warn('[join-room] Socket.IO 實例不存在，無法即時廣播房間更新');
		}
	} catch (error) {
		console.error('[join-room] 廣播房間更新失敗:', error);
		// 不影響加入房間的結果，繼續返回成功
	}

	return json({
		message: '成功加入房間',
		roomName: game.roomName,
		gameId: game.id,
		player: {
			id: newPlayer.id,
			userId: user.id,
			nickname: user.nickname,
			avatar: user.avatar,
			isHost: false
		}
	});
};
