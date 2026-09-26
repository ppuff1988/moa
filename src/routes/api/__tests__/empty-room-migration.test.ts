import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

const migration = readFileSync('migrations/0020_terminate_empty_unfinished_games.sql', 'utf8');

describe('empty unfinished game migration', () => {
	it('terminates only empty unfinished games, preserves history and is idempotent', async () => {
		await db.transaction(async (tx) => {
			// Temporary tables keep this migration test isolated from other API fixtures.
			await tx.execute(
				sql.raw(`
				CREATE TEMP TABLE games (
					id integer PRIMARY KEY, status text, player_count integer DEFAULT 6,
					finished_at timestamp, updated_at timestamp DEFAULT '2026-01-01'
				) ON COMMIT DROP;
				CREATE TEMP TABLE game_players (
					id integer PRIMARY KEY, game_id integer, room_presence text,
					left_at timestamp, is_online boolean DEFAULT false
				) ON COMMIT DROP;
				INSERT INTO games(id,status,finished_at) VALUES
					(1,'waiting',NULL),(2,'selecting',NULL),(3,'playing',NULL),
					(4,'playing',NULL),(5,'playing',NULL),
					(6,'finished','2026-01-02'),(7,'terminated','2026-01-03');
				INSERT INTO game_players(id,game_id,room_presence,left_at) VALUES
					(2,2,'left','2026-01-01'),(3,3,'left','2026-01-01'),
					(4,4,'active',NULL),(5,5,'active',NULL),(8,5,'left','2026-01-01'),
					(6,6,'left','2026-01-01'),(7,7,'left','2026-01-01');
			`)
			);
			const playersBefore = await tx.execute(sql`SELECT * FROM game_players ORDER BY id`);
			const gamesBefore = await tx.execute(sql`SELECT * FROM games ORDER BY id`);
			await tx.execute(sql.raw(migration));
			const after = await tx.execute(sql`SELECT * FROM games ORDER BY id`);
			expect(after.map((g) => g.status)).toEqual([
				'terminated',
				'terminated',
				'terminated',
				'playing',
				'playing',
				'finished',
				'terminated'
			]);
			for (const game of after.slice(0, 3)) expect(game.finished_at).not.toBeNull();
			expect(after.slice(3)).toEqual(gamesBefore.slice(3));
			expect(after.every((g) => g.player_count === 6)).toBe(true);
			expect(await tx.execute(sql`SELECT * FROM game_players ORDER BY id`)).toEqual(playersBefore);
			await tx.execute(sql.raw(migration));
			expect(await tx.execute(sql`SELECT * FROM games ORDER BY id`)).toEqual(after);
		});
	});
});
