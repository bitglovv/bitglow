-- =====================================================
-- BitGlow Active Database Schema
-- PostgreSQL
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  website TEXT,
  location TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  online_status_visible BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_expires_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  scheduled_deletion_at TIMESTAMPTZ,
  deletion_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_scheduled_deletion ON users(scheduled_deletion_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sid TEXT UNIQUE,
  token_hash TEXT UNIQUE NOT NULL,
  refresh_token_hash TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_sid ON user_sessions(sid);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_expires_at ON user_sessions(refresh_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked ON user_sessions(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friends (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, friend_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, user_id, status);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public','friends')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_author ON posts(visibility, author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_saves (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_comment_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a <> user_b)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'post', 'profile')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES users(id) ON DELETE SET NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_room_members (
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_msg_created ON dm_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_msg_created ON live_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS action_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(64) NOT NULL,
  method VARCHAR(32) NOT NULL DEFAULT 'email',
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_verif_user_type ON action_verifications(user_id, verification_type);
