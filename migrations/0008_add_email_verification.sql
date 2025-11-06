-- 添加 email 驗證相關欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- OAuth 用戶自動標記為已驗證
UPDATE users
SET email_verified = TRUE
WHERE password_hash IS NULL;

-- 建立 token 的索引以加快查詢
CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

