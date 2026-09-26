-- 在部署期間修正已無房間成員的未完成遊戲；保留玩家與所有遊戲歷史。
-- runner 會包在 transaction 中；鎖順序與加入／離房／階段轉換一致。
-- 不使用 is_online，避免把暫時斷線或關閉分頁當成離房。
SET LOCAL lock_timeout = '10s';

DO $migration$
DECLARE
    candidate RECORD;
BEGIN
    FOR candidate IN
        SELECT id FROM games
        WHERE status IN ('waiting', 'selecting', 'playing')
        ORDER BY id
        FOR UPDATE
    LOOP
        PERFORM id FROM game_players
        WHERE game_id = candidate.id
        ORDER BY id
        FOR UPDATE;

        IF NOT EXISTS (
            SELECT 1 FROM game_players
            WHERE game_id = candidate.id
              AND room_presence = 'active'
              AND left_at IS NULL
        ) THEN
            UPDATE games
            SET status = 'terminated',
                finished_at = COALESCE(finished_at, NOW()),
                updated_at = NOW()
            WHERE id = candidate.id;
        END IF;
    END LOOP;
END
$migration$;
