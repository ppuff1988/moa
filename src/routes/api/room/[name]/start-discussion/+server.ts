import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { restoreCanActionIfNeeded, runCurrentActionTransaction } from '$lib/server/api-helpers';
import { gameRounds, gamePlayers } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	const guardResult = await runCurrentActionTransaction<{ error: Response } | { roundId: number }>(
		request,
		params.name!,
		async ({ transaction, game, player, role, currentRound }) => {
			const activePlayers = await transaction
				.select({ id: gamePlayers.id })
				.from(gamePlayers)
				.where(and(eq(gamePlayers.gameId, game.id), isNull(gamePlayers.leftAt)));
			const actionOrder = Array.isArray(currentRound.actionOrder)
				? (currentRound.actionOrder as number[])
				: [];
			const actedPlayerIds = new Set(actionOrder.map(Number));

			if (!activePlayers.every((activePlayer) => actedPlayerIds.has(activePlayer.id))) {
				return {
					error: json({ message: '仍有玩家尚未完成行動' }, { status: 409 })
				};
			}

			if (player.canAction === false && player.attackedRounds) {
				const attackedRounds = player.attackedRounds as number[];
				if (attackedRounds.includes(currentRound.round)) {
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
				.set({ phase: 'discussion' })
				.where(eq(gameRounds.id, currentRound.id));

			return { roundId: currentRound.id };
		}
	);

	if ('error' in guardResult) return guardResult.error;
	if ('error' in guardResult.data) return guardResult.data.error;

	return json({
		success: true,
		message: '已進入討論階段',
		roundId: guardResult.data.roundId
	});
};
