import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runAllPlayersOnlineTransaction, verifyHostInRoom } from '$lib/server/api-helpers';
import { completeVotingPhase } from '$lib/server/game';
import { getSocketIO } from '$lib/server/socket';

// 完成投票階段，自動進入下一回合或結束遊戲
export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyHostInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 解析請求體以獲取當前回合數
	const body = await request.json();
	const { round } = body;

	if (!round || typeof round !== 'number') {
		return json(
			{
				error: '缺少回合數或回合數格式錯誤'
			},
			{ status: 400 }
		);
	}

	try {
		const transactionResult = await runAllPlayersOnlineTransaction(game.id, (transaction) =>
			completeVotingPhase(game.id, round, transaction)
		);
		if ('error' in transactionResult) return transactionResult.error;
		const result = transactionResult.data;

		if (result.nextRound) {
			try {
				getSocketIO()?.to(game.roomName).emit('round-started', {
					gameId: game.id,
					roundId: result.nextRound.roundId,
					round: result.nextRound.round,
					phase: 'action',
					firstPlayerId: result.nextRound.firstPlayerId,
					roomName: game.roomName
				});
			} catch (error) {
				console.error('發送 Socket 事件失敗:', error);
			}
		}

		return json({
			success: true,
			roundCompleted: result.roundCompleted,
			isGameFinished: result.isGameFinished,
			nextRound: result.nextRound,
			message: result.isGameFinished
				? '遊戲結束！'
				: result.nextRound
					? `第 ${result.nextRound.round} 回合已自動開始`
					: '投票階段已完成'
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : '完成投票階段時發生錯誤'
			},
			{ status: 500 }
		);
	}
};
