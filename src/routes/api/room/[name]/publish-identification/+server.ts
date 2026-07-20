import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runIdentificationTransaction } from '$lib/server/api-helpers';
import { gameArtifacts, gameRounds, games, identificationVotes } from '$lib/server/db/schema';
import {
	calculateIdentificationResultsFromVotes,
	calculateIdentificationScore,
	determineWinner,
	getPlayersWithRoles
} from '$lib/server/game-identification-helpers';
import { getIdentificationVotingState } from '$lib/server/identification-voting';
import { emitToRoom } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

type PublishIdentificationResult =
	| { ok: false; error: Response }
	| {
			ok: true;
			winner: string;
			xuYuanScore: number;
			identificationResults: ReturnType<typeof calculateIdentificationResultsFromVotes>;
			finalResult: Record<string, unknown>;
	  };

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const result = await runIdentificationTransaction<PublishIdentificationResult>(
			request,
			params.name!,
			async ({ transaction, game, player, currentRound }) => {
				if (!player.isHost) {
					return {
						ok: false,
						error: json({ message: '只有房主可以公布結果' }, { status: 403 })
					};
				}

				const playersWithRoles = await getPlayersWithRoles(game.id, transaction);
				const allVotes = await transaction
					.select()
					.from(identificationVotes)
					.where(eq(identificationVotes.gameId, game.id));
				const votingState = getIdentificationVotingState(playersWithRoles, allVotes);

				if (!votingState.allVoted) {
					return {
						ok: false,
						error: json(
							{
								message: '尚有合資格玩家未完成投票',
								votedCount: votingState.votedCount,
								totalEligibleVoters: votingState.totalEligibleVoters
							},
							{ status: 409 }
						)
					};
				}

				const identificationResults = calculateIdentificationResultsFromVotes(
					playersWithRoles,
					votingState.validVotes
				);
				const hasYaoburan = playersWithRoles.some((candidate) => candidate.roleName === '藥不然');
				const xuYuanScore =
					(game.totalScore || 0) + calculateIdentificationScore(identificationResults, hasYaoburan);
				const winner = determineWinner(xuYuanScore);
				const finishedAt = new Date();

				await transaction
					.update(games)
					.set({ status: 'finished', totalScore: xuYuanScore, finishedAt })
					.where(eq(games.id, game.id));
				await transaction
					.update(gameRounds)
					.set({ phase: 'completed', completedAt: finishedAt })
					.where(eq(gameRounds.id, currentRound.id));

				const allArtifacts = await transaction
					.select()
					.from(gameArtifacts)
					.where(eq(gameArtifacts.gameId, game.id));
				const selectedArtifacts = allArtifacts.filter(
					(artifact) => artifact.voteRank === 1 || artifact.voteRank === 2
				);

				return {
					ok: true,
					winner,
					xuYuanScore,
					identificationResults,
					finalResult: {
						winner,
						xuYuanScore,
						allArtifacts: selectedArtifacts.map((artifact) => ({
							id: artifact.id,
							round: artifact.round,
							animal: artifact.animal,
							isGenuine: artifact.isGenuine,
							voteRank: artifact.voteRank,
							votes: artifact.votes
						})),
						players: playersWithRoles.map((candidate) => ({
							id: candidate.playerId,
							nickname: candidate.nickname,
							roleName: candidate.roleName,
							camp: candidate.camp,
							colorCode: candidate.colorCode
						})),
						identificationResults
					}
				};
			}
		);

		if ('error' in result) return result.error;
		if (!result.data.ok) return result.data.error;

		await emitToRoom(params.name!, 'game-finished', result.data.finalResult);

		return json({
			message: `遊戲結束，${result.data.winner}獲勝！`,
			winner: result.data.winner,
			xuYuanScore: result.data.xuYuanScore,
			identificationResults: result.data.identificationResults
		});
	} catch (error) {
		console.error('公布鑑人結果錯誤:', error);
		return json({ message: '公布結果失敗' }, { status: 500 });
	}
};
