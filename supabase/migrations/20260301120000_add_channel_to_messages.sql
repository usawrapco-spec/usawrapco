-- Add channel column to messages table for 3-way messaging system
-- channel values: 'internal' | 'customer' | 'threeway'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'internal';
