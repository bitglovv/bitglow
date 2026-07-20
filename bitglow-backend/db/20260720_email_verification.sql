-- BitGlow email verification for signup
-- Date: 2026-07-20

-- Add email_verified column to users (existing users are grandfathered in as verified)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Mark all existing users as verified so they aren't locked out
UPDATE users SET email_verified = true WHERE email_verified = false;

-- Table for signup email verification tokens (mirrors password_reset_tokens pattern)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
  ON email_verification_tokens(token_hash);
