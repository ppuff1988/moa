import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom, getCurrentRound } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ZODIAC_ORDER_MAP } from '$lib/server/constants';

// 獲取當前回合的獸首資料
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;
	const currentRound = await getCurrentRound(game.id);

	if (!currentRound) {
		return json({
			artifacts: [],
			currentRound: null
		});
	}

	// 獲取當前回合的所有獸首
	const artifacts = await db
		.select({
			id: gameArtifacts.id,
			animal: gameArtifacts.animal,
			isGenuine: gameArtifacts.isGenuine,
			isSwapped: gameArtifacts.isSwapped,
			isBlocked: gameArtifacts.isBlocked,
			votes: gameArtifacts.votes,
			voteRank: gameArtifacts.voteRank
		})
		.from(gameArtifacts)
		.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, currentRound.round)));

	// 按照12生肖順序排序
	const sortedArtifacts = artifacts.sort((a, b) => {
		const orderA = ZODIAC_ORDER_MAP[a.animal] || 999;
		const orderB = ZODIAC_ORDER_MAP[b.animal] || 999;
		return orderA - orderB;
	});

	return json({
		artifacts: sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			animal: artifact.animal,
			isGenuine: artifact.isGenuine,
			isBlocked: artifact.isBlocked || false,
			votes: artifact.votes || 0,
			voteRank: artifact.voteRank,
			round: currentRound.round
		})),
		currentRound: currentRound.round
	});
};
