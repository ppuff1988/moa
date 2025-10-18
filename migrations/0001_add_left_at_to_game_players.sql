-- Migration: 0002_add_left_at_to_game_players
-- Date: 2025-01-18

-- Add left_at column to game_players table
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS left_at TIMESTAMP NULL;
