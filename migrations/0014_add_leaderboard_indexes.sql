-- Keep the public leaderboard aggregation bounded as game history grows.
-- The partial game index only covers completed games with a recorded score.
CREATE INDEX IF NOT EXISTS games_finished_score_idx
    ON games (finished_at DESC, id)
    WHERE status = 'finished' AND total_score IS NOT NULL;

-- DISTINCT ON (game_id, user_id) uses this order to collapse legacy duplicate rows.
CREATE INDEX IF NOT EXISTS game_players_game_user_id_idx
    ON game_players (game_id, user_id, id DESC);
