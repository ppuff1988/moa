import { and, asc, eq, inArray } from 'drizzle-orm';
import type { PublishedVotingResult } from '$lib/types/game';
import type { db } from './db';
import { gameArtifacts } from './db/schema';

type DatabaseExecutor = Pick<typeof db, 'select'>;

interface RankedVotingArtifact {
	id: number;
	animal: string;
	votes: number | null;
	voteRank: number | null;
	isGenuine: boolean;
}

export function buildPublishedVotingResult(
	round: number,
	rankedArtifacts: RankedVotingArtifact[]
): PublishedVotingResult | null {
	const firstPlace = rankedArtifacts.find((artifact) => artifact.voteRank === 1);
	const secondPlace = rankedArtifacts.find((artifact) => artifact.voteRank === 2);

	if (!firstPlace || !secondPlace) {
		return null;
	}

	return {
		round,
		firstPlace: {
			id: firstPlace.id,
			animal: firstPlace.animal,
			votes: firstPlace.votes ?? 0,
			rank: 1
		},
		secondPlace: {
			id: secondPlace.id,
			animal: secondPlace.animal,
			votes: secondPlace.votes ?? 0,
			rank: 2,
			isGenuine: secondPlace.isGenuine
		}
	};
}

/**
 * Read the persisted public voting result. Private identification results are
 * deliberately excluded: the published second-place truth always comes from
 * gameArtifacts.isGenuine.
 */
export async function getPublishedVotingResult(
	executor: DatabaseExecutor,
	gameId: string,
	round: number
): Promise<PublishedVotingResult | null> {
	const rankedArtifacts = await executor
		.select({
			id: gameArtifacts.id,
			animal: gameArtifacts.animal,
			votes: gameArtifacts.votes,
			voteRank: gameArtifacts.voteRank,
			isGenuine: gameArtifacts.isGenuine
		})
		.from(gameArtifacts)
		.where(
			and(
				eq(gameArtifacts.gameId, gameId),
				eq(gameArtifacts.round, round),
				inArray(gameArtifacts.voteRank, [1, 2])
			)
		)
		.orderBy(asc(gameArtifacts.voteRank));

	return buildPublishedVotingResult(round, rankedArtifacts);
}
