import { and, asc, eq, inArray } from 'drizzle-orm';
import type { PublishedVotingResult } from '$lib/types/game';
import type { db } from './db';
import {
	artifactVoteAllocations,
	gameArtifacts,
	gamePlayers,
	gameVoteSubmissions
} from './db/schema';
import { ZODIAC_ORDER } from './constants';

type DatabaseExecutor = Pick<typeof db, 'select'>;

interface RankedVotingArtifact {
	id: number;
	animal: string;
	votes: number | null;
	voteRank: number | null;
	isGenuine: boolean;
}

export interface VotingHistoryAllocation {
	artifactId: number;
	playerId: number;
	nickname: string;
	color: string | null;
	colorCode: string | null;
	chips: number;
}

export interface RoundVotingHistory extends PublishedVotingResult {
	artifacts: Array<{
		id: number;
		animal: string;
		votes: number;
		rank: number | null;
		colorBreakdown: Array<{
			playerId: number;
			nickname: string;
			color: string;
			colorCode: string;
			chips: number;
		}>;
	}>;
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

export function buildRoundVotingHistory(
	round: number,
	artifacts: RankedVotingArtifact[],
	allocations: VotingHistoryAllocation[]
): RoundVotingHistory | null {
	const baseResult = buildPublishedVotingResult(round, artifacts);
	if (!baseResult) return null;

	const sortedArtifacts = [...artifacts].sort(
		(a, b) => ZODIAC_ORDER.indexOf(a.animal) - ZODIAC_ORDER.indexOf(b.animal)
	);

	return {
		...baseResult,
		artifacts: sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			animal: artifact.animal,
			votes: artifact.votes ?? 0,
			rank: artifact.voteRank,
			colorBreakdown: allocations
				.filter((allocation) => allocation.artifactId === artifact.id)
				.sort((a, b) => a.playerId - b.playerId)
				.map((allocation) => ({
					playerId: allocation.playerId,
					nickname: allocation.nickname,
					color: allocation.color ?? '未設定',
					colorCode: allocation.colorCode ?? '#6B7280',
					chips: allocation.chips
				}))
		}))
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

export async function getPublishedOnlineVotingResult(
	executor: DatabaseExecutor,
	gameId: string,
	round: number,
	roundId: number
): Promise<PublishedVotingResult | null> {
	const artifacts = await executor
		.select({
			id: gameArtifacts.id,
			animal: gameArtifacts.animal,
			votes: gameArtifacts.votes,
			voteRank: gameArtifacts.voteRank,
			isGenuine: gameArtifacts.isGenuine
		})
		.from(gameArtifacts)
		.where(and(eq(gameArtifacts.gameId, gameId), eq(gameArtifacts.round, round)));
	const allocations = await executor
		.select({
			artifactId: artifactVoteAllocations.artifactId,
			playerId: gamePlayers.id,
			color: gamePlayers.color,
			colorCode: gamePlayers.colorCode,
			chips: artifactVoteAllocations.chipCount
		})
		.from(artifactVoteAllocations)
		.innerJoin(
			gameVoteSubmissions,
			eq(artifactVoteAllocations.submissionId, gameVoteSubmissions.id)
		)
		.innerJoin(gamePlayers, eq(gameVoteSubmissions.playerId, gamePlayers.id))
		.where(eq(gameVoteSubmissions.roundId, roundId))
		.orderBy(asc(gamePlayers.id), asc(artifactVoteAllocations.artifactId));

	const baseResult = buildPublishedVotingResult(round, artifacts);
	if (!baseResult) return null;

	const sortedArtifacts = [...artifacts].sort(
		(a, b) => ZODIAC_ORDER.indexOf(a.animal) - ZODIAC_ORDER.indexOf(b.animal)
	);
	return {
		...baseResult,
		artifacts: sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			animal: artifact.animal,
			votes: artifact.votes ?? 0,
			rank: artifact.voteRank,
			colorBreakdown: allocations
				.filter((allocation) => allocation.artifactId === artifact.id)
				.map((allocation) => ({
					color: allocation.color ?? '未設定',
					colorCode: allocation.colorCode ?? '#6B7280',
					chips: allocation.chips
				}))
		}))
	};
}
