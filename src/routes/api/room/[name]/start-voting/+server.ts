import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyHostInRoom, getCurrentRoundOrError } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyHostInRoom(request, params.name!);
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game } = verifyResult;

		// 獲取當前回合
		const roundResult = await getCurrentRoundOrError(game.id);
		if ('error' in roundResult) {
			return roundResult.error;
		}
		const currentRound = roundResult.round;

		// 更新回合階段為投票
		await db.update(gameRounds).set({ phase: 'voting' }).where(eq(gameRounds.id, currentRound.id));

		return json({
			success: true,
			message: '投票階段已開始',
			roundId: currentRound.id
		});
	} catch (error) {
		console.error('開始投票時發生錯誤:', error);
		const message = error instanceof Error ? error.message : '開始投票失敗';
		return json({ message }, { status: 400 });
	}
};
