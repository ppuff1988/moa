import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { games, gamePlayers } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: '未授權' }, { status: 401 });
	}

	try {
		// 查詢玩家當前是否在遊戲中（未離開的遊戲）
		const [currentGame] = await db
			.select({
				gameId: games.id,
				roomName: games.roomName,
				status: games.status,
				playerCount: games.playerCount
			})
			.from(gamePlayers)
			.innerJoin(games, eq(gamePlayers.gameId, games.id))
			.where(
				and(
					eq(gamePlayers.userId, locals.user.id),
					isNull(gamePlayers.leftAt) // 只查詢未離開的遊戲
				)
			)
			.limit(1);

		if (!currentGame) {
			return json({ hasGame: false }, { status: 200 });
		}

		return json(
			{
				hasGame: true,
				game: {
					id: currentGame.gameId,
					roomName: currentGame.roomName,
					status: currentGame.status,
					playerCount: currentGame.playerCount
				}
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('獲取當前遊戲失敗:', error);
		return json({ message: '獲取遊戲資料失敗' }, { status: 500 });
	}
};
