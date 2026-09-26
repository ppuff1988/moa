import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { gamePlayers, games, user } from './db/schema';

export async function leaveRoom(gameId: string, userId: number) {
	return db.transaction(async (tx) => {
		// Match join/start/settlement lock order so the last departure is atomic.
		const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for('update');
		if (!game) error(404, '房間不存在');
		const players = await tx
			.select()
			.from(gamePlayers)
			.where(eq(gamePlayers.gameId, gameId))
			.for('update');
		const player = players.find((p) => p.userId === userId);
		if (!player) error(403, '您不在此房間中');
		const result = {
			status: game.status,
			endedReason: '',
			newHost: null as { userId: number; nickname: string } | null
		};
		if (player.roomPresence === 'left' || player.leftAt) return result;

		const now = new Date();
		const departure = {
			isOnline: false,
			roomPresence: 'left' as const,
			leftAt: now,
			lastActiveAt: now
		};
		await tx.update(gamePlayers).set(departure).where(eq(gamePlayers.id, player.id));

		if (game.status === 'finished' || game.status === 'terminated') return result;
		const remaining = players.filter(
			(p) => p.id !== player.id && p.roomPresence === 'active' && p.leftAt === null
		);
		const inLobby = game.status === 'waiting' || game.status === 'selecting';
		const insufficientSelection = game.status === 'selecting' && remaining.length < 6;
		if (remaining.length === 0 || insufficientSelection) {
			if (insufficientSelection) {
				await tx
					.update(gamePlayers)
					.set(departure)
					.where(
						and(
							eq(gamePlayers.gameId, gameId),
							eq(gamePlayers.roomPresence, 'active'),
							isNull(gamePlayers.leftAt)
						)
					);
			}
			await tx
				.update(games)
				.set({
					status: 'terminated',
					finishedAt: now,
					updatedAt: now,
					...(inLobby ? { playerCount: 0 } : {})
				})
				.where(eq(games.id, gameId));
			return {
				...result,
				status: 'terminated',
				endedReason:
					remaining.length === 0 ? '所有玩家已離開房間，遊戲已終止' : '由於人數不足，遊戲已強制結束'
			};
		}

		if (inLobby) {
			await tx.delete(gamePlayers).where(eq(gamePlayers.id, player.id));
			if (game.status === 'selecting') {
				await tx.update(gamePlayers).set({ isReady: false }).where(eq(gamePlayers.gameId, gameId));
			}
			if (game.hostId === userId) {
				const newHost = remaining[0];
				const [hostUser] = await tx.select().from(user).where(eq(user.id, newHost.userId));
				await tx.update(gamePlayers).set({ isHost: true }).where(eq(gamePlayers.id, newHost.id));
				result.newHost = { userId: newHost.userId, nickname: hostUser.nickname };
			}
			await tx
				.update(games)
				.set({
					playerCount: remaining.length,
					hostId: result.newHost?.userId ?? game.hostId,
					updatedAt: now
				})
				.where(eq(games.id, gameId));
		}
		return result;
	});
}
