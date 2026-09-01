import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { PublishedVotingResult } from '$lib/types/game';
import type { db } from './db';
import {
	artifactVoteAllocations,
	gameArtifacts,
	gamePlayers,
	gameRounds,
	gameVoteSubmissions
} from './db/schema';
import { ZODIAC_ORDER } from './constants';

type DatabaseExecutor = Pick<typeof db, 'select'>;
type VotingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SubmittedVotingPlayer {
	playerId: number;
	color: string | null;
	colorCode: string | null;
}

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

export async function getSubmittedOnlineVotingPlayers(
	executor: DatabaseExecutor,
	roundId: number
): Promise<SubmittedVotingPlayer[]> {
	return executor
		.select({
			playerId: gamePlayers.id,
			color: gamePlayers.color,
			colorCode: gamePlayers.colorCode
		})
		.from(gameVoteSubmissions)
		.innerJoin(gamePlayers, eq(gameVoteSubmissions.playerId, gamePlayers.id))
		.where(eq(gameVoteSubmissions.roundId, roundId))
		.orderBy(gamePlayers.id);
}

/**
 * 在呼叫端已鎖定回合列的 transaction 內重新計算投票門檻並完成結算。
 * 暫時斷線玩家仍是 active；只有 leftAt 不為空的主動離房玩家退出待提交名單。
 */
export async function finalizeOnlineVotingIfComplete(
	executor: VotingTransaction,
	gameId: string,
	currentRound: { id: number; round: number }
) {
	const submittedPlayers = await getSubmittedOnlineVotingPlayers(executor, currentRound.id);
	const activePlayers = await executor
		.select({ id: gamePlayers.id })
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, gameId), isNull(gamePlayers.leftAt)));
	const submittedPlayerIds = new Set(
		submittedPlayers.map((submittedPlayer) => submittedPlayer.playerId)
	);
	const completed = activePlayers.every((activePlayer) => submittedPlayerIds.has(activePlayer.id));

	if (!completed) {
		return { completed: false, votingResult: null, submittedPlayers };
	}

	const voteRows = await executor
		.select({
			artifactId: artifactVoteAllocations.artifactId,
			chipCount: artifactVoteAllocations.chipCount
		})
		.from(artifactVoteAllocations)
		.innerJoin(
			gameVoteSubmissions,
			eq(artifactVoteAllocations.submissionId, gameVoteSubmissions.id)
		)
		.where(eq(gameVoteSubmissions.roundId, currentRound.id));
	const voteTotals = new Map<number, number>();
	for (const voteRow of voteRows) {
		voteTotals.set(
			voteRow.artifactId,
			(voteTotals.get(voteRow.artifactId) ?? 0) + voteRow.chipCount
		);
	}

	const rankedArtifacts = await executor
		.select({ id: gameArtifacts.id, animal: gameArtifacts.animal })
		.from(gameArtifacts)
		.where(and(eq(gameArtifacts.gameId, gameId), eq(gameArtifacts.round, currentRound.round)));
	rankedArtifacts.sort((a, b) => {
		const voteDifference = (voteTotals.get(b.id) ?? 0) - (voteTotals.get(a.id) ?? 0);
		if (voteDifference !== 0) return voteDifference;
		return ZODIAC_ORDER.indexOf(a.animal) - ZODIAC_ORDER.indexOf(b.animal);
	});

	for (let index = 0; index < rankedArtifacts.length; index++) {
		const artifact = rankedArtifacts[index];
		await executor
			.update(gameArtifacts)
			.set({
				votes: voteTotals.get(artifact.id) ?? 0,
				voteRank: index < 2 ? index + 1 : null
			})
			.where(eq(gameArtifacts.id, artifact.id));
	}
	await executor
		.update(gameRounds)
		.set({ phase: 'result' })
		.where(eq(gameRounds.id, currentRound.id));
	const votingResult = await getPublishedOnlineVotingResult(
		executor,
		gameId,
		currentRound.round,
		currentRound.id
	);

	return { completed: true, votingResult, submittedPlayers };
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
