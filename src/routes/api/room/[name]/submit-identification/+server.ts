import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runIdentificationTransaction } from '$lib/server/api-helpers';
import { identificationVotes } from '$lib/server/db/schema';
import { getPlayersWithRoles } from '$lib/server/game-identification-helpers';
import {
	getIdentificationVotingState,
	validateIdentificationVote
} from '$lib/server/identification-voting';
import { emitToRoom } from '$lib/server/socket';
import { and, eq } from 'drizzle-orm';

type SubmitIdentificationResult =
	| { ok: false; error: Response }
	| {
			ok: true;
			playerId: number;
			votedCount: number;
			totalEligibleVoters: number;
			allVoted: boolean;
	  };

export const POST: RequestHandler = async ({ request, params }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: '投票資料格式錯誤' }, { status: 400 });
	}

	const votes =
		typeof body === 'object' && body !== null && 'votes' in body
			? (body as { votes: unknown }).votes
			: undefined;

	try {
		const result = await runIdentificationTransaction<SubmitIdentificationResult>(
			request,
			params.name!,
			async ({ transaction, game, player, role }) => {
				const playersWithRoles = await getPlayersWithRoles(game.id, transaction);
				const activePlayerIds = new Set(playersWithRoles.map(({ playerId }) => playerId));
				const validation = validateIdentificationVote(role.name, player.id, votes, activePlayerIds);

				if (!validation.valid) {
					return {
						ok: false,
						error: json({ message: validation.message }, { status: validation.status })
					};
				}

				const [existingVote] = await transaction
					.select()
					.from(identificationVotes)
					.where(
						and(
							eq(identificationVotes.gameId, game.id),
							eq(identificationVotes.playerId, player.id)
						)
					)
					.limit(1);

				if (existingVote) {
					return {
						ok: false,
						error: json({ message: '您已經投過票了' }, { status: 409 })
					};
				}

				await transaction.insert(identificationVotes).values({
					gameId: game.id,
					playerId: player.id,
					...validation.values
				});

				const allVotes = await transaction
					.select()
					.from(identificationVotes)
					.where(eq(identificationVotes.gameId, game.id));
				const votingState = getIdentificationVotingState(playersWithRoles, allVotes);

				return {
					ok: true,
					playerId: player.id,
					votedCount: votingState.votedCount,
					totalEligibleVoters: votingState.totalEligibleVoters,
					allVoted: votingState.allVoted
				};
			}
		);

		if ('error' in result) return result.error;
		if (!result.data.ok) return result.data.error;

		const eventData = result.data;
		await emitToRoom(params.name!, 'player-voted-identification', eventData);
		if (eventData.allVoted) {
			await emitToRoom(params.name!, 'all-players-voted-identification', {
				message: '所有玩家已完成投票，房主可以公布結果'
			});
		}

		return json({
			message: '投票成功',
			votedCount: eventData.votedCount,
			totalEligibleVoters: eventData.totalEligibleVoters
		});
	} catch (error) {
		console.error('提交鑑人投票錯誤:', error);
		return json({ message: '提交失敗' }, { status: 500 });
	}
};
