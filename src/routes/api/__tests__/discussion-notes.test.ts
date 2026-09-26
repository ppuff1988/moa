import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { db } from '$lib/server/db';
import {
	gameActions,
	gameArtifacts,
	gamePlayers,
	gameRounds,
	games,
	user
} from '$lib/server/db/schema';
import { generateJWT } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { API_BASE } from './helpers';

describe('discussion and private notes API', () => {
	let gameId: string;
	let room: string;
	let ids: number[];
	let tokens: string[];
	let userIds: number[];
	let artifactId: number;
	beforeEach(async () => {
		const stamp = crypto.randomUUID();
		const users = await db
			.insert(user)
			.values(
				Array.from({ length: 6 }, (_, i) => ({
					email: `discussion-${stamp}-${i}@example.com`,
					nickname: `玩家${i}`,
					emailVerified: true,
					isTest: true
				}))
			)
			.returning();
		userIds = users.map((u) => u.id);
		tokens = users.map((u) => generateJWT({ userId: u.id, email: u.email, tokenVersion: 0 }));
		room = `notes-${stamp}`;
		const [game] = await db
			.insert(games)
			.values({
				roomName: room,
				roomPassword: 'test',
				hostId: users[0].id,
				status: 'playing',
				playerCount: 6
			})
			.returning();
		gameId = game.id;
		const players = await db
			.insert(gamePlayers)
			.values(
				users.map((u, i) => ({
					gameId,
					userId: u.id,
					isHost: i === 0,
					isReady: true,
					roleId: i + 1,
					color: `顏色${i}`
				}))
			)
			.returning();
		ids = players.map((p) => p.id);
		await db.update(games).set({ seatOrder: ids }).where(eq(games.id, gameId));
		await db
			.insert(gameRounds)
			.values({ gameId, round: 1, phase: 'discussion', actionOrder: [...ids].reverse() });
		const [artifact] = await db
			.insert(gameArtifacts)
			.values({ gameId, round: 1, animal: '鼠', isGenuine: true })
			.returning();
		artifactId = artifact.id;
		await db.insert(gameArtifacts).values({ gameId, round: 2, animal: '虎', isGenuine: false });
	});
	afterEach(async () => {
		await db.delete(gameActions).where(eq(gameActions.gameId, gameId));
		await db.delete(gameRounds).where(eq(gameRounds.gameId, gameId));
		await db.delete(gameArtifacts).where(eq(gameArtifacts.gameId, gameId));
		await db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));
		await db.delete(games).where(eq(games.id, gameId));
		for (const id of userIds) await db.delete(user).where(eq(user.id, id));
	});
	const call = (path: string, actor = 0, body?: unknown) =>
		fetch(`${API_BASE}/api/room/${room}/${path}`, {
			method: body === undefined ? 'GET' : 'PATCH',
			headers: { Authorization: `Bearer ${tokens[actor]}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	const patch = (value: string, expectedVersion = 0) => ({
		round: 1,
		subjectPlayerId: ids[2],
		expectedVersion,
		change: { field: 'memo', value }
	});
	it('returns both positions without revealing roles or future artifacts', async () => {
		const response = await call('discussion?round=1');
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.players.map((p: { playerId: number }) => p.playerId)).toEqual(ids);
		expect(data.players[0]).toMatchObject({ actionPosition: 1, speakingPosition: 1 });
		expect(data.artifacts).toEqual([{ id: artifactId, animal: '鼠' }]);
		expect(JSON.stringify(data)).not.toMatch(/roleId|isGenuine|attackedRounds/);
		expect((await call('discussion?round=2')).status).toBe(404);
	});
	it('isolates notes from the subject and host, survives rereading, and disables caching', async () => {
		expect((await call('discussion-notes', 1, patch('私人推理'))).status).toBe(200);
		const own = await call('discussion-notes?round=1', 1);
		expect(own.headers.get('cache-control')).toContain('no-store');
		expect((await own.json()).notes[0].memo).toBe('私人推理');
		for (const actor of [0, 2])
			expect((await (await call('discussion-notes?round=1', actor)).json()).notes).toEqual([]);
	});
	it('saves private per-round alignments, detects conflicts and permits clearing', async () => {
		const update = (value: string, version: number) =>
			call('discussion-notes', 1, {
				...patch('', version),
				change: { field: 'alignment', value }
			});
		expect((await call('discussion-notes', 1, patch('保留備註'))).status).toBe(200);
		const saved = await update('bad', 1);
		expect(saved.status).toBe(200);
		expect((await saved.json()).note).toMatchObject({
			alignment: 'bad',
			memo: '保留備註',
			version: 2
		});
		const own = await call('discussion-notes?round=1', 1);
		expect(own.headers.get('cache-control')).toBe('private, no-store');
		expect((await own.json()).notes[0].alignment).toBe('bad');
		for (const actor of [0, 2]) {
			expect((await (await call('discussion-notes?round=1', actor)).json()).notes).toEqual([]);
		}
		expect(await (await call('discussion', 0)).text()).not.toContain('alignment');
		const stale = await update('good', 1);
		expect(stale.status).toBe(409);
		expect((await stale.json()).note.alignment).toBe('bad');
		await db
			.insert(gameRounds)
			.values({ gameId, round: 2, phase: 'discussion', actionOrder: [...ids].reverse() });
		expect((await (await call('discussion-notes?round=2', 1)).json()).notes).toEqual([]);
		expect((await call('discussion-notes', 1, { ...patch('第二輪'), round: 2 })).status).toBe(200);
		expect((await (await call('discussion-notes?round=2', 1)).json()).notes[0].alignment).toBe(
			'unknown'
		);
		const cleared = await update('unknown', 2);
		expect(cleared.status).toBe(200);
		expect((await cleared.json()).note).toMatchObject({
			alignment: 'unknown',
			memo: '保留備註',
			version: 3
		});
	});
	it('rejects invalid alignment and prevents marking after leaving or game end', async () => {
		const body = { ...patch(''), change: { field: 'alignment', value: 'bad' } };
		for (const value of ['evil', null, ['bad'], true]) {
			expect(
				(await call('discussion-notes', 1, { ...body, change: { field: 'alignment', value } }))
					.status
			).toBe(400);
		}
		expect((await call('discussion-notes', 1, { ...body, ownerPlayerId: ids[0] })).status).toBe(
			400
		);
		await db
			.update(gamePlayers)
			.set({ roomPresence: 'left', leftAt: new Date() })
			.where(eq(gamePlayers.id, ids[2]));
		expect((await call('discussion-notes', 2, body)).status).toBe(403);
		await db.update(games).set({ status: 'finished' }).where(eq(games.id, gameId));
		expect((await call('discussion-notes', 1, body)).status).toBe(409);
	});
	it('rejects stale updates and simultaneous creation without losing the first write', async () => {
		const responses = await Promise.all([
			call('discussion-notes', 1, patch('甲')),
			call('discussion-notes', 1, patch('乙'))
		]);
		expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
		expect((await call('discussion-notes', 1, patch('過期'))).status).toBe(409);
	});
	it('rejects owner injection, unknown subject and wrong-round artifacts', async () => {
		expect(
			(await call('discussion-notes', 1, { ...patch('a'), ownerPlayerId: ids[0] })).status
		).toBe(400);
		expect(
			(await call('discussion-notes', 1, { ...patch('a'), subjectPlayerId: 2147483647 })).status
		).toBe(400);
		expect(
			(
				await call('discussion-notes', 1, {
					...patch('a'),
					change: { field: 'artifact', artifactId: artifactId + 1, value: 'fake' }
				})
			).status
		).toBe(400);
	});
	it('replaces artifact claims with a round attack statement and permits correcting it', async () => {
		expect(
			(
				await call('discussion-notes', 1, {
					...patch(''),
					change: { field: 'artifact', artifactId, value: 'fake' }
				})
			).status
		).toBe(200);
		expect(
			(
				await call('discussion-notes', 1, {
					...patch('', 1),
					change: { field: 'claimedAttacked', value: true }
				})
			).status
		).toBe(200);
		const note = (await (await call('discussion-notes?round=1', 1)).json()).notes[0];
		expect(note.artifactClaims).toEqual({});
		expect(note).toMatchObject({
			claimedAttacked: true,
			version: 2
		});
		const corrected = await call('discussion-notes', 1, {
			...patch('', 2),
			change: { field: 'artifact', artifactId, value: 'fake' }
		});
		expect(corrected.status).toBe(200);
		expect((await corrected.json()).note).toMatchObject({
			artifactClaims: { [artifactId]: 'fake' },
			claimedAttacked: false,
			version: 3
		});
	});
	it('denies future/action-phase notes and writes after the game ends', async () => {
		expect((await call('discussion-notes', 1, { ...patch('a'), round: 2 })).status).toBe(404);
		await db.update(gameRounds).set({ phase: 'action' }).where(eq(gameRounds.gameId, gameId));
		expect((await call('discussion-notes', 1, patch('a'))).status).toBe(409);
		await db.update(gameRounds).set({ phase: 'discussion' }).where(eq(gameRounds.gameId, gameId));
		await db.update(games).set({ status: 'finished' }).where(eq(games.id, gameId));
		expect((await call('discussion-notes', 1, patch('a'))).status).toBe(409);
		expect((await call('discussion-notes?round=1', 1)).status).toBe(200);
	});
	it('requires room membership, while someone else leaving does not block saving', async () => {
		await db
			.update(gamePlayers)
			.set({ roomPresence: 'left', leftAt: new Date() })
			.where(eq(gamePlayers.id, ids[2]));
		expect((await call('discussion-notes?round=1', 2)).status).toBe(403);
		expect((await call('discussion-notes', 1, patch('a'))).status).toBe(200);
	});
	it('only lets the host arrange a complete roster before play', async () => {
		await db
			.update(games)
			.set({ status: 'waiting', seatingMode: 'manual', seatOrder: null })
			.where(eq(games.id, gameId));
		expect((await call('seating', 1, { seatOrder: ids })).status).toBe(403);
		expect((await call('seating', 0, { seatOrder: [ids[0], ids[0]] })).status).toBe(400);
		expect((await call('seating', 0, { seatOrder: [...ids].reverse() })).status).toBe(200);
		expect((await (await call('seating', 1)).json()).seatOrder).toEqual([...ids].reverse());
		await db.update(games).set({ status: 'playing' }).where(eq(games.id, gameId));
		expect((await call('seating', 0, { seatOrder: ids })).status).toBe(409);
	});
	it.each([false, true])(
		'preserves manual seating through %s auto assignment and rejects repeated starts',
		async (auto) => {
			await db.delete(gameRounds).where(eq(gameRounds.gameId, gameId));
			await db.delete(gameArtifacts).where(eq(gameArtifacts.gameId, gameId));
			const seats = [ids[0], ids[3], ids[1], ids[5], ids[4], ids[2]];
			await db
				.update(games)
				.set({
					status: auto ? 'waiting' : 'selecting',
					autoAssignRolesAndColors: auto,
					seatingMode: 'manual',
					seatOrder: null
				})
				.where(eq(games.id, gameId));
			const start = () =>
				fetch(`${API_BASE}/api/room/${room}/start`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${tokens[0]}`, 'Content-Type': 'application/json' },
					body: '{}'
				});
			expect((await start()).status).toBe(400);
			expect((await call('seating', 0, { seatOrder: seats })).status).toBe(200);
			expect((await start()).status).toBe(200);
			expect((await (await call('seating')).json()).seatOrder).toEqual(seats);
			expect((await start()).ok).toBe(false);
			expect((await (await call('seating')).json()).seatOrder).toEqual(seats);
		}
	);
});
