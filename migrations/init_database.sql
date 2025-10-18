-- ==========================================
-- 古董局中局 - 資料庫初始化腳本
-- ==========================================
-- 此腳本會：
-- 1. 清理所有現有資料表
-- 2. 創建完整的資料庫結構
-- 3. 插入 8 個遊戲角色資料
-- 4. 插入 8 個測試使用者資料
-- ==========================================

-- ==========================================
-- 第一部分：清理現有表
-- ==========================================
DROP TABLE IF EXISTS game_actions CASCADE;
DROP TABLE IF EXISTS game_rounds CASCADE;
DROP TABLE IF EXISTS game_artifacts CASCADE;
DROP TABLE IF EXISTS game_players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 第二部分：創建表結構
-- ==========================================

-- 1. 使用者表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);

-- 2. 遊戲表
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL UNIQUE,
    room_password TEXT NOT NULL,
    host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'selecting', 'playing', 'finished')),
    player_count INTEGER NOT NULL DEFAULT 0 CHECK (player_count >= 0 AND player_count <= 8),
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

CREATE INDEX games_room_name_idx ON games(room_name);
CREATE INDEX games_status_idx ON games(status);
CREATE INDEX games_host_id_idx ON games(host_id);

-- 3. 角色表
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    camp TEXT NOT NULL CHECK (camp IN ('good', 'bad')),
    skill JSONB NOT NULL,
    can_check_artifact BOOLEAN DEFAULT FALSE,
    can_attack BOOLEAN DEFAULT FALSE,
    can_check_people BOOLEAN DEFAULT FALSE,
    can_swap BOOLEAN DEFAULT FALSE,
    can_block BOOLEAN DEFAULT FALSE,
    can_fool BOOLEAN DEFAULT FALSE
);

CREATE INDEX roles_camp_idx ON roles(camp);

-- 4. 遊戲玩家表
CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    color TEXT,
    color_code TEXT,
    is_host BOOLEAN DEFAULT FALSE,
    is_ready BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT TRUE,
    can_action BOOLEAN DEFAULT TRUE,
    blocked_round INTEGER,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, color)
);

CREATE INDEX game_players_game_id_idx ON game_players(game_id);
CREATE INDEX game_players_user_id_idx ON game_players(user_id);
CREATE INDEX game_players_role_id_idx ON game_players(role_id);

-- 5. 遊戲文物表
CREATE TABLE game_artifacts (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL CHECK (round > 0),
    animal TEXT NOT NULL,
    is_genuine BOOLEAN NOT NULL,
    is_swapped BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_fool BOOLEAN DEFAULT FALSE,
    votes INTEGER DEFAULT 0 CHECK (votes >= 0),
    vote_rank INTEGER
);

CREATE INDEX game_artifacts_game_id_idx ON game_artifacts(game_id);
CREATE INDEX game_artifacts_round_idx ON game_artifacts(game_id, round);

-- 6. 遊戲回合表
CREATE TABLE game_rounds (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL CHECK (round > 0),
    phase TEXT NOT NULL CHECK (phase IN ('action', 'discussion', 'voting', 'result', 'identification', 'completed')),
    action_order JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(game_id, round)
);

CREATE INDEX game_rounds_game_id_idx ON game_rounds(game_id);
CREATE INDEX game_rounds_phase_idx ON game_rounds(game_id, phase);

-- 7. 遊戲行動表
CREATE TABLE game_actions (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_id INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    ordering INTEGER NOT NULL CHECK (ordering >= 0),
    action_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX game_actions_round_order_idx ON game_actions(round_id, ordering);
CREATE INDEX game_actions_player_idx ON game_actions(player_id);
CREATE INDEX game_actions_game_id_idx ON game_actions(game_id);

-- 8. 鑑人階段投票記錄
CREATE TABLE identification_votes (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    voted_lao_chao_feng INTEGER REFERENCES game_players(id) ON DELETE SET NULL,
    voted_xu_yuan INTEGER REFERENCES game_players(id) ON DELETE SET NULL,
    voted_fang_zhen INTEGER REFERENCES game_players(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, player_id)
);

CREATE INDEX identification_votes_game_id_idx ON identification_votes(game_id);
CREATE INDEX identification_votes_player_id_idx ON identification_votes(player_id);

-- ==========================================
-- 第三部分：插入遊戲角色資料
-- ==========================================

INSERT INTO roles (name, camp, skill, can_check_artifact, can_swap, can_check_people, can_attack, can_block, can_fool) VALUES
('許愿', 'good', '{"checkArtifact": 2}'::jsonb, true, false, false, false, false, false),
('方震', 'good', '{"checkPeople": 1}'::jsonb, false, false, true, false, false, true),
('黃煙煙', 'good', '{"checkArtifact": 1}'::jsonb, true, false, false, false, false, true),
('木戶加奈', 'good', '{"checkArtifact": 1}'::jsonb, true, false, false, false, false, true),
('老朝奉', 'bad', '{"checkArtifact": 1, "swap": 1}'::jsonb, true, true, false, false, false, false),
('藥不然', 'bad', '{"checkArtifact": 1, "attack": 1}'::jsonb, true, false, false, true, false, false),
('鄭國渠', 'bad', '{"checkArtifact": 1, "block": 1}'::jsonb, true, false, false, false, true, false),
('姬云浮', 'good', '{"checkArtifact": 1}'::jsonb, true, false, false, false, false, false);

-- ==========================================
-- 驗證資料
-- ==========================================
SELECT 'Database initialized successfully!' as status;
SELECT '總共 ' || COUNT(*) || ' 個角色已創建' as roles_status FROM roles;
SELECT id, name, camp FROM roles ORDER BY camp, id;

-- ==========================================
-- 測試使用者資料
-- ==========================================
-- 測試使用者已移至獨立檔案：migrations/init_test_users.sql
-- 僅在開發/測試環境執行該檔案
-- 生產環境請勿執行
