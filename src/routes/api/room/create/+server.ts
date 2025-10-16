import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGame, joinGame, generateUniqueRoomName } from '$lib/server/game';
import { verifyAuthToken } from '$lib/server/api-helpers';

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

	const { password } = requestBody;

	// 驗證密碼輸入
	if (!password) {
		return json({ message: '請填寫房間密碼' }, { status: 400 });
	}

	if (typeof password !== 'string' || password.trim().length < 3) {
		return json({ message: '密碼長度最少需要 3 個字元' }, { status: 400 });
	}

	// 創建遊戲
	try {
		// 自動生成唯一的5碼數字房間名稱
		const roomName = await generateUniqueRoomName();
		const game = await createGame(roomName, password, user.id);

		// 房主自動加入遊戲
		const player = await joinGame(game.id, user.id, true);

		return json(
			{
				message: '創建房間成功',
				gameId: game.id,
				roomName: game.roomName,
				player
			},
			{ status: 201 }
		);
	} catch (error) {
		// 處理錯誤
		if (error instanceof Error) {
			return json({ message: error.message }, { status: 400 });
		}
		throw error;
	}
};
