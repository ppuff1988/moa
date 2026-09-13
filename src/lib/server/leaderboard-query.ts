import { sql } from 'drizzle-orm';
import { XUYUAN_WIN_SCORE } from './game-identification-helpers';

export const LEADERBOARD_PAGE_SIZE = 20;

export function buildLeaderboardQuery({ roleId, page }: { roleId: number | null; page: number }) {
	const roleFilter = roleId === null ? sql`true` : sql`role_id = ${roleId}`;

	// Rank before pagination. A completed game counts once per account, even if
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
			WHERE g.status = 'finished' AND g.total_score IS NOT NULL
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
		), pagination AS (
			SELECT *, greatest(1, ceil(total_players::numeric / ${LEADERBOARD_PAGE_SIZE})::int) AS total_pages,
				least(${page}, greatest(1, ceil(total_players::numeric / ${LEADERBOARD_PAGE_SIZE})::int)) AS current_page
			FROM totals
		), role_counts AS (
			SELECT role_id, user_id, nickname, count(*) FILTER (WHERE won)::int AS wins
			FROM participations GROUP BY role_id, user_id, nickname
		), role_ranked AS (
			SELECT *, rank() OVER (PARTITION BY role_id ORDER BY wins DESC) AS role_rank
			FROM role_counts
		)
		SELECT
			coalesce((SELECT json_agg(row ORDER BY row.wins DESC, row."userId") FROM (
				SELECT user_id AS "userId", nickname, rank, wins, games, win_rate AS "winRate"
				FROM ranked ORDER BY wins DESC, user_id
				LIMIT ${LEADERBOARD_PAGE_SIZE}
				OFFSET (SELECT (current_page - 1) * ${LEADERBOARD_PAGE_SIZE} FROM pagination)
			) row), '[]'::json) AS entries,
			coalesce((SELECT json_agg(role ORDER BY role.id) FROM (
				SELECT r.*,
					coalesce((SELECT max(wins) FROM role_counts WHERE role_id = r.id), 0) AS "leaderWins",
					(SELECT count(*)::int FROM role_ranked WHERE role_id = r.id AND role_rank = 1 AND wins > 0) AS "leaderCount",
					coalesce((SELECT json_agg(winner ORDER BY winner."userId") FROM (
						SELECT user_id AS "userId", nickname FROM role_ranked
						WHERE role_id = r.id AND role_rank = 1 AND wins > 0 ORDER BY user_id LIMIT 3
					) winner), '[]'::json) AS leaders
				FROM eligible_roles r
			) role), '[]'::json) AS roles,
			p.total_players AS "totalPlayers", p.total_wins AS "totalWins",
			p.current_page AS page, p.total_pages AS "totalPages", p.leader_wins AS "leaderWins",
			(SELECT count(DISTINCT game_id)::int FROM filtered) AS "totalGames",
			(SELECT max(finished_at) FROM filtered) AS "lastFinishedAt",
			(SELECT count(*)::int FROM ranked WHERE rank = 1 AND wins > 0) AS "leaderCount",
			coalesce((SELECT json_agg(winner ORDER BY winner."userId") FROM (
				SELECT user_id AS "userId", nickname FROM ranked
				WHERE rank = 1 AND wins > 0 ORDER BY user_id LIMIT 3
			) winner), '[]'::json) AS leaders
		FROM pagination p
	`;
}
