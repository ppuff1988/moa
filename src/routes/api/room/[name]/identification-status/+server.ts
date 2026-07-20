import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, identificationVotes } from '$lib/server/db/schema';
import { getPlayersWithRoles } from '$lib/server/game-identification-helpers';
import { getIdentificationVotingState } from '$lib/server/identification-voting';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;

		// 檢查當前是否在鑑人階段
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'identification') {
			return json({ message: '當前不在鑑人階段' }, { status: 400 });
		}

		const playersWithRoles = await getPlayersWithRoles(game.id);
		const allVotes = await db
			.select()
			.from(identificationVotes)
			.where(eq(identificationVotes.gameId, game.id));
		const votingState = getIdentificationVotingState(playersWithRoles, allVotes);
		const hasVoted = votingState.validVotes.some((vote) => vote.playerId === player.id);

		return json({
			votedCount: votingState.votedCount,
			totalEligibleVoters: votingState.totalEligibleVoters,
			hasVoted,
			allVoted: votingState.allVoted
		});
	} catch (error) {
		console.error('獲取投票狀態錯誤:', error);
		return json({ message: '獲取狀態失敗' }, { status: 500 });
	}
};
