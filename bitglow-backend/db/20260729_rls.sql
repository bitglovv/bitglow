-- BitGlow production Row Level Security
-- Date: 2026-07-29
--
-- Design:
-- - Fastify remains the privileged application API through its direct pg connection.
-- - Supabase anon/authenticated roles get least-privilege access only where useful.
-- - Sensitive authentication, recovery, audit, and moderation tables stay backend-only.
-- - RLS is enabled on every public application table. It is not forced, so table owners
--   and Supabase service_role/backend roles can continue operational work.

CREATE SCHEMA IF NOT EXISTS bitglow_private;

CREATE OR REPLACE FUNCTION bitglow_private.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION bitglow_private.is_backend_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user NOT IN ('anon', 'authenticated')
$$;

CREATE OR REPLACE FUNCTION bitglow_private.is_active_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = target_user_id
      AND COALESCE(u.is_deleted, false) = false
      AND COALESCE(u.is_banned, false) = false
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.is_blocked_between(left_user_id uuid, right_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM friends f
    WHERE left_user_id IS NOT NULL
      AND right_user_id IS NOT NULL
      AND (
        (f.user_id = left_user_id AND f.friend_id = right_user_id)
        OR (f.user_id = right_user_id AND f.friend_id = left_user_id)
      )
      AND f.status = 'blocked'
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.is_muted_by(viewer_id uuid, actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM muted_users m
    WHERE m.user_id = viewer_id
      AND m.muted_id = actor_id
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.is_mutual_friend(left_user_id uuid, right_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM friends f1
    JOIN friends f2
      ON f2.user_id = right_user_id
     AND f2.friend_id = left_user_id
     AND f2.status = 'accepted'
    WHERE f1.user_id = left_user_id
      AND f1.friend_id = right_user_id
      AND f1.status = 'accepted'
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.can_view_post(viewer_id uuid, post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM posts p
    JOIN users author ON author.id = p.author_id
    WHERE p.id = post_id
      AND COALESCE(author.is_deleted, false) = false
      AND COALESCE(author.is_banned, false) = false
      AND NOT bitglow_private.is_blocked_between(viewer_id, p.author_id)
      AND (viewer_id = p.author_id OR NOT bitglow_private.is_muted_by(viewer_id, p.author_id))
      AND (
        p.visibility = 'public'
        OR viewer_id = p.author_id
        OR bitglow_private.is_mutual_friend(viewer_id, p.author_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.can_access_dm_conversation(viewer_id uuid, conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dm_conversations c
    WHERE c.id = conversation_id
      AND viewer_id IN (c.user_a, c.user_b)
      AND NOT bitglow_private.is_blocked_between(c.user_a, c.user_b)
  )
$$;

CREATE OR REPLACE FUNCTION bitglow_private.can_access_live_room(viewer_id uuid, room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM live_rooms r
    JOIN users owner_user ON owner_user.id = r.created_by
    WHERE r.id = room_id
      AND COALESCE(owner_user.is_deleted, false) = false
      AND COALESCE(owner_user.is_banned, false) = false
      AND NOT bitglow_private.is_blocked_between(viewer_id, r.created_by)
      AND (viewer_id = r.created_by OR NOT bitglow_private.is_muted_by(viewer_id, r.created_by))
      AND (
        viewer_id = r.created_by
        OR bitglow_private.is_mutual_friend(viewer_id, r.created_by)
      )
  )
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'user_sessions',
    'security_logs',
    'password_reset_tokens',
    'email_change_tokens',
    'account_restoration_otps',
    'action_verifications',
    'user_reports',
    'friends',
    'muted_users',
    'posts',
    'post_likes',
    'post_saves',
    'post_comments',
    'post_comment_likes',
    'dm_conversations',
    'dm_messages',
    'live_rooms',
    'live_room_members',
    'live_messages'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS backend_all ON public.%I', table_name);
      EXECUTE format(
        'CREATE POLICY backend_all ON public.%I FOR ALL TO public USING (bitglow_private.is_backend_role()) WITH CHECK (bitglow_private.is_backend_role())',
        table_name
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- users: Supabase may expose non-sensitive profile columns. Passwords, email,
-- verification tokens, deletion metadata, and role flags remain ungranted.
GRANT SELECT (
  id, username, display_name, avatar_url, website, location, bio,
  followers_count, follows_count, is_verified, is_private,
  online_status_visible, created_at, updated_at
) ON users TO anon, authenticated;
GRANT UPDATE (
  username, display_name, avatar_url, website, location, bio,
  is_private, online_status_visible, updated_at
) ON users TO authenticated;

DROP POLICY IF EXISTS users_select_public_profiles ON users;
CREATE POLICY users_select_public_profiles ON users
FOR SELECT TO anon, authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND COALESCE(is_banned, false) = false
  AND (
    bitglow_private.current_user_id() IS NULL
    OR id = bitglow_private.current_user_id()
    OR NOT bitglow_private.is_blocked_between(bitglow_private.current_user_id(), id)
  )
);

DROP POLICY IF EXISTS users_update_self_profile ON users;
CREATE POLICY users_update_self_profile ON users
FOR UPDATE TO authenticated
USING (id = bitglow_private.current_user_id())
WITH CHECK (id = bitglow_private.current_user_id());

-- friends: exposed so clients can display/fetch follow graph and requests.
-- A user may only create or remove their own outgoing relationship row.
GRANT SELECT, INSERT, UPDATE, DELETE ON friends TO authenticated;

DROP POLICY IF EXISTS friends_select_involved ON friends;
CREATE POLICY friends_select_involved ON friends
FOR SELECT TO authenticated
USING (
  user_id = bitglow_private.current_user_id()
  OR friend_id = bitglow_private.current_user_id()
);

DROP POLICY IF EXISTS friends_insert_own_outgoing ON friends;
CREATE POLICY friends_insert_own_outgoing ON friends
FOR INSERT TO authenticated
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND user_id <> friend_id
  AND NOT bitglow_private.is_blocked_between(user_id, friend_id)
);

DROP POLICY IF EXISTS friends_update_involved ON friends;
CREATE POLICY friends_update_involved ON friends
FOR UPDATE TO authenticated
USING (
  user_id = bitglow_private.current_user_id()
  OR friend_id = bitglow_private.current_user_id()
)
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  OR friend_id = bitglow_private.current_user_id()
);

DROP POLICY IF EXISTS friends_delete_own_or_incoming ON friends;
CREATE POLICY friends_delete_own_or_incoming ON friends
FOR DELETE TO authenticated
USING (
  user_id = bitglow_private.current_user_id()
  OR friend_id = bitglow_private.current_user_id()
);

-- muted_users: private per-user preference. Muting does not remove follows/friends.
GRANT SELECT, INSERT, DELETE ON muted_users TO authenticated;

DROP POLICY IF EXISTS muted_users_manage_self ON muted_users;
CREATE POLICY muted_users_manage_self ON muted_users
FOR ALL TO authenticated
USING (user_id = bitglow_private.current_user_id())
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND user_id <> muted_id
);

-- posts: expose public/friend posts only when existing relationship rules allow it.
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO authenticated;
GRANT SELECT ON posts TO anon;

DROP POLICY IF EXISTS posts_select_visible ON posts;
CREATE POLICY posts_select_visible ON posts
FOR SELECT TO anon, authenticated
USING (
  COALESCE((SELECT u.is_deleted FROM users u WHERE u.id = author_id), false) = false
  AND COALESCE((SELECT u.is_banned FROM users u WHERE u.id = author_id), false) = false
  AND (
    visibility = 'public'
    OR author_id = bitglow_private.current_user_id()
    OR bitglow_private.is_mutual_friend(bitglow_private.current_user_id(), author_id)
  )
  AND (
    bitglow_private.current_user_id() IS NULL
    OR NOT bitglow_private.is_blocked_between(bitglow_private.current_user_id(), author_id)
  )
  AND (
    bitglow_private.current_user_id() IS NULL
    OR author_id = bitglow_private.current_user_id()
    OR NOT bitglow_private.is_muted_by(bitglow_private.current_user_id(), author_id)
  )
);

DROP POLICY IF EXISTS posts_insert_own ON posts;
CREATE POLICY posts_insert_own ON posts
FOR INSERT TO authenticated
WITH CHECK (author_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS posts_update_own ON posts;
CREATE POLICY posts_update_own ON posts
FOR UPDATE TO authenticated
USING (author_id = bitglow_private.current_user_id())
WITH CHECK (author_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS posts_delete_own ON posts;
CREATE POLICY posts_delete_own ON posts
FOR DELETE TO authenticated
USING (author_id = bitglow_private.current_user_id());

-- post_likes/post_saves: expose only rows attached to visible posts.
GRANT SELECT, INSERT, DELETE ON post_likes, post_saves TO authenticated;
GRANT SELECT ON post_likes, post_saves TO anon;

DROP POLICY IF EXISTS post_likes_select_visible ON post_likes;
CREATE POLICY post_likes_select_visible ON post_likes
FOR SELECT TO anon, authenticated
USING (bitglow_private.can_view_post(COALESCE(bitglow_private.current_user_id(), user_id), post_id));

DROP POLICY IF EXISTS post_likes_manage_self ON post_likes;
CREATE POLICY post_likes_manage_self ON post_likes
FOR ALL TO authenticated
USING (user_id = bitglow_private.current_user_id())
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND bitglow_private.can_view_post(bitglow_private.current_user_id(), post_id)
);

DROP POLICY IF EXISTS post_saves_select_self ON post_saves;
CREATE POLICY post_saves_select_self ON post_saves
FOR SELECT TO authenticated
USING (user_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS post_saves_manage_self ON post_saves;
CREATE POLICY post_saves_manage_self ON post_saves
FOR ALL TO authenticated
USING (user_id = bitglow_private.current_user_id())
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND bitglow_private.can_view_post(bitglow_private.current_user_id(), post_id)
);

-- comments and comment likes: readable when the parent post is readable.
GRANT SELECT, INSERT, UPDATE, DELETE ON post_comments TO authenticated;
GRANT SELECT ON post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON post_comment_likes TO authenticated;
GRANT SELECT ON post_comment_likes TO anon;

DROP POLICY IF EXISTS post_comments_select_visible ON post_comments;
CREATE POLICY post_comments_select_visible ON post_comments
FOR SELECT TO anon, authenticated
USING (bitglow_private.can_view_post(COALESCE(bitglow_private.current_user_id(), author_id), post_id));

DROP POLICY IF EXISTS post_comments_insert_own_visible ON post_comments;
CREATE POLICY post_comments_insert_own_visible ON post_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = bitglow_private.current_user_id()
  AND bitglow_private.can_view_post(bitglow_private.current_user_id(), post_id)
);

DROP POLICY IF EXISTS post_comments_update_own ON post_comments;
CREATE POLICY post_comments_update_own ON post_comments
FOR UPDATE TO authenticated
USING (author_id = bitglow_private.current_user_id())
WITH CHECK (author_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS post_comments_delete_own ON post_comments;
CREATE POLICY post_comments_delete_own ON post_comments
FOR DELETE TO authenticated
USING (author_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS post_comment_likes_select_visible ON post_comment_likes;
CREATE POLICY post_comment_likes_select_visible ON post_comment_likes
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM post_comments c
    WHERE c.id = comment_id
      AND bitglow_private.can_view_post(COALESCE(bitglow_private.current_user_id(), user_id), c.post_id)
  )
);

DROP POLICY IF EXISTS post_comment_likes_manage_self ON post_comment_likes;
CREATE POLICY post_comment_likes_manage_self ON post_comment_likes
FOR ALL TO authenticated
USING (user_id = bitglow_private.current_user_id())
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND EXISTS (
    SELECT 1 FROM post_comments c
    WHERE c.id = comment_id
      AND bitglow_private.can_view_post(bitglow_private.current_user_id(), c.post_id)
  )
);

-- DMs: only participants can see or mutate conversations/messages, and blocked
-- relationships are denied. Muted users may still message; alert suppression is app logic.
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_conversations, dm_messages TO authenticated;

DROP POLICY IF EXISTS dm_conversations_select_participant ON dm_conversations;
CREATE POLICY dm_conversations_select_participant ON dm_conversations
FOR SELECT TO authenticated
USING (
  bitglow_private.current_user_id() IN (user_a, user_b)
  AND NOT bitglow_private.is_blocked_between(user_a, user_b)
);

DROP POLICY IF EXISTS dm_conversations_insert_participant ON dm_conversations;
CREATE POLICY dm_conversations_insert_participant ON dm_conversations
FOR INSERT TO authenticated
WITH CHECK (
  bitglow_private.current_user_id() IN (user_a, user_b)
  AND user_a <> user_b
  AND NOT bitglow_private.is_blocked_between(user_a, user_b)
);

DROP POLICY IF EXISTS dm_conversations_update_participant ON dm_conversations;
CREATE POLICY dm_conversations_update_participant ON dm_conversations
FOR UPDATE TO authenticated
USING (bitglow_private.current_user_id() IN (user_a, user_b))
WITH CHECK (bitglow_private.current_user_id() IN (user_a, user_b));

DROP POLICY IF EXISTS dm_conversations_delete_participant ON dm_conversations;
CREATE POLICY dm_conversations_delete_participant ON dm_conversations
FOR DELETE TO authenticated
USING (bitglow_private.current_user_id() IN (user_a, user_b));

DROP POLICY IF EXISTS dm_messages_select_participant ON dm_messages;
CREATE POLICY dm_messages_select_participant ON dm_messages
FOR SELECT TO authenticated
USING (bitglow_private.can_access_dm_conversation(bitglow_private.current_user_id(), conversation_id));

DROP POLICY IF EXISTS dm_messages_insert_participant ON dm_messages;
CREATE POLICY dm_messages_insert_participant ON dm_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = bitglow_private.current_user_id()
  AND bitglow_private.can_access_dm_conversation(bitglow_private.current_user_id(), conversation_id)
);

DROP POLICY IF EXISTS dm_messages_update_sender_recent ON dm_messages;
CREATE POLICY dm_messages_update_sender_recent ON dm_messages
FOR UPDATE TO authenticated
USING (
  sender_id = bitglow_private.current_user_id()
  AND created_at >= now() - interval '5 minutes'
)
WITH CHECK (sender_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS dm_messages_delete_sender ON dm_messages;
CREATE POLICY dm_messages_delete_sender ON dm_messages
FOR DELETE TO authenticated
USING (sender_id = bitglow_private.current_user_id());

-- Live chat: rooms are readable by owner or mutual friends, excluding blocked/muted.
GRANT SELECT, INSERT, DELETE ON live_rooms, live_room_members, live_messages TO authenticated;

DROP POLICY IF EXISTS live_rooms_select_accessible ON live_rooms;
CREATE POLICY live_rooms_select_accessible ON live_rooms
FOR SELECT TO authenticated
USING (bitglow_private.can_access_live_room(bitglow_private.current_user_id(), id));

DROP POLICY IF EXISTS live_rooms_insert_own ON live_rooms;
CREATE POLICY live_rooms_insert_own ON live_rooms
FOR INSERT TO authenticated
WITH CHECK (created_by = bitglow_private.current_user_id());

DROP POLICY IF EXISTS live_rooms_delete_own ON live_rooms;
CREATE POLICY live_rooms_delete_own ON live_rooms
FOR DELETE TO authenticated
USING (created_by = bitglow_private.current_user_id());

DROP POLICY IF EXISTS live_room_members_select_accessible ON live_room_members;
CREATE POLICY live_room_members_select_accessible ON live_room_members
FOR SELECT TO authenticated
USING (bitglow_private.can_access_live_room(bitglow_private.current_user_id(), room_id));

DROP POLICY IF EXISTS live_room_members_insert_self_accessible ON live_room_members;
CREATE POLICY live_room_members_insert_self_accessible ON live_room_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = bitglow_private.current_user_id()
  AND bitglow_private.can_access_live_room(bitglow_private.current_user_id(), room_id)
);

DROP POLICY IF EXISTS live_room_members_delete_self ON live_room_members;
CREATE POLICY live_room_members_delete_self ON live_room_members
FOR DELETE TO authenticated
USING (user_id = bitglow_private.current_user_id());

DROP POLICY IF EXISTS live_messages_select_accessible ON live_messages;
CREATE POLICY live_messages_select_accessible ON live_messages
FOR SELECT TO authenticated
USING (bitglow_private.can_access_live_room(bitglow_private.current_user_id(), room_id));

DROP POLICY IF EXISTS live_messages_insert_sender_accessible ON live_messages;
CREATE POLICY live_messages_insert_sender_accessible ON live_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = bitglow_private.current_user_id()
  AND bitglow_private.can_access_live_room(bitglow_private.current_user_id(), room_id)
);

DROP POLICY IF EXISTS live_messages_delete_sender ON live_messages;
CREATE POLICY live_messages_delete_sender ON live_messages
FOR DELETE TO authenticated
USING (sender_id = bitglow_private.current_user_id());

-- Reports: authenticated clients can submit reports, but reading/moderation is backend-only.
GRANT INSERT ON user_reports TO authenticated;

DROP POLICY IF EXISTS user_reports_insert_authenticated ON user_reports;
CREATE POLICY user_reports_insert_authenticated ON user_reports
FOR INSERT TO authenticated
WITH CHECK (
  reported_by = bitglow_private.current_user_id()
  AND reported_user <> reported_by
);

-- Backend-only tables: user_sessions, security_logs, password_reset_tokens,
-- email_change_tokens, account_restoration_otps, and action_verifications have
-- only backend_all. No anon/authenticated grants or policies are added.

