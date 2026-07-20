import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyHostWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts, gameRounds } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { ZODIAC_ORDER } from '$lib/server/constants';
import { emitToRoom } from '$lib/server/socket';
import { getPublishedVotingResult } from '$lib/server/game-voting';

class VotingSubmissionError extends Error {
	constructor(
		message: string,
		readonly status: number = 400
	) {
		super(message);
	}
}

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyHostWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game } = verifyResult;
		const body = await request.json();
		const votes = body.votes as Record<string, unknown> | undefined;

		if (!votes || typeof votes !== 'object' || Array.isArray(votes)) {
			return json({ message: '投票資料格式錯誤' }, { status: 400 });
		}

		const votingResult = await db.transaction(async (tx) => {
			// Serialize submissions for this game. A second request observes the
			// committed result phase and cannot overwrite the first result.
			const [currentRound] = await tx
				.select()
				.from(gameRounds)
				.where(eq(gameRounds.gameId, game.id))
				.orderBy(desc(gameRounds.round))
				.limit(1)
				.for('update');

			if (!currentRound || currentRound.phase !== 'voting') {
				throw new VotingSubmissionError('找不到當前投票回合', 409);
			}

			const artifacts = await tx
				.select()
				.from(gameArtifacts)
				.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, currentRound.round)));

			if (artifacts.length < 2) {
				throw new VotingSubmissionError('當前回合獸首資料不完整');
			}

			const votedArtifacts = artifacts.map((artifact) => {
				const rawVote = votes[artifact.id.toString()] ?? 0;
				if (typeof rawVote !== 'number' || !Number.isInteger(rawVote) || rawVote < 0) {
					throw new VotingSubmissionError('票數必須是非負整數');
				}

				return {
					id: artifact.id,
					animal: artifact.animal,
					votes: rawVote
				};
			});

			if (!votedArtifacts.some((artifact) => artifact.votes > 0)) {
				throw new VotingSubmissionError('請至少為一個獸首分配投票數');
			}

			votedArtifacts.sort((a, b) => {
				if (b.votes !== a.votes) return b.votes - a.votes;
				return ZODIAC_ORDER.indexOf(a.animal) - ZODIAC_ORDER.indexOf(b.animal);
			});

			for (let index = 0; index < votedArtifacts.length; index++) {
				const artifact = votedArtifacts[index];
				await tx
					.update(gameArtifacts)
					.set({
						votes: artifact.votes,
						voteRank: index < 2 ? index + 1 : null
					})
					.where(eq(gameArtifacts.id, artifact.id));
			}

			await tx
				.update(gameRounds)
				.set({ phase: 'result' })
				.where(eq(gameRounds.id, currentRound.id));

			const result = await getPublishedVotingResult(tx, game.id, currentRound.round);
			if (!result) {
				throw new VotingSubmissionError('投票結果資料不完整', 500);
			}

			return result;
		});

		const eventData = { phase: 'result', votingResult } as const;
		await emitToRoom(params.name!, 'voting-completed', eventData);

		return json({
			success: true,
			message: '投票提交成功',
			votingResult
		});
	} catch (error) {
		if (error instanceof VotingSubmissionError) {
			return json({ message: error.message }, { status: error.status });
		}

		console.error('[submit-votes] 錯誤:', error);
		return json({ message: '投票提交失敗' }, { status: 500 });
	}
};
