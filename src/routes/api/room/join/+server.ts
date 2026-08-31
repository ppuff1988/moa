import { verifyAuthToken } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games } from '$lib/server/db/schema';
import { getGameState, joinGame } from '$lib/server/game';
import { getSocketIO } from '$lib/server/socket';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const JOIN_GAME_ERRORS = new Set([
	'遊戲不存在',
	'遊戲已開始，無法加入',
	'房間已滿',
	'玩家已在遊戲中',
	'用戶不存在'
]);

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

	let newPlayer;
	try {
		newPlayer = await joinGame(game.id, user.id);
	} catch (error) {
		if (error instanceof Error && JOIN_GAME_ERRORS.has(error.message)) {
			const message = error.message === '玩家已在遊戲中' ? '您已經在房間中' : error.message;
			return json({ message }, { status: 400 });
		}
		throw error;
	}

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
			userId: newPlayer.userId,
			nickname: newPlayer.nickname,
			avatar: newPlayer.avatar,
			isHost: newPlayer.isHost
		}
	});
};
