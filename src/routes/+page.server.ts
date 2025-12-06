import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, gamePlayers } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// 未登入用戶可以看到首頁（SEO 友好）
	if (!locals.user) {
		return {
			user: null,
			currentGame: null
		};
	}

	// 查詢用戶當前是否在遊戲中
	let currentGame = null;
	try {
		const [gameData] = await db
			.select({
				gameId: games.id,
				roomName: games.roomName,
				status: games.status,
				playerCount: games.playerCount
			})
			.from(gamePlayers)
			.innerJoin(games, eq(gamePlayers.gameId, games.id))
			.where(and(eq(gamePlayers.userId, locals.user.id), isNull(gamePlayers.leftAt)))
			.limit(1);

		if (gameData) {
			currentGame = {
				id: gameData.gameId,
				roomName: gameData.roomName,
				status: gameData.status,
				playerCount: gameData.playerCount
			};
		}
	} catch (error) {
		console.error('[首頁載入] 查詢當前遊戲失敗:', error);
	}

	return {
		user: {
			id: locals.user.id,
			nickname: locals.user.nickname,
			email: locals.user.email,
			avatar: locals.user.avatar
		},
		currentGame
	};
};
