-- Fix email verification: use single table approach
-- Date: 2026-07-21

-- Add verification token columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token);

-- Drop the old table if it exists
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
