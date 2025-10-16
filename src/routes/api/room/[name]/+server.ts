import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { user: currentUser, game, player: playerInRoom } = verifyResult;

	// 獲取房間所有玩家資訊
	const players = await db
		.select({
			id: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			isHost: gamePlayers.isHost,
			isOnline: gamePlayers.isOnline,
			isReady: gamePlayers.isReady,
			roleId: gamePlayers.roleId,
			color: gamePlayers.color,
			joinedAt: gamePlayers.joinedAt
		})
		.from(gamePlayers)
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.where(eq(gamePlayers.gameId, game.id));

	return json({
		game: {
			id: game.id,
			roomName: game.roomName,
			hostId: game.hostId,
			status: game.status,
			playerCount: game.playerCount,
			totalScore: game.totalScore,
			createdAt: game.createdAt,
			updatedAt: game.updatedAt
		},
		players,
		currentPlayer: {
			id: playerInRoom.id,
			userId: currentUser.id,
			nickname: currentUser.nickname,
			isHost: playerInRoom.isHost
		}
	});
};
