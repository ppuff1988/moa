-- Migration: 0002_add_attacked_rounds_to_game_players
-- Date: 2025-10-24

-- Add attacked_rounds column to game_players table to track which rounds a player was attacked
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS attacked_rounds INTEGER[] DEFAULT '{}';

-- Add comment to document the column purpose
COMMENT ON COLUMN game_players.attacked_rounds IS '記錄玩家在哪些回合被攻擊（存儲回合數的陣列）';

