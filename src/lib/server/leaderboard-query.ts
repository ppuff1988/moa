import { sql } from 'drizzle-orm';
import { XUYUAN_WIN_SCORE } from './game-identification-helpers';

export const LEADERBOARD_LIMIT = 10;

export function buildLeaderboardQuery({ roleId }: { roleId: number | null }) {
	const roleFilter = roleId === null ? sql`true` : sql`role_id = ${roleId}`;

	// Rank before limiting the displayed entries. A completed game counts once per account, even if
	// legacy membership rows were duplicated. Leaving a finished room is irrelevant.
	return sql`
		WITH eligible_roles AS (
			SELECT id, name, camp FROM roles
			WHERE camp IN ('good', 'bad')
			AND lower(trim(name)) NOT IN ('test', 'undefined', 'null', '')
		), participations AS (
			SELECT DISTINCT ON (gp.game_id, gp.user_id)
				gp.game_id, gp.user_id, u.nickname, r.id AS role_id, g.finished_at,
				((r.camp = 'good' AND g.total_score >= ${XUYUAN_WIN_SCORE})
				OR (r.camp = 'bad' AND g.total_score < ${XUYUAN_WIN_SCORE})) AS won
			FROM game_players gp
			JOIN games g ON g.id = gp.game_id
			JOIN users u ON u.id = gp.user_id
			JOIN eligible_roles r ON r.id = gp.role_id
			WHERE g.status = 'finished' AND g.total_score IS NOT NULL AND u.is_test = false
			ORDER BY gp.game_id, gp.user_id, gp.id DESC
		), filtered AS (
			SELECT * FROM participations WHERE ${roleFilter}
		), player_counts AS (
			SELECT user_id, nickname, count(*)::int AS games,
				count(*) FILTER (WHERE won)::int AS wins
			FROM filtered GROUP BY user_id, nickname
		), ranked AS (
			SELECT *, rank() OVER (ORDER BY wins DESC)::int AS rank,
				round(100.0 * wins / games, 1)::float AS win_rate
			FROM player_counts
		), totals AS (
			SELECT count(*)::int AS total_players,
				coalesce(sum(wins), 0)::int AS total_wins,
				coalesce(max(wins), 0)::int AS leader_wins
			FROM ranked
		), role_counts AS (
			SELECT role_id, user_id, nickname, count(*) FILTER (WHERE won)::int AS wins
			FROM participations GROUP BY role_id, user_id, nickname
		), role_ranked AS (
			SELECT *, rank() OVER (PARTITION BY role_id ORDER BY wins DESC) AS role_rank
			FROM role_counts
		)
		SELECT
			coalesce((SELECT json_agg(json_build_object(
				'nickname', row.nickname, 'rank', row.rank, 'wins', row.wins,
				'games', row.games, 'winRate', row.win_rate
			) ORDER BY row.wins DESC, row.user_id) FROM (
				SELECT user_id, nickname, rank, wins, games, win_rate
				FROM ranked ORDER BY wins DESC, user_id
				LIMIT ${LEADERBOARD_LIMIT}
			) row), '[]'::json) AS entries,
			coalesce((SELECT json_agg(role ORDER BY role.id) FROM (
				SELECT r.*,
					coalesce((SELECT max(wins) FROM role_counts WHERE role_id = r.id), 0) AS "leaderWins",
					(SELECT count(*)::int FROM role_ranked WHERE role_id = r.id AND role_rank = 1 AND wins > 0) AS "leaderCount",
					coalesce((SELECT json_agg(json_build_object('nickname', winner.nickname) ORDER BY winner.user_id) FROM (
						SELECT user_id, nickname FROM role_ranked
						WHERE role_id = r.id AND role_rank = 1 AND wins > 0 ORDER BY user_id LIMIT 3
					) winner), '[]'::json) AS leaders
				FROM eligible_roles r
			) role), '[]'::json) AS roles,
			t.total_players AS "totalPlayers", t.total_wins AS "totalWins", t.leader_wins AS "leaderWins",
			(SELECT count(DISTINCT game_id)::int FROM filtered) AS "totalGames",
			(SELECT max(finished_at) FROM filtered) AS "lastFinishedAt",
			(SELECT count(*)::int FROM ranked WHERE rank = 1 AND wins > 0) AS "leaderCount",
			coalesce((SELECT json_agg(json_build_object('nickname', winner.nickname) ORDER BY winner.user_id) FROM (
				SELECT user_id, nickname FROM ranked
				WHERE rank = 1 AND wins > 0 ORDER BY user_id LIMIT 3
			) winner), '[]'::json) AS leaders
		FROM totals t
	`;
}
