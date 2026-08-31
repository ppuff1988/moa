CREATE TABLE IF NOT EXISTS game_vote_submissions (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_id INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(round_id, player_id)
);

CREATE INDEX IF NOT EXISTS game_vote_submissions_game_round_idx
ON game_vote_submissions(game_id, round_id);

CREATE TABLE IF NOT EXISTS artifact_vote_allocations (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES game_vote_submissions(id) ON DELETE CASCADE,
    artifact_id INTEGER NOT NULL REFERENCES game_artifacts(id) ON DELETE CASCADE,
    chip_count INTEGER NOT NULL CHECK (chip_count > 0),
    UNIQUE(submission_id, artifact_id)
);

CREATE INDEX IF NOT EXISTS artifact_vote_allocations_artifact_idx
ON artifact_vote_allocations(artifact_id);
