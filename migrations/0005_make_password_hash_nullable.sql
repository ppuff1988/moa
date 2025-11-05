-- 將 users 表的 password_hash 欄位改為可選（允許 NULL）
-- 這樣 OAuth 登入的用戶就不需要密碼了

DO $$
BEGIN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        -- Column is already nullable or doesn't exist, ignore
        NULL;
END $$;

-- 更新註釋
COMMENT ON COLUMN users.password_hash IS 'Password hash for email/password login. NULL for OAuth users.';
