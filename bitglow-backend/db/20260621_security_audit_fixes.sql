-- BitGlow security audit fixes
-- Date: 2026-06-21

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS sid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_sessions_sid ON user_sessions(sid);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked ON user_sessions(user_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, friend_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_author ON posts(visibility, author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_live_msg_created ON live_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_msg_created ON dm_messages(created_at DESC);
