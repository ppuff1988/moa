-- 修正 sessions 表的 user_id 欄位類型
-- 從 TEXT 改為 INTEGER

-- 1. 先刪除索引（如果存在）
DROP INDEX IF EXISTS sessions_user_id_idx;

-- 2. 刪除現有資料（因為類型不匹配無法轉換）
DELETE FROM sessions;

-- 3. 修改欄位類型
ALTER TABLE sessions ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER;

-- 4. 重新建立索引
CREATE INDEX sessions_user_id_idx ON sessions(user_id);

-- 5. 驗證結果
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

