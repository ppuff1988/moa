import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import {
	gameActions,
	gameArtifacts,
	gameDiscussionNotes,
	gamePlayers,
	gameRounds,
	games,
	user
} from './db/schema';
import type { Game } from './db/schema';
import type { DiscussionData, DiscussionNote, NotePatch } from '$lib/types/discussion';
import { buildDiscussionOrder, isCompletePlayerOrder } from './game-turn-order';
import { applyNoteChange, emptyNote } from '$lib/utils/discussion';
import { ZODIAC_ORDER_MAP } from './constants';

export const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function parseRound(value: string | null): number | undefined {
	if (value === null) return undefined;
	if (!/^[1-3]$/.test(value)) error(400, '回合必須為 1 至 3');
	return Number(value);
}

export async function getSeating(game: Game) {
	const players = await db
		.select({
			id: gamePlayers.id,
			nickname: user.nickname,
			color: gamePlayers.color,
			colorCode: gamePlayers.colorCode,
			isHost: gamePlayers.isHost,
			userId: gamePlayers.userId
		})
		.from(gamePlayers)
		.innerJoin(user, eq(user.id, gamePlayers.userId))
		.where(eq(gamePlayers.gameId, game.id))
		.orderBy(asc(gamePlayers.joinedAt), asc(gamePlayers.id));
	return {
		seatingMode: game.seatingMode,
		seatOrder: isCompletePlayerOrder(
			game.seatOrder,
			players.map((p) => p.id)
		)
			? game.seatOrder
			: null,
		players,
		editable: ['waiting', 'selecting'].includes(game.status)
	};
}

export async function saveSeating(gameId: string, actorId: number, seats: unknown) {
	return db.transaction(async (tx) => {
		const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for('update');
		if (!game || game.hostId !== actorId) error(403, '只有房主可設定座位');
		if (!['waiting', 'selecting'].includes(game.status) || game.seatingMode !== 'manual')
			error(409, '此時無法調整座位');
		const players = await tx
			.select()
			.from(gamePlayers)
			.where(eq(gamePlayers.gameId, gameId))
			.for('update');
		const host = players.find((p) => p.userId === actorId);
		if (!host || host.roomPresence !== 'active' || host.leftAt) error(403, '您不在此房間中');
		if (
			!isCompletePlayerOrder(
				seats,
				players.map((p) => p.id)
			)
		)
			error(400, '請依目前玩家名單排列所有座位，每人一次');
		await tx
			.update(games)
			.set({ seatOrder: seats, updatedAt: new Date() })
			.where(eq(games.id, gameId));
		return { seatOrder: seats };
	});
}

export async function getDiscussion(
	game: Game,
	ownerPlayerId: number,
	requested?: number
): Promise<DiscussionData> {
	const rounds = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.gameId, game.id))
		.orderBy(asc(gameRounds.round));
	const round = requested === undefined ? rounds.at(-1) : rounds.find((r) => r.round === requested);
	if (!round) error(404, '此回合尚未開始');
	const { players } = await getSeating(game);
	const notesAvailable = round.phase !== 'action';
	const order = buildDiscussionOrder(game.seatOrder, round.actionOrder, players, notesAvailable);
	const artifacts = await db
		.select({ id: gameArtifacts.id, animal: gameArtifacts.animal })
		.from(gameArtifacts)
		.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, round.round)));
	artifacts.sort((a, b) => (ZODIAC_ORDER_MAP[a.animal] ?? 99) - (ZODIAC_ORDER_MAP[b.animal] ?? 99));
	const actions = await db
		.select({ data: gameActions.actionData })
		.from(gameActions)
		.where(
			and(
				eq(gameActions.gameId, game.id),
				eq(gameActions.roundId, round.id),
				eq(gameActions.playerId, ownerPlayerId)
			)
		)
		.orderBy(asc(gameActions.ordering));
	const myClaims: DiscussionData['myClaims'] = {};
	for (const { data } of actions) {
		const action = data as Record<string, unknown> | null;
		if (action?.type !== 'identify_artifact' || typeof action.artifactName !== 'string') continue;
		const artifact = artifacts.find(
			(a) => a.animal === action.artifactName?.toString().replace('首', '')
		);
		if (!artifact) continue;
		if (action.blocked === true) myClaims[artifact.id] = 'unable';
		else if (typeof action.result === 'boolean')
			myClaims[artifact.id] = action.result ? 'genuine' : 'fake';
	}
	return {
		...order,
		gameId: game.id,
		ownerPlayerId,
		round: round.round,
		availableRounds: rounds.filter((r) => r.phase !== 'action').map((r) => r.round),
		notesAvailable,
		editable: game.status === 'playing' && notesAvailable,
		artifacts,
		myClaims
	};
}

export async function getNotes(gameId: string, ownerPlayerId: number, roundNumber: number) {
	const [round] = await db
		.select()
		.from(gameRounds)
		.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, roundNumber)));
	if (!round) error(404, '此回合尚未開始');
	if (round.phase === 'action') error(409, '此回合尚未進入討論');
	const rows = await db
		.select()
		.from(gameDiscussionNotes)
		.where(
			and(
				eq(gameDiscussionNotes.gameId, gameId),
				eq(gameDiscussionNotes.roundId, round.id),
				eq(gameDiscussionNotes.ownerPlayerId, ownerPlayerId)
			)
		);
	return rows.map(noteDto);
}

function noteDto(row: typeof gameDiscussionNotes.$inferSelect): DiscussionNote {
	return {
		subjectPlayerId: row.subjectPlayerId,
		artifactClaims: row.artifactClaims,
		claimedAttacked: row.claimedAttacked,
		memo: row.memo,
		version: row.version
	};
}

export async function saveNote(gameId: string, ownerPlayerId: number, patch: NotePatch) {
	return db.transaction(async (tx) => {
		// Same game -> players -> round lock order as game phase transitions.
		const [game] = await tx.select().from(games).where(eq(games.id, gameId)).for('update');
		if (!game || game.status !== 'playing') error(409, '遊戲已結束，筆記僅供回看');
		const players = await tx
			.select()
			.from(gamePlayers)
			.where(eq(gamePlayers.gameId, gameId))
			.for('update');
		const owner = players.find((p) => p.id === ownerPlayerId);
		if (!owner || owner.roomPresence !== 'active' || owner.leftAt) error(403, '您不在此房間中');
		if (!players.some((p) => p.id === patch.subjectPlayerId)) error(400, '玩家不屬於此局');
		const [round] = await tx
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, patch.round)))
			.for('update');
		if (!round) error(404, '此回合尚未開始');
		if (round.phase === 'action') error(409, '此回合尚未進入討論');
		if (patch.change.field === 'artifact') {
			const [artifact] = await tx
				.select({ id: gameArtifacts.id })
				.from(gameArtifacts)
				.where(
					and(
						eq(gameArtifacts.id, patch.change.artifactId),
						eq(gameArtifacts.gameId, gameId),
						eq(gameArtifacts.round, patch.round)
					)
				);
			if (!artifact) error(400, '獸首不屬於此回合');
		}
		const where = and(
			eq(gameDiscussionNotes.gameId, gameId),
			eq(gameDiscussionNotes.roundId, round.id),
			eq(gameDiscussionNotes.ownerPlayerId, ownerPlayerId),
			eq(gameDiscussionNotes.subjectPlayerId, patch.subjectPlayerId)
		);
		const [existing] = await tx.select().from(gameDiscussionNotes).where(where);
		const current = existing ? noteDto(existing) : emptyNote(patch.subjectPlayerId);
		if (current.version !== patch.expectedVersion) return { conflict: true, note: current };
		const next = applyNoteChange(current, patch.change);
		const values = {
			artifactClaims: next.artifactClaims,
			claimedAttacked: next.claimedAttacked,
			memo: next.memo,
			version: current.version + 1,
			updatedAt: new Date()
		};
		const [saved] = existing
			? await tx.update(gameDiscussionNotes).set(values).where(where).returning()
			: await tx
					.insert(gameDiscussionNotes)
					.values({
						...values,
						gameId,
						roundId: round.id,
						ownerPlayerId,
						subjectPlayerId: patch.subjectPlayerId
					})
					.returning();
		return { conflict: false, note: noteDto(saved) };
	});
}
