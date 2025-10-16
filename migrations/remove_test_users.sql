-- ==========================================
-- 移除測試使用者腳本
-- ==========================================
-- 此腳本會刪除所有測試使用者帳號
-- 適用於將開發環境數據移轉到生產環境前清理
-- ==========================================
-- ⚠️ 警告：此操作會刪除測試帳號及其相關的遊戲記錄！
-- ==========================================

-- 開始事務
BEGIN;

-- 顯示刪除前的統計
SELECT '刪除前統計：' as info;
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email LIKE '%@a.com' OR email LIKE '%@b.com' OR email LIKE '%@c.com' 
                      OR email LIKE '%@d.com' OR email LIKE '%@e.com' OR email LIKE '%@f.com'
                      OR email LIKE '%@g.com' OR email LIKE '%@h.com') as test_users
FROM users;

-- 顯示即將刪除的測試使用者
SELECT '即將刪除的測試使用者：' as info;
SELECT id, email, nickname, created_at 
FROM users 
WHERE email IN (
    'a@a.com',
    'b@b.com',
    'c@c.com',
    'd@d.com',
    'e@e.com',
    'f@f.com',
    'g@g.com',
    'h@h.com'
)
ORDER BY id;

-- 刪除測試使用者
-- 由於 foreign key 有 ON DELETE CASCADE，相關的遊戲記錄也會被刪除
DELETE FROM users 
WHERE email IN (
    'a@a.com',    -- 許愿
    'b@b.com',    -- 方震
    'c@c.com',    -- 黃煙煙
    'd@d.com',    -- 木戶加奈
    'e@e.com',    -- 老朝奉
    'f@f.com',    -- 藥不然
    'g@g.com',    -- 鄭國渠
    'h@h.com'     -- 姬云浮
);

-- 顯示刪除後的統計
SELECT '刪除後統計：' as info;
SELECT 
    COUNT(*) as remaining_users
FROM users;

-- 提交事務
COMMIT;

SELECT '✅ 測試使用者已移除！' as status;
SELECT '📊 剩餘使用者數：' || COUNT(*) as remaining FROM users;

-- ==========================================
-- 使用方式
-- ==========================================
-- 開發環境（Docker）：
--   Get-Content migrations\remove_test_users.sql | docker exec -i moa_postgres psql -U moa_user -d moa_db
--
-- 生產環境（謹慎使用）：
--   Get-Content migrations\remove_test_users.sql | docker exec -i moa_postgres_prod psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
--
-- 本地 PostgreSQL：
--   psql -d moa_db -U moa_user -f migrations/remove_test_users.sql
-- ==========================================

-- ==========================================
-- 測試使用者信箱列表
-- ==========================================
-- a@a.com （許愿）
-- b@b.com （方震）
-- c@c.com （黃煙煙）
-- d@d.com （木戶加奈）
-- e@e.com （老朝奉）
-- f@f.com （藥不然）
-- g@g.com （鄭國渠）
-- h@h.com （姬云浮）
-- ==========================================
