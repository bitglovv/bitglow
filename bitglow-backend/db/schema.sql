-- =====================================================
-- BitGlow Database Schema
-- PostgreSQL
-- Senior-level, scalable, production-ready
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS user_reports;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS user_presence;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS dm_threads;
DROP TABLE IF EXISTS chat_room_members;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & AUTH
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(64) NOT NULL,

  password_hash TEXT NOT NULL,

  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location TEXT,

  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,

  role VARCHAR(20) DEFAULT 'user', -- user | admin | moderator
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- USER SESSIONS (JWT / LOGIN TRACKING)
-- =====================================================
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

-- =====================================================
-- CHAT ROOMS (LIVE / GROUP CHAT)
-- =====================================================
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- CHAT ROOM MEMBERS
-- =====================================================
CREATE TABLE chat_room_members (
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role VARCHAR(20) DEFAULT 'member', -- admin | moderator | member
  joined_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (room_id, user_id)
);

-- =====================================================
-- DIRECT MESSAGE THREADS (1-TO-1)
-- =====================================================
CREATE TABLE dm_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_one UUID REFERENCES users(id) ON DELETE CASCADE,
  user_two UUID REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT now(),

  UNIQUE (user_one, user_two),
  CHECK (user_one <> user_two)
);

-- =====================================================
-- MESSAGES (ROOM + DM)
-- =====================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,

  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  dm_thread_id UUID REFERENCES dm_threads(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text | image | system

  created_at TIMESTAMP DEFAULT now(),
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,

  CHECK (
    (room_id IS NOT NULL AND dm_thread_id IS NULL)
    OR
    (room_id IS NULL AND dm_thread_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_room ON messages(room_id);
CREATE INDEX idx_messages_dm ON messages(dm_thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- =====================================================
-- USER PRESENCE (ONLINE / OFFLINE)
-- =====================================================
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'offline', -- online | away | busy
  last_seen TIMESTAMP DEFAULT now()
);

-- =====================================================
-- FOLLOW / FRIEND SYSTEM
-- =====================================================
CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

-- =====================================================
-- REPORTS & MODERATION
-- =====================================================
CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  reported_user UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE CASCADE,

  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- SOFT DELETE SAFETY (OPTIONAL VIEW)
-- =====================================================
CREATE VIEW active_users AS
SELECT *
FROM users
WHERE deleted_at IS NULL;