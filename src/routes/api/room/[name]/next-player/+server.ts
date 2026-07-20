import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { restoreCanActionIfNeeded, runCurrentActionTransaction } from '$lib/server/api-helpers';
import { gameRounds, gamePlayers } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	const body = await request.json();
	const { nextPlayerId } = body;

	if (!nextPlayerId || typeof nextPlayerId !== 'number') {
		return json({ error: '必須指定下一位玩家' }, { status: 400 });
	}

	const guardResult = await runCurrentActionTransaction<
		{ error: Response } | { nextPlayerId: number }
	>(request, params.name!, async ({ transaction, game, player, role, currentRound }) => {
		const [selectedPlayer] = await transaction
			.select()
			.from(gamePlayers)
			.where(
				and(
					eq(gamePlayers.gameId, game.id),
					eq(gamePlayers.id, nextPlayerId),
					isNull(gamePlayers.leftAt)
				)
			)
			.limit(1);

		if (!selectedPlayer) {
			return { error: json({ error: '指定的玩家不在遊戲中' }, { status: 400 }) };
		}

		const currentActionOrder = Array.isArray(currentRound.actionOrder)
			? (currentRound.actionOrder as number[])
			: [];
		if (currentActionOrder.some((playerId) => Number(playerId) === nextPlayerId)) {
			return { error: json({ error: '指定的玩家本回合已行動' }, { status: 409 }) };
		}

		if (player.canAction === false && player.attackedRounds) {
			const attackedRounds = player.attackedRounds as number[];
			if (
				attackedRounds.includes(currentRound.round) ||
				attackedRounds.some((round) => round < currentRound.round)
			) {
				await transaction
					.update(gamePlayers)
					.set({ canAction: true })
					.where(eq(gamePlayers.id, player.id));
			}
		}

		await restoreCanActionIfNeeded(
			player.id,
			player.blockedRound,
			player.attackedRounds as number[] | null,
			currentRound.round,
			currentRound.id,
			role.skill as Record<string, number> | null,
			transaction
		);

		await transaction
			.update(gameRounds)
			.set({ actionOrder: [nextPlayerId, ...currentActionOrder] })
			.where(eq(gameRounds.id, currentRound.id));

		return { nextPlayerId };
	});

	if ('error' in guardResult) return guardResult.error;
	if ('error' in guardResult.data) return guardResult.data.error;

	try {
		const { getSocketIO } = await import('$lib/server/socket');
		const io = getSocketIO();
		if (io) {
			io.to(params.name!).emit('player-assigned', {
				nextPlayerId: guardResult.data.nextPlayerId,
				roomName: params.name!
			});
		}
	} catch (socketError) {
		console.error('發送 socket 事件失敗:', socketError);
	}

	return json({
		success: true,
		nextPlayerId: guardResult.data.nextPlayerId,
		phaseChanged: false,
		newPhase: null
	});
};
