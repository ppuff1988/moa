import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom, getCurrentRoundOrError } from '$lib/server/api-helpers';

// 獲取當前回合狀態
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	try {
		// 檢查遊戲是否已結束
		if (game.status === 'finished') {
			return json({
				success: true,
				phase: 'finished',
				round: 3,
				isHost: player.isHost,
				gameStatus: 'finished'
			});
		}

		// 檢查遊戲是否尚未開始（waiting 或 selecting 階段）
		if (game.status === 'waiting' || game.status === 'selecting') {
			return json(
				{
					message: '遊戲尚未開始回合'
				},
				{ status: 404 }
			);
		}

		// 獲取當前回合
		const roundResult = await getCurrentRoundOrError(game.id);
		if ('error' in roundResult) {
			return roundResult.error;
		}
		const currentRound = roundResult.round;

		return json({
			success: true,
			phase: currentRound.phase,
			round: currentRound.round,
			isHost: player.isHost,
			gameStatus: game.status
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : '獲取回合狀態時發生錯誤'
			},
			{ status: 500 }
		);
	}
};
