-- A round with a following round has already left its result phase.
UPDATE game_rounds AS previous_round
SET
    phase = 'completed',
    completed_at = next_round.started_at
FROM game_rounds AS next_round
WHERE next_round.game_id = previous_round.game_id
  AND next_round.round = previous_round.round + 1
  AND previous_round.phase = 'result';

-- Repair terminal rounds completed by the legacy direct-settlement path.
UPDATE game_rounds AS completed_round
SET completed_at = COALESCE(game_record.finished_at, completed_round.started_at, NOW())
FROM games AS game_record
WHERE game_record.id = completed_round.game_id
  AND completed_round.phase = 'completed'
  AND completed_round.completed_at IS NULL;

-- completed_at represents the end of the whole round, not the action phase.
UPDATE game_rounds
SET completed_at = NULL
WHERE phase <> 'completed'
  AND completed_at IS NOT NULL;
