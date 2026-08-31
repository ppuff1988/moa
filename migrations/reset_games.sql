-- ==========================================
-- 遊戲數據重置腳本
-- ==========================================
-- 此腳本會：
-- 1. 刪除所有遊戲相關數據
-- 2. 保留使用者帳號
-- 3. 保留角色設定
-- ==========================================
-- ⚠️ 警告：此操作會清空所有遊戲記錄且無法復原！
-- 使用前請確認是否需要備份數據
-- ==========================================

-- 任一 SQL 失敗時立即停止，讓 transaction 自動回滾
\set ON_ERROR_STOP on

-- 開始事務
BEGIN;

-- 顯示清理前的統計
SELECT '清理前統計：' as info;
SELECT 
    (SELECT COUNT(*) FROM games) as games_count,
    (SELECT COUNT(*) FROM game_players) as players_count,
    (SELECT COUNT(*) FROM game_rounds) as rounds_count,
    (SELECT COUNT(*) FROM game_actions) as actions_count,
    (SELECT COUNT(*) FROM game_artifacts) as artifacts_count,
    (SELECT COUNT(*) FROM identification_votes) as votes_count;

-- 清空遊戲相關表（由於有 CASCADE，順序會自動處理）
-- 但為了明確性，我們按依賴順序刪除

-- 1. 刪除遊戲行動記錄
DELETE FROM game_actions;

-- 2. 刪除鑑人階段投票記錄
DELETE FROM identification_votes;

-- 3. 刪除遊戲回合記錄
DELETE FROM game_rounds;

-- 4. 刪除遊戲文物記錄
DELETE FROM game_artifacts;

-- 5. 刪除遊戲玩家記錄
DELETE FROM game_players;

-- 6. 刪除遊戲記錄
DELETE FROM games;

-- 重置序列（如果需要從 1 開始）
-- ALTER SEQUENCE game_actions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE game_players_id_seq RESTART WITH 1;
-- ALTER SEQUENCE game_rounds_id_seq RESTART WITH 1;
-- ALTER SEQUENCE game_artifacts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE identification_votes_id_seq RESTART WITH 1;

-- 顯示清理後的統計
SELECT '清理後統計：' as info;
SELECT 
    (SELECT COUNT(*) FROM games) as games_count,
    (SELECT COUNT(*) FROM game_players) as players_count,
    (SELECT COUNT(*) FROM game_rounds) as rounds_count,
    (SELECT COUNT(*) FROM game_actions) as actions_count,
    (SELECT COUNT(*) FROM game_artifacts) as artifacts_count,
    (SELECT COUNT(*) FROM identification_votes) as votes_count;

-- 顯示保留的數據統計
SELECT '保留的數據：' as info;
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM roles) as roles_count;

-- 提交事務
COMMIT;

SELECT '✅ 遊戲數據重置完成！' as status;
SELECT '📊 使用者和角色數據已保留' as note;

-- ==========================================
-- 使用方式
-- ==========================================
-- 開發環境：
--   psql -d moa_db -U moa_user < migrations/reset_games.sql
--
-- Docker 環境：
--   docker exec -i moa_postgres psql -U moa_user -d moa_db < migrations/reset_games.sql
--
-- 生產環境（謹慎使用）：
--   1. 先備份數據庫
--   2. docker exec -i moa_postgres_prod psql -U <user> -d <db> < migrations/reset_games.sql
-- ==========================================
