import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runAllPlayersOnlineTransaction, verifyHostInRoom } from '$lib/server/api-helpers';
import { gameRounds } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyHostInRoom(request, params.name!);
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game } = verifyResult;
		const result = await runAllPlayersOnlineTransaction(game.id, async (transaction) => {
			const [currentRound] = await transaction
				.select()
				.from(gameRounds)
				.where(eq(gameRounds.gameId, game.id))
				.orderBy(desc(gameRounds.round))
				.limit(1)
				.for('update');

			if (!currentRound) {
				return {
					outcome: 'error' as const,
					response: json({ success: false, message: '當前沒有進行中的回合' }, { status: 400 })
				};
			}

			await transaction
				.update(gameRounds)
				.set({ phase: 'voting' })
				.where(eq(gameRounds.id, currentRound.id));
			return { outcome: 'success' as const, roundId: currentRound.id };
		});
		if ('error' in result) return result.error;
		if (result.data.outcome === 'error') return result.data.response;

		return json({
			success: true,
			message: '投票階段已開始',
			roundId: result.data.roundId
		});
	} catch (error) {
		console.error('開始投票時發生錯誤:', error);
		const message = error instanceof Error ? error.message : '開始投票失敗';
		return json({ message }, { status: 400 });
	}
};
