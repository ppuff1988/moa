import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAuthToken } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games, gamePlayers } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

	// Socket broadcasting will be handled when the player connects and emits 'join-room'
	// This ensures the new player is in the socket room to receive updates

	return json({
		message: '成功加入房間',
		roomName: game.roomName,
		gameId: game.id,
		player: {
			id: newPlayer.id,
			userId: user.id,
			nickname: user.nickname,
			isHost: false
		}
	});
};
