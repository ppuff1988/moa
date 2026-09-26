-- 私人陣營判斷隨每輪筆記儲存；舊筆記預設為未判斷。
-- 先套用 schema 再啟動新版服務，舊版服務可繼續讀寫其他筆記欄位。
ALTER TABLE game_discussion_notes
    ADD COLUMN IF NOT EXISTS alignment text NOT NULL DEFAULT 'unknown'
    CONSTRAINT discussion_notes_alignment_check CHECK (alignment IN ('good', 'unknown', 'bad'));
