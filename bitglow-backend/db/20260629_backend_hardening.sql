-- BitGlow backend hardening
-- Date: 2026-06-29

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash
  ON user_sessions(refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_expires_at
  ON user_sessions(refresh_expires_at);

CREATE INDEX IF NOT EXISTS idx_dm_msg_conversation_created
  ON dm_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON post_comments(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_login_identifier
  ON security_logs ((details->>'identifier'), created_at DESC)
  WHERE event_type IN ('login_failure', 'login_lockout');

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user);

ALTER TABLE friends
  DROP CONSTRAINT IF EXISTS friends_no_self_relationship;
ALTER TABLE friends
  ADD CONSTRAINT friends_no_self_relationship CHECK (user_id <> friend_id) NOT VALID;
ALTER TABLE friends
  VALIDATE CONSTRAINT friends_no_self_relationship;

ALTER TABLE dm_conversations
  DROP CONSTRAINT IF EXISTS dm_conversations_distinct_users;
ALTER TABLE dm_conversations
  ADD CONSTRAINT dm_conversations_distinct_users CHECK (user_a <> user_b) NOT VALID;
ALTER TABLE dm_conversations
  VALIDATE CONSTRAINT dm_conversations_distinct_users;
