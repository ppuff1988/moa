import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentRoundOrError, verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import {
	artifactVoteAllocations,
	gameArtifacts,
	gamePlayers,
	gameRounds,
	gameVoteSubmissions
} from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ZODIAC_ORDER } from '$lib/server/constants';
import { getPublishedOnlineVotingResult } from '$lib/server/game-voting';

class OnlineVotingSubmissionError extends Error {
	constructor(
		message: string,
		readonly status: number = 400
	) {
		super(message);
	}
}

type DatabaseExecutor = Pick<typeof db, 'select'>;

async function getSpentChips(gameId: string, playerId: number) {
	const rows = await db
		.select({ chipCount: artifactVoteAllocations.chipCount })
		.from(artifactVoteAllocations)
		.innerJoin(
			gameVoteSubmissions,
			eq(artifactVoteAllocations.submissionId, gameVoteSubmissions.id)
		)
		.where(and(eq(gameVoteSubmissions.gameId, gameId), eq(gameVoteSubmissions.playerId, playerId)));

	return rows.reduce((total, row) => total + row.chipCount, 0);
}

async function getSubmittedPlayers(executor: DatabaseExecutor, roundId: number) {
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

export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;
	if (!game.onlineVotingEnabled) {
		return json({ message: '此房間未開啟線上投票' }, { status: 400 });
	}

	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}

	const currentRound = roundResult.round;
	if (currentRound.phase !== 'voting') {
		return json({ message: '目前不是投票階段' }, { status: 409 });
	}

	const [submission] = await db
		.select()
		.from(gameVoteSubmissions)
		.where(
			and(
				eq(gameVoteSubmissions.roundId, currentRound.id),
				eq(gameVoteSubmissions.playerId, player.id)
			)
		)
		.limit(1);
	const ownAllocations = submission
		? await db
				.select({
					artifactId: artifactVoteAllocations.artifactId,
					chipCount: artifactVoteAllocations.chipCount
				})
				.from(artifactVoteAllocations)
				.where(eq(artifactVoteAllocations.submissionId, submission.id))
		: [];
	const spentChips = await getSpentChips(game.id, player.id);

	return json({
		onlineVotingEnabled: true,
		round: currentRound.round,
		chipBalance: currentRound.round * 2 - spentChips,
		totalPlayers: game.playerCount,
		playerColor: player.color,
		playerColorCode: player.colorCode,
		hasSubmitted: Boolean(submission),
		ownVotes: Object.fromEntries(
			ownAllocations.map((allocation) => [allocation.artifactId, allocation.chipCount])
		),
		submittedPlayers: await getSubmittedPlayers(db, currentRound.id),
		votingResult: null
	});
};

export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;
	if (!game.onlineVotingEnabled) {
		return json({ message: '此房間未開啟線上投票' }, { status: 400 });
	}

	let body: { votes?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ message: '無效的 JSON 格式' }, { status: 400 });
	}
	if (!body.votes || typeof body.votes !== 'object' || Array.isArray(body.votes)) {
		return json({ message: '投票資料格式錯誤' }, { status: 400 });
	}

	try {
		const result = await db.transaction(async (tx) => {
			const [currentRound] = await tx
				.select()
				.from(gameRounds)
				.where(eq(gameRounds.gameId, game.id))
				.orderBy(desc(gameRounds.round))
				.limit(1)
				.for('update');
			if (!currentRound || currentRound.phase !== 'voting') {
				throw new OnlineVotingSubmissionError('目前不是投票階段', 409);
			}

			const [existingSubmission] = await tx
				.select({ id: gameVoteSubmissions.id })
				.from(gameVoteSubmissions)
				.where(
					and(
						eq(gameVoteSubmissions.roundId, currentRound.id),
						eq(gameVoteSubmissions.playerId, player.id)
					)
				)
				.limit(1);
			if (existingSubmission) {
				throw new OnlineVotingSubmissionError('本輪投票已提交，無法修改', 409);
			}

			const artifacts = await tx
				.select({ id: gameArtifacts.id })
				.from(gameArtifacts)
				.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, currentRound.round)));
			if (artifacts.length !== 4) {
				throw new OnlineVotingSubmissionError('當輪獸首資料不完整');
			}
			const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
			const voteEntries = Object.entries(body.votes as Record<string, unknown>);
			for (const [artifactId, chipCount] of voteEntries) {
				if (
					!artifactIds.has(Number(artifactId)) ||
					typeof chipCount !== 'number' ||
					!Number.isInteger(chipCount) ||
					chipCount < 0
				) {
					throw new OnlineVotingSubmissionError('投票籌碼必須是當輪獸首的非負整數');
				}
			}

			const previousAllocations = await tx
				.select({ chipCount: artifactVoteAllocations.chipCount })
				.from(artifactVoteAllocations)
				.innerJoin(
					gameVoteSubmissions,
					eq(artifactVoteAllocations.submissionId, gameVoteSubmissions.id)
				)
				.where(
					and(eq(gameVoteSubmissions.gameId, game.id), eq(gameVoteSubmissions.playerId, player.id))
				);
			const previouslySpent = previousAllocations.reduce(
				(total, allocation) => total + allocation.chipCount,
				0
			);
			const availableChips = currentRound.round * 2 - previouslySpent;
			const submittedChips = voteEntries.reduce(
				(total, [, chipCount]) => total + (chipCount as number),
				0
			);
			if (submittedChips > availableChips) {
				throw new OnlineVotingSubmissionError('投入籌碼超過目前可用數量');
			}
			if (currentRound.round === 3 && submittedChips !== availableChips) {
				throw new OnlineVotingSubmissionError('第三輪必須投出全部剩餘籌碼');
			}
			const [submission] = await tx
				.insert(gameVoteSubmissions)
				.values({ gameId: game.id, roundId: currentRound.id, playerId: player.id })
				.returning();
			const allocations = voteEntries
				.filter(([, chipCount]) => (chipCount as number) > 0)
				.map(([artifactId, chipCount]) => ({
					submissionId: submission.id,
					artifactId: Number(artifactId),
					chipCount: chipCount as number
				}));
			if (allocations.length > 0) {
				await tx.insert(artifactVoteAllocations).values(allocations);
			}

			const submittedPlayers = await getSubmittedPlayers(tx, currentRound.id);
			const roomPlayers = await tx
				.select({ id: gamePlayers.id })
				.from(gamePlayers)
				.where(eq(gamePlayers.gameId, game.id));

			const completed = submittedPlayers.length === roomPlayers.length;
			let votingResult = null;
			if (completed) {
				const voteRows = await tx
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
				const rankedArtifacts = await tx
					.select({ id: gameArtifacts.id, animal: gameArtifacts.animal })
					.from(gameArtifacts)
					.where(
						and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, currentRound.round))
					);
				rankedArtifacts.sort((a, b) => {
					const voteDifference = (voteTotals.get(b.id) ?? 0) - (voteTotals.get(a.id) ?? 0);
					if (voteDifference !== 0) return voteDifference;
					return ZODIAC_ORDER.indexOf(a.animal) - ZODIAC_ORDER.indexOf(b.animal);
				});

				for (let index = 0; index < rankedArtifacts.length; index++) {
					const artifact = rankedArtifacts[index];
					await tx
						.update(gameArtifacts)
						.set({
							votes: voteTotals.get(artifact.id) ?? 0,
							voteRank: index < 2 ? index + 1 : null
						})
						.where(eq(gameArtifacts.id, artifact.id));
				}
				await tx
					.update(gameRounds)
					.set({ phase: 'result' })
					.where(eq(gameRounds.id, currentRound.id));
				votingResult = await getPublishedOnlineVotingResult(
					tx,
					game.id,
					currentRound.round,
					currentRound.id
				);
			}

			return {
				currentRound,
				chipBalance: availableChips - submittedChips,
				completed,
				votingResult,
				submittedPlayers
			};
		});

		try {
			if (result.completed) {
				getSocketIO()?.to(game.roomName).emit('voting-completed', {
					phase: 'result',
					votingResult: result.votingResult
				});
			} else {
				getSocketIO()?.to(game.roomName).emit('online-voting-progress', {
					round: result.currentRound.round,
					submittedPlayers: result.submittedPlayers
				});
			}
		} catch (error) {
			console.error('廣播線上投票狀態失敗:', error);
		}

		return json({
			completed: result.completed,
			chipBalance: result.chipBalance,
			hasSubmitted: true,
			votingResult: result.votingResult
		});
	} catch (error) {
		if (error instanceof OnlineVotingSubmissionError) {
			return json({ message: error.message }, { status: error.status });
		}

		console.error('提交線上投票失敗:', error);
		return json({ message: '提交投票失敗，請稍後再試' }, { status: 500 });
	}
};
