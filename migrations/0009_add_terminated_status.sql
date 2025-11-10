
-- 添加 'terminated' 狀態到 games 表的 status 欄位
-- 移除舊的 check constraint 並添加新的包含 'terminated' 的 constraint

-- 1. 刪除舊的 check constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;

-- 2. 添加新的 check constraint，包含 'terminated' 狀態
ALTER TABLE games ADD CONSTRAINT games_status_check
    CHECK (status IN ('waiting', 'selecting', 'playing', 'finished', 'terminated'));

-- 確認修改
SELECT 'games status constraint updated to include terminated' as status;

