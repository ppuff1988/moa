import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	runAllPlayersOnlineTransaction,
	verifyPlayerInRoomWithStatus
} from '$lib/server/api-helpers';
import { games, gameArtifacts, gameRounds, gamePlayers, roles, user } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { emitToRoom } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;
		if (!player.isHost) {
			return json({ message: '只有房主可以進行結算' }, { status: 403 });
		}

		const result = await runAllPlayersOnlineTransaction(game.id, async (transaction) => {
			const [currentRound] = await transaction
				.select()
				.from(gameRounds)
				.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
				.orderBy(desc(gameRounds.round))
				.limit(1)
				.for('update');

			if (!currentRound || currentRound.phase !== 'result') {
				return {
					outcome: 'error' as const,
					response: json({ message: '必須在第三輪結果階段才能結算' }, { status: 400 })
				};
			}

			const allArtifacts = await transaction
				.select()
				.from(gameArtifacts)
				.where(eq(gameArtifacts.gameId, game.id));
			const selectedArtifacts = allArtifacts.filter(
				(artifact) => artifact.voteRank === 1 || artifact.voteRank === 2
			);

			let genuineCount = 0;
			for (let round = 1; round <= 3; round++) {
				selectedArtifacts
					.filter((artifact) => artifact.round === round)
					.forEach((artifact) => {
						if (artifact.isGenuine) genuineCount++;
					});
			}

			if (genuineCount === 6) {
				const finishedAt = new Date();
				await transaction
					.update(games)
					.set({ status: 'finished', totalScore: 6, finishedAt })
					.where(eq(games.id, game.id));

				const playersWithRoles = await transaction
					.select({
						playerId: gamePlayers.id,
						userId: gamePlayers.userId,
						nickname: user.nickname,
						roleName: roles.name,
						camp: roles.camp,
						colorCode: gamePlayers.colorCode
					})
					.from(gamePlayers)
					.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
					.innerJoin(user, eq(gamePlayers.userId, user.id))
					.where(eq(gamePlayers.gameId, game.id));

				await transaction
					.update(gameRounds)
					.set({ phase: 'completed', completedAt: finishedAt })
					.where(eq(gameRounds.id, currentRound.id));

				return {
					outcome: 'finished' as const,
					finalResult: {
						winner: '許愿陣營',
						xuYuanScore: 6,
						genuineCount: 6,
						needIdentification: false,
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
						identificationResults: null
					}
				};
			}

			await transaction
				.update(games)
				.set({ totalScore: genuineCount })
				.where(eq(games.id, game.id));
			await transaction
				.update(gameRounds)
				.set({ phase: 'identification' })
				.where(eq(gameRounds.id, currentRound.id));

			return { outcome: 'identification' as const };
		});

		if ('error' in result) return result.error;
		if (result.data.outcome === 'error') return result.data.response;

		if (result.data.outcome === 'finished') {
			await emitToRoom(params.name!, 'game-finished', result.data.finalResult);
			return json({
				message: '許愿陣營獲勝！',
				winner: '許愿陣營',
				xuYuanScore: 6,
				genuineCount: 6,
				needIdentification: false
			});
		}

		await emitToRoom(params.name!, 'enter-identification-phase', {
			message: '進入鑑人階段'
		});
		return json({
			message: '進入鑑人階段',
			needIdentification: true
		});
	} catch (error) {
		console.error('結算計算錯誤:', error);
		return json({ message: '結算計算失敗' }, { status: 500 });
	}
};
