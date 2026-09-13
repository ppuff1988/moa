import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds } from '$lib/server/db/schema';
import { finalizeOnlineVotingIfComplete } from '$lib/server/game-voting';
import { emitToRoom } from '$lib/server/socket';
import { json } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * 全員重連後恢復不需要額外玩家輸入的流程。目前只有線上投票可能在
 * 所有人已提交後因離線暫停，因此這個端點在回合鎖內做冪等結算。
 */
export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) return verifyResult.error;

	const { game } = verifyResult;
	if (game.status !== 'playing' || !game.onlineVotingEnabled) {
		return json({ resumed: false, completed: false });
	}

	const finalization = await db.transaction(async (tx) => {
		const [currentRound] = await tx
			.select()
			.from(gameRounds)
			.where(eq(gameRounds.gameId, game.id))
			.orderBy(desc(gameRounds.round))
			.limit(1)
			.for('update');

		if (!currentRound || currentRound.phase !== 'voting') return null;
		return finalizeOnlineVotingIfComplete(tx, game.id, currentRound);
	});

	if (!finalization?.completed) {
		return json({ resumed: false, completed: false });
	}

	await emitToRoom(game.roomName, 'voting-completed', {
		phase: 'result',
		votingResult: finalization.votingResult
	});

	return json({
		resumed: true,
		completed: true,
		votingResult: finalization.votingResult
	});
};
