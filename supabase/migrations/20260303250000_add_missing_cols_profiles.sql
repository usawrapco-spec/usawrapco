-- Add missing columns to profiles table
-- Leaderboard page selects weekly_xp but it didn't exist in DB
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_xp integer DEFAULT 0;
