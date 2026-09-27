ALTER TABLE games ADD COLUMN IF NOT EXISTS seating_mode text NOT NULL DEFAULT 'random'
    CHECK (seating_mode IN ('random', 'manual'));
ALTER TABLE games ADD COLUMN IF NOT EXISTS seat_order json;

CREATE TABLE IF NOT EXISTS game_discussion_notes (
    id serial PRIMARY KEY,
    game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_id integer NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    owner_player_id integer NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    subject_player_id integer NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    artifact_claims json NOT NULL DEFAULT '{}',
    claimed_attacked boolean NOT NULL DEFAULT false,
    memo text NOT NULL DEFAULT '' CHECK (length(memo) <= 500),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS discussion_notes_owner_subject_round_idx
    ON game_discussion_notes(round_id, owner_player_id, subject_player_id);
