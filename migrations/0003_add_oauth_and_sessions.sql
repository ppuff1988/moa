-- 將 users 表的 password_hash 改為可選
DO $$
BEGIN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        -- Column is already nullable or doesn't exist, ignore
        NULL;
END $$;

-- 建立 oauth_accounts 表
CREATE TABLE IF NOT EXISTS oauth_accounts (
    provider_id TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider_id, provider_user_id)
);

-- 建立 sessions 表
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 為 sessions 表建立索引以加快查詢
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

