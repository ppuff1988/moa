import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { buildLeaderboardQuery } from '$lib/server/leaderboard-query';
import type { LeaderboardResult } from '$lib/types/leaderboard';

// Temporary tables shadow the live tables only on this transaction's connection.
// No accounts or game records are written to the application's tables.
async function withFixture(
	run: (
		query: (roleId?: number | null, page?: number) => Promise<LeaderboardResult>
	) => Promise<void>
) {
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`CREATE TEMP TABLE users (id integer, nickname text, email text) ON COMMIT DROP`
		);
		await tx.execute(
			sql`CREATE TEMP TABLE roles (id integer, name text, camp text) ON COMMIT DROP`
		);
		await tx.execute(
			sql`CREATE TEMP TABLE games (id text, status text, total_score integer, finished_at timestamp) ON COMMIT DROP`
		);
		await tx.execute(
			sql`CREATE TEMP TABLE game_players (id integer, game_id text, user_id integer, role_id integer, left_at timestamp) ON COMMIT DROP`
		);
		await tx.execute(
			sql`INSERT INTO users VALUES (1, '青禾', 'private-one@example.com'), (2, '墨竹', 'private-two@example.com'), (3, '知秋', 'private-three@example.com'), (4, '未入局', 'private-four@example.com')`
		);
		await tx.execute(
			sql`INSERT INTO roles VALUES (1, '許愿', 'good'), (2, '老朝奉', 'bad'), (3, '方震', 'good'), (4, 'test', 'good'), (5, '錯誤陣營', 'unknown')`
		);
		await tx.execute(
			sql`INSERT INTO games VALUES ('six', 'finished', 6, '2026-09-01'), ('five', 'finished', 5, '2026-09-02'), ('seven', 'finished', 7, '2026-09-03'), ('playing', 'playing', 6, NULL), ('terminated', 'terminated', 6, '2026-09-04'), ('invalid', 'finished', NULL, '2026-09-05')`
		);
		await tx.execute(sql`INSERT INTO game_players VALUES
			(1, 'six', 1, 1, '2026-09-01'), (2, 'six', 1, 1, '2026-09-01'),
			(3, 'six', 2, 2, NULL), (4, 'six', 3, 1, NULL),
			(5, 'five', 1, 1, NULL), (6, 'five', 2, 2, NULL),
			(7, 'seven', 1, 1, NULL), (8, 'seven', 2, 1, NULL),
			(9, 'playing', 3, 1, NULL), (10, 'terminated', 3, 1, NULL),
			(11, 'invalid', 3, 2, NULL), (12, 'six', 4, NULL, NULL),
			(13, 'five', 4, 4, NULL), (14, 'seven', 4, 5, NULL)`);
		await run(async (roleId = null, page = 1) => {
			const rows = await tx.execute(buildLeaderboardQuery({ roleId, page }));
			return rows[0] as unknown as LeaderboardResult;
		});
	});
}

describe('leaderboard aggregation with PostgreSQL', () => {
	it('counts completed games once, retains departed players and ranks equal wins jointly', async () => {
		await withFixture(async (query) => {
			const result = await query();
			expect(result.entries).toEqual([
				{ userId: 1, nickname: '青禾', wins: 2, games: 3, rank: 1, winRate: 66.7 },
				{ userId: 2, nickname: '墨竹', wins: 2, games: 3, rank: 1, winRate: 66.7 },
				{ userId: 3, nickname: '知秋', wins: 1, games: 1, rank: 3, winRate: 100 }
			]);
			expect(result).toMatchObject({
				totalPlayers: 3,
				totalGames: 3,
				totalWins: 5,
				leaderWins: 2,
				leaderCount: 2,
				leaders: [
					{ userId: 1, nickname: '青禾' },
					{ userId: 2, nickname: '墨竹' }
				],
				page: 1,
				totalPages: 1
			});
			expect(JSON.stringify(result)).not.toContain('private-');
			expect(result.roles.map((role) => role.name)).toEqual(['許愿', '老朝奉', '方震']);
		});
	});

	it('attributes each victory and honor to the role used in that game', async () => {
		await withFixture(async (query) => {
			const result = await query(2);
			expect(result.entries).toEqual([
				{ userId: 2, nickname: '墨竹', wins: 1, games: 2, rank: 1, winRate: 50 }
			]);
			expect(result).toMatchObject({ totalGames: 2, totalWins: 1 });
			expect(result.roles.find((role) => role.id === 2)).toMatchObject({
				leaderWins: 1,
				leaderCount: 1,
				leaders: [{ userId: 2, nickname: '墨竹' }]
			});
			const good = await query(1);
			expect(good.entries.map(({ userId, wins, games }) => ({ userId, wins, games }))).toEqual([
				{ userId: 1, wins: 2, games: 3 },
				{ userId: 2, wins: 1, games: 1 },
				{ userId: 3, wins: 1, games: 1 }
			]);
		});
	});

	it('returns a real empty state for an unused role and clamps out-of-range pages', async () => {
		await withFixture(async (query) => {
			expect(await query(3, 999)).toMatchObject({
				entries: [],
				totalPlayers: 0,
				totalGames: 0,
				totalWins: 0,
				leaderWins: 0,
				leaderCount: 0,
				leaders: [],
				page: 1,
				totalPages: 1
			});
			expect((await query(null, 999)).page).toBe(1);
		});
	});

	it('paginates after computing global ranks and preserves equal ranks across pages', async () => {
		await db.transaction(async (tx) => {
			await tx.execute(sql`CREATE TEMP TABLE users (id integer, nickname text) ON COMMIT DROP`);
			await tx.execute(
				sql`CREATE TEMP TABLE roles (id integer, name text, camp text) ON COMMIT DROP`
			);
			await tx.execute(
				sql`CREATE TEMP TABLE games (id text, status text, total_score integer, finished_at timestamp) ON COMMIT DROP`
			);
			await tx.execute(
				sql`CREATE TEMP TABLE game_players (id integer, game_id text, user_id integer, role_id integer) ON COMMIT DROP`
			);
			await tx.execute(sql`INSERT INTO users SELECT n, '玩家' || n FROM generate_series(1, 23) n`);
			await tx.execute(sql`INSERT INTO roles VALUES (1, '許愿', 'good')`);
			await tx.execute(
				sql`INSERT INTO games SELECT 'game' || n, 'finished', CASE WHEN n <= 21 THEN 6 ELSE 5 END, '2026-09-01'::timestamp FROM generate_series(1, 23) n`
			);
			await tx.execute(
				sql`INSERT INTO game_players SELECT n, 'game' || n, n, 1 FROM generate_series(1, 23) n`
			);
			const [result] = await tx.execute(buildLeaderboardQuery({ roleId: null, page: 2 }));
			expect(result).toMatchObject({ page: 2, totalPages: 2, totalPlayers: 23 });
			expect(
				(result.entries as LeaderboardResult['entries']).map(({ userId, rank, wins }) => ({
					userId,
					rank,
					wins
				}))
			).toEqual([
				{ userId: 21, rank: 1, wins: 1 },
				{ userId: 22, rank: 22, wins: 0 },
				{ userId: 23, rank: 22, wins: 0 }
			]);
		});
	});
});
