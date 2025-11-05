-- 將 users 表的 password_hash 欄位改為可選（允許 NULL）
-- 這樣 OAuth 登入的用戶就不需要密碼了

ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- 更新註釋
COMMENT ON COLUMN users.password_hash IS 'Password hash for email/password login. NULL for OAuth users.';
