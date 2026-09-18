ALTER TABLE game_players
    ADD COLUMN IF NOT EXISTS room_presence TEXT NOT NULL DEFAULT 'active';

-- Preserve historical departures recorded by the existing left_at column.
UPDATE game_players
SET room_presence = 'left'
WHERE left_at IS NOT NULL
  AND room_presence = 'active';

-- Repair any partial rollout that recorded left without a timestamp.
UPDATE game_players
SET left_at = NOW()
WHERE room_presence = 'left'
  AND left_at IS NULL;

ALTER TABLE game_players
    DROP CONSTRAINT IF EXISTS game_players_room_presence_check;

ALTER TABLE game_players
    ADD CONSTRAINT game_players_room_presence_check
    CHECK (room_presence IN ('active', 'left'));

ALTER TABLE game_players
    DROP CONSTRAINT IF EXISTS game_players_room_presence_consistency_check;

ALTER TABLE game_players
    ADD CONSTRAINT game_players_room_presence_consistency_check
    CHECK (
        (room_presence = 'active' AND left_at IS NULL)
        OR (room_presence = 'left' AND left_at IS NOT NULL)
    );
