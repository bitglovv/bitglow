import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { env } from "../config/env";




export interface LiveMessageRow {
    id: string;
    room_id: string;
    sender_id: string;
    username: string;
    content: string;
    created_at: string | Date;
}

export interface FriendRow {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
}

export interface PostRow {
    id: string;
    content: string;
    title?: string;
    visibility?: string;
    created_at: string | Date;
    author_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    likesCount?: number;
    commentsCount?: number;
    savesCount?: number;
    likedByMe?: boolean | number;
    savedByMe?: boolean | number;
}

export interface CommentRow {
    id: string;
    content: string;
    created_at: string | Date;
    author_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    likesCount?: number;
    likedByMe?: boolean | number;
}

export interface NotificationRow {
    id: string;
    type: string;
    created_at: string | Date;
    is_read: boolean;
    actor_id?: string;
    actor_username?: string;
    actor_display_name?: string;
    actor_avatar_url?: string;
    post_id?: string;
    user_id?: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    content?: string;
    comment_content?: string;
    status?: string;
    is_mutual?: boolean;
}

export interface DMMessageRow {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    type: string;
    created_at: string | Date;
    post_id?: string;
}

export interface SecurityLogRow {
    id: string;
    event_type: string;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    details?: any;
    created_at: string | Date;
    ts?: string | number | Date;
}

const pool = new Pool({
    connectionString: env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false,
    },

    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    max: 20,
});

const BCRYPT_ROUNDS = 12;

const initCoreTables = async () => {
    try {
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await pool.query(`
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
                verification_expires_at TIMESTAMPTZ,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at TIMESTAMPTZ,
                scheduled_deletion_at TIMESTAMPTZ,
                deletion_reason TEXT,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            );

            -- Idempotent column migrations for existing databases
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS online_status_visible BOOLEAN DEFAULT true;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

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
                expires_at TIMESTAMP NOT NULL,
                refresh_expires_at TIMESTAMP,
                revoked_at TIMESTAMP,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS friends (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, friend_id)
            );
            CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
            CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
        `);
    } catch (err) {
        console.error("Failed to ensure core tables", err);
        throw err;
    }
};

// Ensure posts + related tables exist for blogging
const initPostsTable = async () => {
    try {
        // Create posts + related tables
        await pool.query(`
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
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

            CREATE TABLE IF NOT EXISTS post_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

            CREATE TABLE IF NOT EXISTS post_saves (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id);

            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

            CREATE TABLE IF NOT EXISTS post_comment_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, comment_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment ON post_comment_likes(comment_id);
        `);

        // 3. Safe migration: add updated_at only if missing (for existing DBs)
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='updated_at') THEN
                    ALTER TABLE posts ADD COLUMN updated_at TIMESTAMP DEFAULT now();
                END IF;
            END $$;
        `);
    } catch (err) {
        console.error("Failed to ensure posts table", err);
        throw err;
    }
};

const initSecurityTables = async () => {
    try {
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'user_sessions' AND column_name = 'token'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'user_sessions' AND column_name = 'token_hash'
                ) THEN
                    ALTER TABLE user_sessions RENAME COLUMN token TO token_hash;
                END IF;
            END $$;

            -- Safe migration: add columns only if they don't exist
            -- (ADD COLUMN IF NOT EXISTS not supported inside DO $ in older PG)
            ALTER TABLE user_sessions
            ADD COLUMN IF NOT EXISTS sid TEXT UNIQUE,
            ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT UNIQUE,
            ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_sid ON user_sessions(sid);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_expires_at ON user_sessions(refresh_expires_at);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked ON user_sessions(user_id, revoked_at);

            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

            CREATE TABLE IF NOT EXISTS security_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_type TEXT NOT NULL,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                ip_address TEXT,
                user_agent TEXT,
                details JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(event_type);
            CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token_hash);

            CREATE TABLE IF NOT EXISTS email_change_tokens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                new_email TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_email_change_token ON email_change_tokens(token_hash);

            CREATE TABLE IF NOT EXISTS user_reports (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                reported_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
                reason TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user);

            CREATE TABLE IF NOT EXISTS muted_users (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, muted_id)
            );
            CREATE INDEX IF NOT EXISTS idx_muted_users_user ON muted_users(user_id);

            CREATE TABLE IF NOT EXISTS account_restoration_otps (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                otp_code_hash TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_restoration_otps_user ON account_restoration_otps(user_id);

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
        `);
    } catch (err) {
        console.error("Failed to ensure security tables", err);
        throw err;
    }
};

const initDMTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dm_conversations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                UNIQUE(user_a, user_b)
            );
            CREATE INDEX IF NOT EXISTS idx_dm_conv_user_a ON dm_conversations(user_a);
            CREATE INDEX IF NOT EXISTS idx_dm_conv_user_b ON dm_conversations(user_b);

            CREATE TABLE IF NOT EXISTS dm_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                type TEXT DEFAULT 'text' CHECK (type IN ('text', 'post', 'profile')),
                post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
                profile_id UUID REFERENCES users(id) ON DELETE SET NULL,
                read_at TIMESTAMP,
                edited_at TIMESTAMP,
                is_forwarded BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT now()
            );
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_conversations'
                      AND column_name = 'status'
                ) THEN
                    ALTER TABLE dm_conversations ADD COLUMN status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_messages'
                      AND column_name = 'read_at'
                ) THEN
                    ALTER TABLE dm_messages ADD COLUMN read_at TIMESTAMP;
                    UPDATE dm_messages SET read_at = created_at WHERE read_at IS NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_messages'
                      AND column_name = 'edited_at'
                ) THEN
                    ALTER TABLE dm_messages ADD COLUMN edited_at TIMESTAMP;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_messages'
                      AND column_name = 'is_forwarded'
                ) THEN
                    ALTER TABLE dm_messages ADD COLUMN is_forwarded BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_messages'
                      AND column_name = 'type'
                ) THEN
                    ALTER TABLE dm_messages ADD COLUMN type TEXT DEFAULT 'text' CHECK (type IN ('text', 'post', 'profile'));
                    ALTER TABLE dm_messages ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
                    ALTER TABLE dm_messages ADD COLUMN profile_id UUID REFERENCES users(id) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'dm_messages'
                      AND column_name = 'profile_id'
                ) THEN
                    ALTER TABLE dm_messages ADD COLUMN profile_id UUID REFERENCES users(id) ON DELETE SET NULL;
                END IF;

                -- Update CHECK constraint to include 'profile'
                ALTER TABLE dm_messages DROP CONSTRAINT IF EXISTS dm_messages_type_check;
                ALTER TABLE dm_messages ADD CONSTRAINT dm_messages_type_check CHECK (type IN ('text', 'post', 'profile'));
            END $$;
            CREATE INDEX IF NOT EXISTS idx_dm_msg_conv ON dm_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_dm_msg_created ON dm_messages(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_dm_msg_unread ON dm_messages(conversation_id, sender_id, read_at);
        `);
    } catch (err) {
        console.error("Failed to ensure DM tables", err);
        throw err;
    }
};

const initLiveTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS live_rooms (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_live_rooms_owner ON live_rooms(created_by);

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
            CREATE INDEX IF NOT EXISTS idx_live_msg_room ON live_messages(room_id);
            CREATE INDEX IF NOT EXISTS idx_live_msg_created ON live_messages(created_at DESC);
        `);
    } catch (err) {
        console.error("Failed to ensure Live tables", err);
        throw err;
    }
};

// Sequential startup — each step awaits the previous to avoid race conditions
export async function initializeDatabase() {
    await initCoreTables();
    await initPostsTable();
    await initSecurityTables();
    await initDMTables();
    await initLiveTables();
}

type Queryable = Pick<PoolClient, 'query'>;

type LiveRoomRow = {
    id: string;
    owner_id: string;
    created_at: string;
    owner_username: string;
    owner_display_name: string | null;
    owner_avatar_url: string | null;
    last_message_at: string | null;
};

const LIVE_ROOM_LOCK_NAMESPACE = 31_003;

function mapLiveRoom(row: LiveRoomRow | undefined, viewerId?: string) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        ownerId: row.owner_id,
        ownerUsername: row.owner_username,
        ownerDisplayName: row.owner_display_name,
        ownerAvatarUrl: row.owner_avatar_url,
        isMine: viewerId ? row.owner_id === viewerId : false,
        createdAt: row.created_at,
        lastMessageAt: row.last_message_at,
    };
}

async function getCanonicalLiveRoomForOwner(client: Queryable, ownerId: string) {
    const res = await client.query(
        `SELECT r.id,
                r.created_by AS owner_id,
                r.created_at,
                u.username AS owner_username,
                u.display_name AS owner_display_name,
                u.avatar_url AS owner_avatar_url,
                last_message.last_message_at
         FROM live_rooms r
         JOIN users u ON u.id = r.created_by
         LEFT JOIN LATERAL (
            SELECT lm.created_at AS last_message_at
            FROM live_messages lm
            JOIN users lm_u ON lm_u.id = lm.sender_id
            WHERE lm.room_id = r.id
              AND COALESCE(lm_u.is_deleted, FALSE) = FALSE
            ORDER BY lm.created_at DESC
            LIMIT 1
         ) last_message ON true
         WHERE r.created_by = $1
           AND COALESCE(u.is_deleted, FALSE) = FALSE
         ORDER BY r.created_at ASC, r.id ASC
         LIMIT 1`,
        [ownerId]
    );

    return mapLiveRoom(res.rows[0]);
}

async function getCanonicalLiveRoomByRequestedId(client: Queryable, roomId: string) {
    const res = await client.query(
        `SELECT canonical.id,
                canonical.owner_id,
                canonical.created_at,
                canonical.owner_username,
                canonical.owner_display_name,
                canonical.owner_avatar_url,
                canonical.last_message_at,
                canonical.id = target.id AS is_canonical
         FROM live_rooms target
         JOIN users tu ON tu.id = target.created_by
         JOIN LATERAL (
            SELECT r.id,
                   r.created_by AS owner_id,
                   r.created_at,
                   u.username AS owner_username,
                   u.display_name AS owner_display_name,
                   u.avatar_url AS owner_avatar_url,
                   last_message.last_message_at
            FROM live_rooms r
            JOIN users u ON u.id = r.created_by
            LEFT JOIN LATERAL (
                SELECT lm.created_at AS last_message_at
                FROM live_messages lm
                JOIN users lm_u ON lm_u.id = lm.sender_id
                WHERE lm.room_id = r.id
                  AND COALESCE(lm_u.is_deleted, FALSE) = FALSE
                ORDER BY lm.created_at DESC
                LIMIT 1
            ) last_message ON true
            WHERE r.created_by = target.created_by
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY r.created_at ASC, r.id ASC
            LIMIT 1
         ) canonical ON true
         WHERE target.id = $1
           AND COALESCE(tu.is_deleted, FALSE) = FALSE
         LIMIT 1`,
        [roomId]
    );

    const row = res.rows[0];
    if (!row || !row.is_canonical) {
        return null;
    }

    return mapLiveRoom(row);
}

export const db = {
    getClient: async () => pool.connect(),
    query: (text: string, params?: any[]) => pool.query(text, params),

    async healthCheck() {
        await pool.query("SELECT 1");
    },

    async close() {
        await pool.end();
    },

    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, BCRYPT_ROUNDS);
    },

    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    },

    async createSession(input: {
        userId: string;
        sid: string;
        tokenHash: string;
        refreshTokenHash: string;
        ipAddress?: string;
        userAgent?: string;
        expiresAt: Date;
        refreshExpiresAt: Date;
    }) {
        const res = await pool.query(
            `INSERT INTO user_sessions
                (user_id, sid, token_hash, refresh_token_hash, ip_address, user_agent, expires_at, refresh_expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, user_id, sid, ip_address, user_agent, created_at, expires_at, refresh_expires_at`,
            [
                input.userId,
                input.sid,
                input.tokenHash,
                input.refreshTokenHash,
                input.ipAddress || null,
                input.userAgent || null,
                input.expiresAt,
                input.refreshExpiresAt,
            ]
        );
        return res.rows[0];
    },

    async rotateSession(refreshTokenHash: string, newTokenHash: string, newRefreshTokenHash: string, expiresAt: Date, refreshExpiresAt: Date) {
        const res = await pool.query(
            `UPDATE user_sessions
             SET token_hash = $2,
                 refresh_token_hash = $3,
                 expires_at = $4,
                 refresh_expires_at = $5,
                 last_used_at = now()
             WHERE refresh_token_hash = $1
               AND revoked_at IS NULL
               AND refresh_expires_at > now()
             RETURNING id, user_id, sid`,
            [refreshTokenHash, newTokenHash, newRefreshTokenHash, expiresAt, refreshExpiresAt]
        );
        return res.rows[0] || null;
    },

    async getActiveSessionByRefreshToken(refreshTokenHash: string) {
        const res = await pool.query(
            `SELECT id, user_id, sid
             FROM user_sessions
             WHERE refresh_token_hash = $1
               AND revoked_at IS NULL
               AND refresh_expires_at > now()
             LIMIT 1`,
            [refreshTokenHash]
        );
        return res.rows[0] || null;
    },

    async getActiveSessionByToken(tokenHash: string) {
        const res = await pool.query(
            `SELECT id, user_id, sid, token_hash, ip_address, user_agent, created_at, expires_at, revoked_at, last_used_at
             FROM user_sessions
             WHERE token_hash = $1
               AND revoked_at IS NULL
               AND expires_at > now()
             LIMIT 1`,
            [tokenHash]
        );
        return res.rows[0];
    },

    async touchSession(sessionId: string) {
        await pool.query(
            `UPDATE user_sessions
             SET last_used_at = now()
             WHERE id = $1
               AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
            [sessionId]
        );
    },

    async revokeSessionByToken(tokenHash: string) {
        await pool.query(
            `UPDATE user_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
            [tokenHash]
        );
    },

    async revokeSessionsForUser(userId: string, keepSessionId?: string) {
        if (keepSessionId) {
            await pool.query(
                `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
                [userId, keepSessionId]
            );
        } else {
            await pool.query(
                `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
                [userId]
            );
        }
    },

    async pruneUserSessions(userId: string, keepLatest = 5) {
        await pool.query(
            `UPDATE user_sessions
             SET revoked_at = now()
             WHERE user_id = $1
               AND revoked_at IS NULL
               AND id NOT IN (
                   SELECT id
                   FROM user_sessions
                   WHERE user_id = $1
                     AND revoked_at IS NULL
                   ORDER BY created_at DESC
                   LIMIT $2
               )`,
            [userId, keepLatest]
        );
    },

    async insertSecurityLog(input: { eventType: string; userId?: string | null; ipAddress?: string | null; userAgent?: string | null; details?: any; }) {
        await pool.query(
            `INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, details)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [
                input.eventType,
                input.userId || null,
                input.ipAddress || null,
                input.userAgent || null,
                JSON.stringify(input.details || {}),
            ]
        );
    },

    async countSecurityEvents(eventType: string, identifier: string, since: Date) {
        const res = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM security_logs
             WHERE event_type = $1
               AND details->>'identifier' = $2
               AND created_at >= $3`,
            [eventType, identifier, since]
        );
        return res.rows[0]?.count || 0;
    },

    async getLatestSecurityEvent(eventType: string, identifier: string, since: Date) {
        const res = await pool.query(
            `SELECT id, created_at, details
             FROM security_logs
             WHERE event_type = $1
               AND details->>'identifier' = $2
               AND created_at >= $3
             ORDER BY created_at DESC
             LIMIT 1`,
            [eventType, identifier, since]
        );
        return res.rows[0] || null;
    },

    activeUserClause(alias = "users") {
        return `COALESCE(${alias}.is_deleted, FALSE) = FALSE`;
    },

    async findUserByEmail(email: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, is_private, online_status_visible, is_deleted, deleted_at, scheduled_deletion_at, deletion_reason, created_at, updated_at FROM users WHERE email = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [email]);
        return res.rows[0];
    },

    async findUserByLoginIdentifier(identifier: string) {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        const res = await pool.query(
            'SELECT id, username, display_name, email, avatar_url, password_hash, website, location, bio, followers_count, follows_count, role, is_verified, is_banned, is_private, online_status_visible, email_verified, is_deleted, deleted_at, scheduled_deletion_at, deletion_reason, created_at, updated_at FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1',
            [normalizedIdentifier]
        );
        return res.rows[0];
    },

    async findUserByUsername(username: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, is_private, online_status_visible, is_deleted, deleted_at, scheduled_deletion_at, deletion_reason, created_at, updated_at FROM users WHERE username = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [username]);
        return res.rows[0];
    },

    async scheduleUserAccountDeletion(userId: string, reason?: string, audit?: { ipAddress?: string; userAgent?: string }) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Calculate scheduled deletion date (30 days from now)
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 30);

            const res = await client.query(
                `UPDATE users
                 SET is_deleted = TRUE,
                     deleted_at = NOW(),
                     scheduled_deletion_at = $2,
                     deletion_reason = $3
                 WHERE id = $1
                 RETURNING id, username, email, scheduled_deletion_at`,
                [userId, scheduledDate.toISOString(), reason || null]
            );

            // Invalidate every active session and refresh token
            await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);

            // Log security event with IP, user-agent, reason, and scheduled date
            await client.query(
                `INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, details)
                 VALUES ('account_deletion_requested', $1, $2, $3, $4::jsonb)`,
                [
                    userId,
                    audit?.ipAddress || null,
                    audit?.userAgent?.slice(0, 512) || null,
                    JSON.stringify({
                        reason: reason || "No reason provided",
                        scheduledDeletionAt: scheduledDate.toISOString(),
                        timestamp: new Date().toISOString(),
                    }),
                ]
            );

            await client.query("COMMIT");
            return res.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async restoreUserAccount(userId: string, audit?: { ipAddress?: string; userAgent?: string }) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const res = await client.query(
                `UPDATE users
                 SET is_deleted = FALSE,
                     deleted_at = NULL,
                     scheduled_deletion_at = NULL,
                     deletion_reason = NULL
                 WHERE id = $1
                 RETURNING id, username, email`,
                [userId]
            );

            await client.query(
                `INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, details)
                 VALUES ('account_restored', $1, $2, $3, $4::jsonb)`,
                [
                    userId,
                    audit?.ipAddress || null,
                    audit?.userAgent?.slice(0, 512) || null,
                    JSON.stringify({
                        restoredAt: new Date().toISOString(),
                    }),
                ]
            );

            await client.query("COMMIT");
            return res.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async purgeExpiredDeletedAccounts() {
        const res = await pool.query(
            `SELECT id, username FROM users WHERE is_deleted = TRUE AND scheduled_deletion_at <= NOW()`
        );
        const expiredUsers = res.rows;
        let purgedCount = 0;

        for (const u of expiredUsers) {
            try {
                await this.deleteUserAccount(u.id, {
                    ipAddress: "system_cron",
                    userAgent: "Background Account Purge Job",
                });
                purgedCount++;
                console.log(`[Purge Job] Successfully purged expired account: @${u.username} (${u.id})`);
            } catch (err) {
                console.error(`[Purge Job] Failed to purge user ${u.id}:`, err);
            }
        }

        return purgedCount;
    },

    async createRestorationOtp(userId: string, otpCode: string) {
        const otpHash = await bcrypt.hash(otpCode, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Invalidate any existing unused OTPs for this user
        await pool.query(
            `UPDATE account_restoration_otps SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
            [userId]
        );

        const res = await pool.query(
            `INSERT INTO account_restoration_otps (user_id, otp_code_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING id, expires_at`,
            [userId, otpHash, expiresAt.toISOString()]
        );
        return res.rows[0];
    },

    async verifyRestorationOtp(userId: string, otpCode: string): Promise<boolean> {
        const res = await pool.query(
            `SELECT id, otp_code_hash, expires_at FROM account_restoration_otps
             WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (res.rows.length === 0) return false;

        const row = res.rows[0];
        const isValid = await bcrypt.compare(otpCode, row.otp_code_hash);

        if (isValid) {
            await pool.query(
                `UPDATE account_restoration_otps SET used_at = NOW() WHERE id = $1`,
                [row.id]
            );
            return true;
        }

        return false;
    },

    async deleteUserAccount(userId: string, audit?: { ipAddress?: string; userAgent?: string }) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            await client.query(
                `INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, details)
                 VALUES ('delete_account_permanent', $1, $2, $3, '{}'::jsonb)`,
                [userId, audit?.ipAddress || null, audit?.userAgent?.slice(0, 512) || null]
            );
            await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
            await client.query("DELETE FROM post_comment_likes WHERE user_id = $1 OR comment_id IN (SELECT id FROM post_comments WHERE author_id = $1 OR post_id IN (SELECT id FROM posts WHERE author_id = $1))", [userId]);
            await client.query("DELETE FROM post_comments WHERE author_id = $1 OR post_id IN (SELECT id FROM posts WHERE author_id = $1)", [userId]);
            await client.query("DELETE FROM post_likes WHERE user_id = $1 OR post_id IN (SELECT id FROM posts WHERE author_id = $1)", [userId]);
            await client.query("DELETE FROM post_saves WHERE user_id = $1 OR post_id IN (SELECT id FROM posts WHERE author_id = $1)", [userId]);
            await client.query("DELETE FROM posts WHERE author_id = $1", [userId]);

            await client.query("DELETE FROM dm_messages WHERE sender_id = $1 OR conversation_id IN (SELECT id FROM dm_conversations WHERE user_a = $1 OR user_b = $1)", [userId]);
            await client.query("DELETE FROM dm_conversations WHERE user_a = $1 OR user_b = $1", [userId]);
            await client.query("DELETE FROM live_messages WHERE sender_id = $1 OR room_id IN (SELECT id FROM live_rooms WHERE created_by = $1)", [userId]);
            await client.query("DELETE FROM live_room_members WHERE user_id = $1 OR room_id IN (SELECT id FROM live_rooms WHERE created_by = $1)", [userId]);
            await client.query("DELETE FROM live_rooms WHERE created_by = $1", [userId]);
            await client.query("DELETE FROM friends WHERE user_id = $1 OR friend_id = $1", [userId]);
            await client.query("DELETE FROM users WHERE id = $1", [userId]);

            await client.query("COMMIT");
            return true;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async createUser(user: any, client: any = pool) {
        const query = `
            INSERT INTO users (id, username, display_name, email, password_hash, avatar_url, website, location, bio, followers_count, follows_count, role, is_private, email_verified, verification_token, verification_expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, $14, $15)
            RETURNING *;
        `;
        const res = await client.query(query, [
            user.id,
            user.username,
            user.displayName,
            user.email,
            user.passwordHash,
            user.avatarUrl,
            user.website || null,
            user.location || null,
            user.bio,
            user.followersCount || 0,
            user.followsCount || 0,
            user.role || 'user',
            user.isPrivate || false,
            user.verificationToken || null,
            user.verificationExpiresAt || null
        ]);
        return res.rows[0];
    },

    async getUserById(id: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, is_verified, is_banned, is_private, online_status_visible, created_at, updated_at FROM users WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [id]);
        return res.rows[0];
    },

    async getUserWithPasswordHash(id: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, password_hash, website, location, bio, followers_count, follows_count, role, is_private, online_status_visible, created_at, updated_at FROM users WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE', [id]);
        return res.rows[0];
    },

    async getAllUsers(limit = 50, offset = 0) {
        const cappedLimit = Math.min(Math.max(limit, 1), 100);
        const safeOffset = Math.max(offset, 0);
        const res = await pool.query('SELECT id, username, display_name as "displayName", avatar_url as "avatarUrl", website, location, bio, followers_count as "followersCount", follows_count as "followsCount", role, is_private as "isPrivate", created_at, updated_at FROM users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY username ASC LIMIT $1 OFFSET $2', [cappedLimit, safeOffset]);
        return res.rows;
    },

    async isBlockedEitherDirection(userId: string, otherId: string) {
        const res = await pool.query(
            `SELECT 1 FROM friends
             WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
               AND status = 'blocked'
             LIMIT 1`,
            [userId, otherId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async revokeSessionById(sessionId: string) {
        await pool.query(
            `UPDATE user_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
            [sessionId]
        );
    },

    async canViewPost(postId: string, userId: string) {
        const res = await pool.query(
            `SELECT 1
             FROM posts p
             JOIN users u ON u.id = p.author_id
             WHERE p.id = $1
               AND COALESCE(u.is_deleted, FALSE) = FALSE
               AND (
                   p.visibility = 'public'
                   OR p.author_id = $2
                   OR EXISTS (
                       SELECT 1 FROM friends f
                       JOIN users fu ON fu.id = f.friend_id
                       WHERE f.user_id = $2
                         AND f.friend_id = p.author_id
                         AND f.status = 'accepted'
                         AND COALESCE(fu.is_deleted, FALSE) = FALSE
                   )
               )
             LIMIT 1`,
            [postId, userId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async areFriends(userId: string, friendId: string) {
        return this.isMutual(userId, friendId);
    },

    async isMutual(userId: string, otherId: string) {
        const res = await pool.query(
            `SELECT 1
             FROM friends f1
             JOIN friends f2
               ON f1.user_id = $1
              AND f1.friend_id = $2
              AND f2.user_id = $2
              AND f2.friend_id = $1
             JOIN users u1 ON u1.id = $1
             JOIN users u2 ON u2.id = $2
             WHERE f1.status = 'accepted'
               AND f2.status = 'accepted'
               AND COALESCE(u1.is_deleted, FALSE) = FALSE
               AND COALESCE(u2.is_deleted, FALSE) = FALSE
             LIMIT 1`,
            [userId, otherId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async createLiveRoom(createdBy: string) {
        const res = await pool.query(
            'INSERT INTO live_rooms (created_by) VALUES ($1) RETURNING id, created_by, created_at',
            [createdBy]
        );
        return res.rows[0];
    },

    async getCanonicalOwnerLiveRoom(ownerId: string) {
        return getCanonicalLiveRoomForOwner(pool, ownerId);
    },

    async getOrCreateOwnerLiveRoom(ownerId: string) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(
                'SELECT pg_advisory_xact_lock($1, hashtext($2))',
                [LIVE_ROOM_LOCK_NAMESPACE, ownerId]
            );

            let room = await getCanonicalLiveRoomForOwner(client, ownerId);

            if (!room) {
                await client.query(
                    'INSERT INTO live_rooms (created_by) VALUES ($1)',
                    [ownerId]
                );
                room = await getCanonicalLiveRoomForOwner(client, ownerId);
            }

            if (!room) {
                throw new Error('Failed to resolve live room');
            }

            await client.query(
                'INSERT INTO live_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [room.id, ownerId]
            );

            await client.query('COMMIT');
            return room;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    async addLiveRoomMember(roomId: string, userId: string) {
        await pool.query(
            'INSERT INTO live_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roomId, userId]
        );
    },

    async getCanonicalLiveRoomById(roomId: string) {
        return getCanonicalLiveRoomByRequestedId(pool, roomId);
    },

    async canAccessOwnerRoom(viewerId: string, roomId: string) {
        const room = await this.getCanonicalLiveRoomById(roomId);
        if (!room || room.id !== roomId) {
            return false;
        }

        if (room.ownerId === viewerId) {
            return true;
        }

        return this.isMutual(viewerId, room.ownerId);
    },

    async getAccessibleOwnerRoom(viewerId: string, roomId: string) {
        const room = await this.getCanonicalLiveRoomById(roomId);
        if (!room || room.id !== roomId) {
            return null;
        }

        if (room.ownerId === viewerId) {
            return {
                ...room,
                isMine: true,
            };
        }

        const allowed = await this.isMutual(viewerId, room.ownerId);
        if (!allowed) {
            return null;
        }

        return {
            ...room,
            isMine: false,
        };
    },

    async getAccessibleLiveRooms(userId: string) {
        const res = await pool.query(
            `WITH canonical_rooms AS (
                SELECT DISTINCT ON (r.created_by)
                    r.id,
                    r.created_by,
                    r.created_at
                FROM live_rooms r
                JOIN users u ON u.id = r.created_by
                WHERE COALESCE(u.is_deleted, FALSE) = FALSE
                ORDER BY r.created_by, r.created_at ASC, r.id ASC
             )
             SELECT cr.id,
                    cr.created_by AS owner_id,
                    cr.created_at,
                    u.username AS owner_username,
                    u.display_name AS owner_display_name,
                    u.avatar_url AS owner_avatar_url,
                    (cr.created_by = $1) AS is_mine,
                    last_message.last_message_at
             FROM canonical_rooms cr
             JOIN users u ON u.id = cr.created_by
             LEFT JOIN LATERAL (
                SELECT lm.created_at AS last_message_at
                FROM live_messages lm
                JOIN users lm_u ON lm_u.id = lm.sender_id
                WHERE lm.room_id = cr.id
                  AND COALESCE(lm_u.is_deleted, FALSE) = FALSE
                ORDER BY lm.created_at DESC
                LIMIT 1
             ) last_message ON true
             WHERE COALESCE(u.is_deleted, FALSE) = FALSE
               AND (
                 cr.created_by = $1
                 OR EXISTS (
                     SELECT 1
                     FROM friends f1
                     JOIN friends f2
                       ON f1.user_id = $1
                      AND f1.friend_id = cr.created_by
                      AND f2.user_id = cr.created_by
                      AND f2.friend_id = $1
                     WHERE f1.status = 'accepted'
                       AND f2.status = 'accepted'
                 )
               )
             ORDER BY CASE WHEN cr.created_by = $1 THEN 0 ELSE 1 END,
                      last_message.last_message_at DESC NULLS LAST,
                      u.username ASC`,
            [userId]
        );
        return res.rows.map((row: LiveRoomRow) => mapLiveRoom(row, userId));
    },

    async followUser(userId: string, friendId: string): Promise<{ status: 'pending' | 'accepted' | 'blocked' }> {
        if (await this.isBlockedEitherDirection(userId, friendId)) {
            return { status: 'blocked' };
        }
        const target = await this.getUserById(friendId);
        const isPrivate = !!target?.is_private;
        const status: 'pending' | 'accepted' = isPrivate ? 'pending' : 'accepted';

        await pool.query(
            `INSERT INTO friends (user_id, friend_id, status)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, friend_id) DO UPDATE SET status = EXCLUDED.status`,
            [userId, friendId, status]
        );

        return { status };
    },

    async acceptFollow(userId: string, followerId: string) {
        if (await this.isBlockedEitherDirection(userId, followerId)) return false;
        const result = await pool.query(
            `UPDATE friends
             SET status = 'accepted'
             WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
            [followerId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    },

    async rejectFollow(userId: string, followerId: string) {
        const result = await pool.query(
            `DELETE FROM friends
             WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
            [followerId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    },

    async getFollowRequests(userId: string) {
        const res = await pool.query(
            `SELECT u.id, u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl"
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending' AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return res.rows;
    },

    async unfollowUser(userId: string, friendId: string) {
        await pool.query(
            `DELETE FROM friends
             WHERE (user_id = $1 AND friend_id = $2)
                OR (user_id = $2 AND friend_id = $1)`,
            [userId, friendId]
        );

        // Delete the DM conversation to reset chat history and route future messages to Requests
        const convRes = await pool.query(
            `SELECT id FROM dm_conversations
             WHERE (user_a = $1 AND user_b = $2)
                OR (user_a = $2 AND user_b = $1)`,
            [userId, friendId]
        );

        if (convRes.rowCount && convRes.rowCount > 0) {
            for (const row of convRes.rows) {
                await pool.query('DELETE FROM dm_messages WHERE conversation_id = $1', [row.id]);
                await pool.query('DELETE FROM dm_conversations WHERE id = $1', [row.id]);
            }
        }
    },

    async getFriends(userId: string) {
        const res = await pool.query(
            `SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_url
             FROM friends f1
             JOIN friends f2
               ON f1.user_id = $1
              AND f2.user_id = f1.friend_id
              AND f2.friend_id = $1
              AND f1.status = 'accepted'
              AND f2.status = 'accepted'
             JOIN users u ON u.id = f1.friend_id
             WHERE COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY u.username`,
            [userId]
        );
        return res.rows;
    },

    async getFollowers(userId: string) {
        const res = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'accepted' AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY u.username`,
            [userId]
        );
        return res.rows;
    },

    async getFollowing(userId: string) {
        const res = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'accepted' AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY u.username`,
            [userId]
        );
        return res.rows;
    },

    async getFriendsCount(userId: string) {
        const res = await pool.query(
            `SELECT COUNT(*)::int as count
             FROM friends f1
             JOIN friends f2
               ON f1.user_id = $1
              AND f2.user_id = f1.friend_id
              AND f2.friend_id = $1
              AND f1.status = 'accepted'
              AND f2.status = 'accepted'
             JOIN users u ON u.id = f1.friend_id
             WHERE COALESCE(u.is_deleted, FALSE) = FALSE`,
            [userId]
        );
        return res.rows[0]?.count || 0;
    },

    async getFollowersCount(userId: string) {
        const res = await pool.query(
            `SELECT COUNT(*)::int as count
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'accepted' AND COALESCE(u.is_deleted, FALSE) = FALSE`,
            [userId]
        );
        return res.rows[0]?.count || 0;
    },

    async getFollowingCount(userId: string) {
        const res = await pool.query(
            `SELECT COUNT(*)::int as count
             FROM friends f
             JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'accepted' AND COALESCE(u.is_deleted, FALSE) = FALSE`,
            [userId]
        );
        return res.rows[0]?.count || 0;
    },

    async saveLiveMessage(roomId: string, senderId: string, content: string) {
        const res = await pool.query(
            `INSERT INTO live_messages (room_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, room_id, sender_id, content, created_at`,
            [roomId, senderId, content]
        );
        return res.rows[0];
    },

    async saveMirroredLiveMessages(senderId: string, content: string) {
        const senderRoom = await this.getOrCreateOwnerLiveRoom(senderId);
        const friends = await this.getFriends(senderId);
        const ownerIds = Array.from(new Set([senderId, ...friends.map((friend: FriendRow) => friend.id)]));
        const deliveries: Array<{ room: any; message: any }> = [];

        for (const ownerId of ownerIds) {
            const room = ownerId === senderId
                ? senderRoom
                : await this.getOrCreateOwnerLiveRoom(ownerId);
            const message = await this.saveLiveMessage(room.id, senderId, content);
            deliveries.push({ room, message });
        }

        return { senderRoom, deliveries };
    },

    async getLiveMessages(roomId: string) {
        // Fetch ALL messages from the last 5 minutes (300 seconds)
        const res = await pool.query(
            `SELECT lm.id,
                    lm.room_id,
                    lm.sender_id,
                    lm.content,
                    lm.created_at,
                    u.username
             FROM live_messages lm
             JOIN users u ON u.id = lm.sender_id
             WHERE lm.room_id = $1
               AND COALESCE(u.is_deleted, FALSE) = FALSE
               AND lm.created_at >= NOW() - INTERVAL '5 minutes'
             ORDER BY lm.created_at ASC`,
            [roomId]
        );
        return res.rows.map(row => ({
            id: row.id,
            roomId: row.room_id,
            userId: row.sender_id,
            username: row.username,
            text: row.content,
            ts: new Date(row.created_at).getTime()
        }));
    },

    async getAccessibleLiveMessages(viewerId: string, roomId: string, limit = 50) {
        const room = await this.getAccessibleOwnerRoom(viewerId, roomId);
        if (!room) {
            return null;
        }

        const messages = await this.getLiveMessages(room.id);
        return { room, messages };
    },

    async getSuspiciousLiveMessagesAudit(limit = 500) {
        const res = await pool.query(
            `WITH canonical_rooms AS (
                SELECT DISTINCT ON (r.created_by)
                    r.id,
                    r.created_by
                FROM live_rooms r
                ORDER BY r.created_by, r.created_at ASC, r.id ASC
            )
            SELECT lm.id AS "messageId",
                   lm.room_id AS "roomId",
                   room.created_by AS "roomOwnerId",
                   owner_user.username AS "roomOwnerUsername",
                   lm.sender_id AS "senderId",
                   sender_user.username AS "senderUsername",
                   lm.created_at AS "createdAt",
                   CASE
                     WHEN canonical.id IS DISTINCT FROM lm.room_id THEN 'non_canonical_room'
                     ELSE 'sender_not_currently_allowed'
                   END AS "auditStatus"
            FROM live_messages lm
            JOIN live_rooms room ON room.id = lm.room_id
            LEFT JOIN canonical_rooms canonical ON canonical.created_by = room.created_by
            LEFT JOIN users owner_user ON owner_user.id = room.created_by
            LEFT JOIN users sender_user ON sender_user.id = lm.sender_id
            WHERE canonical.id IS DISTINCT FROM lm.room_id
               OR (
                    lm.sender_id <> room.created_by
                    AND NOT EXISTS (
                        SELECT 1
                        FROM friends f1
                        JOIN friends f2
                          ON f1.user_id = room.created_by
                         AND f1.friend_id = lm.sender_id
                         AND f2.user_id = lm.sender_id
                         AND f2.friend_id = room.created_by
                        WHERE f1.status = 'accepted'
                          AND f2.status = 'accepted'
                    )
               )
            ORDER BY lm.created_at DESC
            LIMIT $1`,
            [limit]
        );

        return res.rows;
    },

    async getDMConversation(userId: string, otherId: string) {
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            'SELECT id, user_a, user_b, created_at FROM dm_conversations WHERE user_a = $1 AND user_b = $2',
            [userA, userB]
        );
        return res.rows[0] || null;
    },

    async createDMConversation(userId: string, otherId: string) {
        if (userId === otherId) return null;
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            `INSERT INTO dm_conversations (user_a, user_b)
             SELECT $1, $2
             WHERE EXISTS (SELECT 1 FROM users WHERE id = $1)
               AND EXISTS (SELECT 1 FROM users WHERE id = $2)
             ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
             RETURNING id, user_a, user_b, created_at`,
            [userA, userB]
        );
        return res.rows[0] || null;
    },

    async getOrCreateDMConversation(userId: string, otherId: string) {
        if (await this.isBlockedEitherDirection(userId, otherId)) {
            return null;
        }
        const existing = await this.getDMConversation(userId, otherId);
        if (existing) return existing;

        // Check if other user is private and we are not friends
        const otherUser = await this.getUserById(otherId);
        const areFriends = await this.areFriends(userId, otherId);
        const status = (otherUser?.is_private && !areFriends && userId !== otherId) ? 'pending' : 'accepted';

        return await this.createDMConversationWithStatus(userId, otherId, status);
    },

    async createDMConversationWithStatus(userId: string, otherId: string, status: 'pending' | 'accepted' = 'accepted') {
        if (userId === otherId) return null;
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            `INSERT INTO dm_conversations (user_a, user_b, status)
             SELECT $1, $2, $3
             WHERE EXISTS (SELECT 1 FROM users WHERE id = $1)
               AND EXISTS (SELECT 1 FROM users WHERE id = $2)
             ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
             RETURNING id, user_a, user_b, status, created_at`,
            [userA, userB, status]
        );
        return res.rows[0] || null;
    },

    async acceptDMRequest(userId: string, otherId: string) {
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            `UPDATE dm_conversations SET status = 'accepted'
             WHERE user_a = $1 AND user_b = $2 AND status = 'pending'
             AND ($3 = user_a OR $3 = user_b)`,
            [userA, userB, userId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async rejectDMRequest(userId: string, otherId: string) {
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            `DELETE FROM dm_conversations
             WHERE user_a = $1 AND user_b = $2 AND status = 'pending'
             AND ($3 = user_a OR $3 = user_b)`,
            [userA, userB, userId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async listDMConversations(userId: string, limit = 50, offset = 0) {
        const cappedLimit = Math.min(Math.max(limit, 1), 100);
        const safeOffset = Math.max(offset, 0);
        const res = await pool.query(
            `SELECT c.id as conversation_id,
                    c.status,
                    u.id as other_id,
                    u.username as other_username,
                    u.display_name as other_display_name,
                    u.avatar_url as other_avatar_url,
                    CASE WHEN m.is_forwarded THEN 'Forwarded: ' || m.text ELSE m.text END as last_message,
                    m.sender_id as last_message_sender_id,
                    m.created_at as last_message_at,
                    COALESCE(unread.count, 0)::int as unread_count
             FROM dm_conversations c
             JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
             LEFT JOIN LATERAL (
                SELECT dm.text, dm.created_at, dm.sender_id, dm.is_forwarded
                FROM dm_messages dm
                JOIN users dmu ON dmu.id = dm.sender_id
                WHERE dm.conversation_id = c.id
                  AND COALESCE(dmu.is_deleted, FALSE) = FALSE
                ORDER BY dm.created_at DESC
                LIMIT 1
             ) m ON true
             LEFT JOIN LATERAL (
                SELECT COUNT(*)::int as count
                FROM dm_messages dm
                JOIN users dmu ON dmu.id = dm.sender_id
                WHERE dm.conversation_id = c.id
                  AND dm.sender_id <> $1
                  AND dm.read_at IS NULL
                  AND COALESCE(dmu.is_deleted, FALSE) = FALSE
             ) unread ON true
             WHERE (c.user_a = $1 OR c.user_b = $1)
               AND COALESCE(u.is_deleted, FALSE) = FALSE
               AND NOT EXISTS (
                   SELECT 1 FROM friends f
                   WHERE ((f.user_id = $1 AND f.friend_id = u.id)
                       OR (f.user_id = u.id AND f.friend_id = $1))
                     AND f.status = 'blocked'
               )
               AND NOT EXISTS (
                   SELECT 1 FROM muted_users m
                   WHERE m.user_id = $1 AND m.muted_id = u.id
               )
             ORDER BY m.created_at DESC NULLS LAST, c.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, cappedLimit, safeOffset]
        );
        return res.rows.map((r: any) => ({ ...r, conversationStatus: r.status || 'accepted' }));
    },
    async getDMHistory(conversationId: string, limit = 100) {
        const res = await pool.query(
            `SELECT m.id, m.sender_id, m.text, m.type, m.post_id, m.profile_id, m.edited_at, m.is_forwarded, m.created_at
             FROM dm_messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = $1
               AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY m.created_at ASC
             LIMIT $2`,
            [conversationId, limit]
        );
        return res.rows;
    },

    async saveDMMessage(conversationId: string, senderId: string, text: string, type: 'text' | 'post' | 'profile' = 'text', postId?: string, profileId?: string, isForwarded = false) {
        const res = await pool.query(
            `INSERT INTO dm_messages (conversation_id, sender_id, text, type, post_id, profile_id, is_forwarded)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, sender_id, text, type, post_id, profile_id, is_forwarded, created_at`,
            [conversationId, senderId, text, type, postId || null, profileId || null, isForwarded]
        );
        return res.rows[0];
    },

    async getForwardableDMMessage(messageId: string, userId: string) {
        const res = await pool.query(
            `SELECT m.text, m.type, m.post_id, m.profile_id
             FROM dm_messages m
             JOIN dm_conversations c ON c.id = m.conversation_id
             WHERE m.id = $1
               AND (c.user_a = $2 OR c.user_b = $2)
             LIMIT 1`,
            [messageId, userId]
        );
        return res.rows[0] || null;
    },

    async updateOwnDMMessage(messageId: string, senderId: string, otherUserId: string, text: string) {
        const res = await pool.query(
            `UPDATE dm_messages m
             SET text = $4, edited_at = now()
             FROM dm_conversations c
             WHERE m.id = $1
               AND m.sender_id = $2
               AND m.conversation_id = c.id
               AND ((c.user_a = $2 AND c.user_b = $3) OR (c.user_a = $3 AND c.user_b = $2))
               AND COALESCE(m.type, 'text') = 'text'
               AND m.created_at >= now() - INTERVAL '5 minutes'
             RETURNING m.id, m.sender_id, m.text, m.type, m.post_id, m.profile_id,
                       m.edited_at, m.created_at`,
            [messageId, senderId, otherUserId, text]
        );
        return res.rows[0] || null;
    },

    async deleteOwnDMMessage(messageId: string, senderId: string, otherUserId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const deleted = await client.query(
                `DELETE FROM dm_messages m
                 USING dm_conversations c
                 WHERE m.id = $1
                   AND m.sender_id = $2
                   AND m.conversation_id = c.id
                   AND ((c.user_a = $2 AND c.user_b = $3) OR (c.user_a = $3 AND c.user_b = $2))
                 RETURNING m.id, m.conversation_id`,
                [messageId, senderId, otherUserId]
            );
            if (!deleted.rows[0]) {
                await client.query('ROLLBACK');
                return null;
            }
            const latest = await client.query(
                `SELECT id, sender_id, text, is_forwarded, created_at
                 FROM dm_messages
                 WHERE conversation_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [deleted.rows[0].conversation_id]
            );
            await client.query('COMMIT');
            return { deletedId: deleted.rows[0].id, latestMessage: latest.rows[0] || null };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async markDMConversationRead(conversationId: string, readerId: string) {
        const res = await pool.query(
            `UPDATE dm_messages
             SET read_at = now()
             WHERE conversation_id = $1
               AND sender_id <> $2
               AND read_at IS NULL`,
            [conversationId, readerId]
        );
        return res.rowCount ?? 0;
    },

    async isFollowing(userId: string, otherId: string) {
        const res = await pool.query(
            `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2 LIMIT 1`,
            [userId, otherId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async isConnected(userId: string, otherId: string) {
        return this.isMutual(userId, otherId);
    },

    async createPost(authorId: string, content: string, title?: string, visibility: 'public' | 'friends' = 'friends') {
        const res = await pool.query(
            `INSERT INTO posts (author_id, content, title, visibility)
             VALUES ($1, $2, $3, $4)
             RETURNING id, author_id, content, title, visibility, created_at`,
            [authorId, content, title || null, visibility]
        );
        return res.rows[0];
    },

    async getFeedPosts(userId: string, limit = 50, offset = 0) {
        const res = await pool.query(
            `
            SELECT p.id,
                   p.content,
                   p.title,
                   p.visibility,
                   p.created_at,
                   u.id   AS author_id,
                   u.username,
                   u.display_name,
                   u.avatar_url,
                   COALESCE(l.count, 0) AS "likesCount",
                   COALESCE(c.count, 0) AS "commentsCount",
                   COALESCE(s.count, 0) AS "savesCount",
                   (SELECT 1 FROM post_likes pl2 WHERE pl2.user_id = $1 AND pl2.post_id = p.id LIMIT 1) AS "likedByMe",
                   (SELECT 1 FROM post_saves ps2 WHERE ps2.user_id = $1 AND ps2.post_id = p.id LIMIT 1) AS "savedByMe"
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_likes pl
                JOIN users lu ON lu.id = pl.user_id
                WHERE pl.post_id = p.id AND COALESCE(lu.is_deleted, FALSE) = FALSE
            ) l ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_comments pc
                JOIN users cu ON cu.id = pc.author_id
                WHERE pc.post_id = p.id AND COALESCE(cu.is_deleted, FALSE) = FALSE
            ) c ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_saves ps
                JOIN users su ON su.id = ps.user_id
                WHERE ps.post_id = p.id AND COALESCE(su.is_deleted, FALSE) = FALSE
            ) s ON true
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND (
                    (p.visibility = 'public' AND u.is_private = false)
                    OR p.author_id = $1
                    OR EXISTS (
                        SELECT 1 FROM friends f
                        JOIN users fu ON fu.id = f.friend_id
                        WHERE f.user_id = $1 AND f.friend_id = p.author_id AND f.status = 'accepted' AND COALESCE(fu.is_deleted, FALSE) = FALSE
                    )
                )
                AND NOT EXISTS (
                    SELECT 1 FROM friends f
                    WHERE (f.user_id = $1 AND f.friend_id = p.author_id AND f.status = 'blocked')
                       OR (f.user_id = p.author_id AND f.friend_id = $1 AND f.status = 'blocked')
                )
                AND NOT EXISTS (
                    SELECT 1 FROM muted_users m
                    WHERE m.user_id = $1 AND m.muted_id = p.author_id
                )
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
            `,
            [userId, limit, offset]
        );

        return res.rows.map(row => ({
            id: row.id,
            content: row.content,
            title: row.title,
            visibility: row.visibility,
            createdAt: row.created_at,
            author: {
                id: row.author_id,
                username: row.username,
                displayName: row.display_name,
                avatarUrl: row.avatar_url
            },
            likesCount: row.likesCount,
            commentsCount: row.commentsCount,
            savesCount: row.savesCount,
            likedByMe: !!row.likedByMe,
            savedByMe: !!row.savedByMe,
        }));
    },

    async toggleLike(userId: string, postId: string) {
        if (!await this.canViewPost(postId, userId)) return null;
        const existing = await pool.query(
            `DELETE FROM post_likes
             WHERE user_id = $1 AND post_id = $2
             RETURNING 1`,
            [userId, postId]
        );
        let liked = false;
        if ((existing.rowCount ?? 0) === 0) {
            const inserted = await pool.query(
                `INSERT INTO post_likes (user_id, post_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING
                 RETURNING 1`,
                [userId, postId]
            );
            liked = (inserted.rowCount ?? 0) > 0;
        }
        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1', [postId]);
        return { liked, count: countRes.rows[0].count };
    },

    async toggleSave(userId: string, postId: string) {
        if (!await this.canViewPost(postId, userId)) return null;
        const existing = await pool.query(
            `DELETE FROM post_saves
             WHERE user_id = $1 AND post_id = $2
             RETURNING 1`,
            [userId, postId]
        );
        let saved = false;
        if ((existing.rowCount ?? 0) === 0) {
            const inserted = await pool.query(
                `INSERT INTO post_saves (user_id, post_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING
                 RETURNING 1`,
                [userId, postId]
            );
            saved = (inserted.rowCount ?? 0) > 0;
        }
        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM post_saves WHERE post_id = $1', [postId]);
        return { saved, count: countRes.rows[0].count };
    },

    async addComment(userId: string, postId: string, content: string) {
        if (!await this.canViewPost(postId, userId)) return null;
        const res = await pool.query(
            `INSERT INTO post_comments (post_id, author_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, post_id, author_id, content, created_at`,
            [postId, userId, content]
        );
        const row = res.rows[0];
        return {
            ...row,
            likesCount: 0,
            likedByMe: false
        };
    },

    async toggleCommentLike(userId: string, commentId: string) {
        const allowed = await pool.query(
            `SELECT 1
             FROM post_comments c
             JOIN posts p ON p.id = c.post_id
             WHERE c.id = $1
               AND (
                   p.visibility = 'public'
                   OR p.author_id = $2
                   OR EXISTS (
                       SELECT 1 FROM friends f
                       WHERE f.user_id = $2
                         AND f.friend_id = p.author_id
                         AND f.status = 'accepted'
                   )
               )
             LIMIT 1`,
            [commentId, userId]
        );
        if ((allowed.rowCount ?? 0) === 0) return null;
        const existing = await pool.query(
            `DELETE FROM post_comment_likes
             WHERE user_id = $1 AND comment_id = $2
             RETURNING 1`,
            [userId, commentId]
        );
        let liked = false;
        if ((existing.rowCount ?? 0) === 0) {
            const inserted = await pool.query(
                `INSERT INTO post_comment_likes (user_id, comment_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING
                 RETURNING 1`,
                [userId, commentId]
            );
            liked = (inserted.rowCount ?? 0) > 0;
        }
        const countRes = await pool.query(
            'SELECT COUNT(*)::int AS count FROM post_comment_likes WHERE comment_id = $1',
            [commentId]
        );
        return { liked, likesCount: countRes.rows[0].count };
    },

    async getComments(postId: string, userId: string, limit = 50) {
        if (!await this.canViewPost(postId, userId)) return null;
        const res = await pool.query(
            `SELECT c.id, c.content, c.created_at, u.id as author_id, u.username, u.display_name, u.avatar_url,
                    COALESCE(l.count, 0) AS "likesCount",
                    EXISTS(SELECT 1 FROM post_comment_likes pcl WHERE pcl.comment_id = c.id AND pcl.user_id = $2) AS "likedByMe"
             FROM post_comments c
             JOIN users u ON u.id = c.author_id
             LEFT JOIN LATERAL (
                 SELECT count(*)::int AS count
                 FROM post_comment_likes cl
                 JOIN users lu ON lu.id = cl.user_id
                 WHERE cl.comment_id = c.id AND COALESCE(lu.is_deleted, FALSE) = FALSE
             ) l ON true
             WHERE c.post_id = $1
               AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY c.created_at DESC
             LIMIT $3`,
            [postId, userId, limit]
        );
        return res.rows.map(r => ({
            id: r.id,
            content: r.content,
            createdAt: r.created_at,
            likesCount: r.likesCount,
            likedByMe: r.likedByMe,
            author: {
                id: r.author_id,
                username: r.username,
                displayName: r.display_name,
                avatarUrl: r.avatar_url
            }
        }));
    },

    async deleteComment(userId: string, commentId: string) {
        // Allow comment author OR the post author to delete
        const res = await pool.query(
            `DELETE FROM post_comments c
             USING posts p
             WHERE c.id = $1
               AND p.id = c.post_id
               AND (c.author_id = $2 OR p.author_id = $2)`,
            [commentId, userId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async updatePost(postId: string, authorId: string, content: string, title?: string) {
        try {
            const res = await pool.query(
                `UPDATE posts
                 SET content = $1,
                     title = $2,
                     updated_at = NOW()
                 WHERE id = $3 AND author_id = $4
                 RETURNING *`,
                [content || "", title || null, postId, authorId]
            );
            return res.rows[0] || null;
        } catch (err) {
            console.error("[DB_UPDATE] failed to update post", err);
            throw err;
        }
    },

    async deletePost(postId: string, authorId: string) {
        const res = await pool.query(
            `DELETE FROM posts WHERE id = $1 AND author_id = $2`,
            [postId, authorId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async getNotifications(userId: string, limit = 50, offset = 0) {
        const cappedLimit = Math.min(Math.max(limit, 1), 100);
        const safeOffset = Math.max(offset, 0);
        const res = await pool.query(
            `SELECT type,
                    user_id,
                    username,
                    display_name,
                    avatar_url,
                    post_id,
                    content,
                    comment_content,
                    status,
                    is_mutual,
                    created_at
             FROM (
                 SELECT 'like' AS type,
                        pl.user_id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        pl.post_id,
                        NULL::text AS content,
                        NULL::text AS comment_content,
                        NULL::text AS status,
                        false AS is_mutual,
                        pl.created_at
                 FROM post_likes pl
                 JOIN posts p ON p.id = pl.post_id
                 JOIN users pu ON pu.id = p.author_id
                 JOIN users u ON u.id = pl.user_id
                 WHERE p.author_id = $1 AND pl.user_id <> $1
                   AND COALESCE(u.is_deleted, FALSE) = FALSE
                   AND COALESCE(pu.is_deleted, FALSE) = FALSE

                 UNION ALL

                 SELECT 'comment' AS type,
                        pc.author_id AS user_id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        pc.post_id,
                        pc.content,
                        NULL::text AS comment_content,
                        NULL::text AS status,
                        false AS is_mutual,
                        pc.created_at
                 FROM post_comments pc
                 JOIN posts p ON p.id = pc.post_id
                 JOIN users pu ON pu.id = p.author_id
                 JOIN users u ON u.id = pc.author_id
                 WHERE p.author_id = $1 AND pc.author_id <> $1
                   AND COALESCE(u.is_deleted, FALSE) = FALSE
                   AND COALESCE(pu.is_deleted, FALSE) = FALSE

                 UNION ALL

                 SELECT 'follow' AS type,
                        f.user_id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        NULL::uuid AS post_id,
                        NULL::text AS content,
                        NULL::text AS comment_content,
                        f.status,
                        EXISTS (
                            SELECT 1 FROM friends f2
                            JOIN users u2 ON u2.id = f2.friend_id
                            WHERE f2.user_id = $1 AND f2.friend_id = f.user_id AND f2.status = 'accepted' AND COALESCE(u2.is_deleted, FALSE) = FALSE
                        ) AS is_mutual,
                        f.created_at
                 FROM friends f
                 JOIN users u ON u.id = f.user_id
                 WHERE f.friend_id = $1 AND f.user_id <> $1 AND f.status <> 'blocked'
                   AND COALESCE(u.is_deleted, FALSE) = FALSE

                 UNION ALL

                 SELECT 'comment_like' AS type,
                        pcl.user_id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        pc.post_id,
                        NULL::text AS content,
                        pc.content AS comment_content,
                        NULL::text AS status,
                        false AS is_mutual,
                        pcl.created_at
                 FROM post_comment_likes pcl
                 JOIN post_comments pc ON pc.id = pcl.comment_id
                 JOIN users cu ON cu.id = pc.author_id
                 JOIN users u ON u.id = pcl.user_id
                 WHERE pc.author_id = $1 AND pcl.user_id <> $1
                   AND COALESCE(u.is_deleted, FALSE) = FALSE
                   AND COALESCE(cu.is_deleted, FALSE) = FALSE

                 UNION ALL

                 SELECT 'dm' AS type,
                        m.sender_id AS user_id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        NULL::uuid AS post_id,
                        m.text AS content,
                        NULL::text AS comment_content,
                        NULL::text AS status,
                        false AS is_mutual,
                        m.created_at
                 FROM dm_messages m
                 JOIN dm_conversations c ON c.id = m.conversation_id
                 JOIN users u ON u.id = m.sender_id
                 WHERE (c.user_a = $1 OR c.user_b = $1)
                   AND m.sender_id <> $1
                   AND COALESCE(u.is_deleted, FALSE) = FALSE
             ) notifications
             WHERE NOT EXISTS (
                 SELECT 1 FROM muted_users m
                 WHERE m.user_id = $1 AND m.muted_id = notifications.user_id
             ) AND NOT EXISTS (
                 SELECT 1 FROM friends f
                 WHERE ((f.user_id = $1 AND f.friend_id = notifications.user_id) OR (f.user_id = notifications.user_id AND f.friend_id = $1)) AND f.status = 'blocked'
             )
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, cappedLimit, safeOffset]
        );

        return res.rows.map((r: NotificationRow) => ({
            type: r.type === 'follow'
                ? (r.status === 'pending' ? 'follow_request' : (r.is_mutual ? 'follow_back' : 'follow'))
                : r.type,
            user: { id: r.user_id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
            postId: r.post_id,
            content: r.content || r.comment_content,
            createdAt: r.created_at,
        }));
    },
    async getPostById(postId: string, userId: string) {
        const res = await pool.query(
            `
            SELECT p.id,
                   p.content,
                   p.title,
                   p.visibility,
                   p.created_at,
                   u.id   AS author_id,
                   u.username,
                   u.display_name,
                   u.avatar_url,
                   COALESCE(l.count, 0) AS "likesCount",
                   COALESCE(c.count, 0) AS "commentsCount",
                   COALESCE(s.count, 0) AS "savesCount",
                   (SELECT 1 FROM post_likes pl2 WHERE pl2.user_id = $2 AND pl2.post_id = p.id LIMIT 1) AS "likedByMe",
                   (SELECT 1 FROM post_saves ps2 WHERE ps2.user_id = $2 AND ps2.post_id = p.id LIMIT 1) AS "savedByMe"
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_likes pl
                JOIN users lu ON lu.id = pl.user_id
                WHERE pl.post_id = p.id AND COALESCE(lu.is_deleted, FALSE) = FALSE
            ) l ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_comments pc
                JOIN users cu ON cu.id = pc.author_id
                WHERE pc.post_id = p.id AND COALESCE(cu.is_deleted, FALSE) = FALSE
            ) c ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count
                FROM post_saves ps
                JOIN users su ON su.id = ps.user_id
                WHERE ps.post_id = p.id AND COALESCE(su.is_deleted, FALSE) = FALSE
            ) s ON true
            WHERE p.id = $1
              AND COALESCE(u.is_deleted, FALSE) = FALSE
              AND (
                  p.visibility = 'public'
                  OR p.author_id = $2
                  OR EXISTS (
                      SELECT 1 FROM friends f
                      JOIN users fu ON fu.id = f.friend_id
                      WHERE f.user_id = $2
                        AND f.friend_id = p.author_id
                        AND f.status = 'accepted'
                        AND COALESCE(fu.is_deleted, FALSE) = FALSE
                  )
              )
            `,
            [postId, userId]
        );
        if (res.rowCount === 0) return null;

        const row = res.rows[0];
        return {
            id: row.id,
            content: row.content,
            title: row.title,
            visibility: row.visibility,
            createdAt: row.created_at,
            author: {
                id: row.author_id,
                username: row.username,
                displayName: row.display_name,
                avatarUrl: row.avatar_url
            },
            likesCount: row.likesCount,
            commentsCount: row.commentsCount,
            savesCount: row.savesCount,
            likedByMe: !!row.likedByMe,
            savedByMe: !!row.savedByMe,
        };
    },

    async updateUserEmail(userId: string, email: string) {
        await pool.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
            [email, userId]
        );
    },

    async updateUserPassword(userId: string, hash: string) {
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hash, userId]
        );
    },

    async updateUserPrivacy(userId: string, isPrivate: boolean) {
        await pool.query(
            'UPDATE users SET is_private = $1, updated_at = NOW() WHERE id = $2',
            [isPrivate, userId]
        );
    },

    async updateUserOnlineStatusVisible(userId: string, isVisible: boolean) {
        await pool.query(
            'UPDATE users SET online_status_visible = $1, updated_at = NOW() WHERE id = $2',
            [isVisible, userId]
        );
    },

    async getBlockedUsers(userId: string) {
        const res = await pool.query(
            `SELECT u.id, u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl"
             FROM friends f
             JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'blocked' AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY u.username`,
            [userId]
        );
        return res.rows;
    },

    async blockUser(userId: string, blockedId: string) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                `DELETE FROM friends
                 WHERE (user_id = $1 AND friend_id = $2)
                    OR (user_id = $2 AND friend_id = $1)`,
                [userId, blockedId]
            );
            await client.query(
                `INSERT INTO friends (user_id, friend_id, status)
                 SELECT $1, $2, 'blocked'
                 WHERE EXISTS (SELECT 1 FROM users WHERE id = $2)
                 ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'blocked'`,
                [userId, blockedId]
            );
            await client.query(
                `DELETE FROM dm_conversations
                 WHERE (user_a = $1 AND user_b = $2)
                    OR (user_a = $2 AND user_b = $1)`,
                [userId, blockedId]
            );
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async unblockUser(userId: string, unblockedId: string) {
        await pool.query(
            `DELETE FROM friends
             WHERE user_id = $1 AND friend_id = $2 AND status = 'blocked'`,
            [userId, unblockedId]
        );
    },

    async muteUser(userId: string, mutedId: string) {
        await pool.query(
            `INSERT INTO muted_users (user_id, muted_id)
             SELECT $1, $2
             WHERE EXISTS (SELECT 1 FROM users WHERE id = $2)
             ON CONFLICT (user_id, muted_id) DO NOTHING`,
            [userId, mutedId]
        );
    },

    async unmuteUser(userId: string, mutedId: string) {
        await pool.query(
            `DELETE FROM muted_users WHERE user_id = $1 AND muted_id = $2`,
            [userId, mutedId]
        );
    },

    async getMutedUsers(userId: string) {
        const res = await pool.query(
            `SELECT u.id, u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl"
             FROM muted_users m
             JOIN users u ON u.id = m.muted_id
             WHERE m.user_id = $1 AND COALESCE(u.is_deleted, FALSE) = FALSE
             ORDER BY u.username`,
            [userId]
        );
        return res.rows;
    },

    async isMuted(userId: string, mutedId: string) {
        const res = await pool.query(
            `SELECT 1 FROM muted_users WHERE user_id = $1 AND muted_id = $2`,
            [userId, mutedId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async getSavedPosts(userId: string) {
        const res = await pool.query(
            `
            SELECT p.id,
                   p.content,
                   p.title,
                   p.visibility,
                   p.created_at,
                   u.id   AS author_id,
                   u.username,
                   u.display_name,
                   u.avatar_url,
                   COALESCE(l.count, 0) AS "likesCount",
                   COALESCE(c.count, 0) AS "commentsCount",
                   COALESCE(s.count, 0) AS "savesCount",
                   (SELECT 1 FROM post_likes pl2 WHERE pl2.user_id = $1 AND pl2.post_id = p.id LIMIT 1) AS "likedByMe",
                   true AS "savedByMe"
            FROM post_saves ps_main
            JOIN posts p ON p.id = ps_main.post_id
            JOIN users u ON u.id = p.author_id
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count FROM post_likes pl JOIN users lu ON lu.id = pl.user_id WHERE pl.post_id = p.id AND COALESCE(lu.is_deleted, FALSE) = FALSE
            ) l ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count FROM post_comments pc JOIN users cu ON cu.id = pc.author_id WHERE pc.post_id = p.id AND COALESCE(cu.is_deleted, FALSE) = FALSE
            ) c ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count FROM post_saves ps JOIN users su ON su.id = ps.user_id WHERE ps.post_id = p.id AND COALESCE(su.is_deleted, FALSE) = FALSE
            ) s ON true
            WHERE ps_main.user_id = $1
              AND COALESCE(u.is_deleted, FALSE) = FALSE
              AND (
                  p.visibility = 'public'
                  OR p.author_id = $1
                  OR EXISTS (
                      SELECT 1 FROM friends f
                      JOIN users fu ON fu.id = f.friend_id
                      WHERE f.user_id = $1
                        AND f.friend_id = p.author_id
                        AND f.status = 'accepted'
                        AND COALESCE(fu.is_deleted, FALSE) = FALSE
                  )
              )
            ORDER BY ps_main.created_at DESC
            `,
            [userId]
        );

        return res.rows.map(row => ({
            id: row.id,
            content: row.content,
            title: row.title,
            visibility: row.visibility,
            createdAt: row.created_at,
            author: {
                id: row.author_id,
                username: row.username,
                displayName: row.display_name,
                avatarUrl: row.avatar_url
            },
            likesCount: row.likesCount,
            commentsCount: row.commentsCount,
            savesCount: row.savesCount,
            likedByMe: !!row.likedByMe,
            savedByMe: !!row.savedByMe,
        }));
    },

    async cleanupExpiredLiveMessages(ttlMs = 5 * 60 * 1000) {
        const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);
        const res = await pool.query(
            `DELETE FROM live_messages
             WHERE created_at < now() - ($1::int * interval '1 second')`,
            [ttlSeconds]
        );
        return res.rowCount ?? 0;
    },

    async saveReport(userId: string | undefined, type: string, reportedUserId: string | undefined, postId: string | undefined, reason: string) {
        // Simple insert into a generic reports table, or create user_reports if it exists
        if (type === 'account' && reportedUserId) {
            await pool.query(
                `INSERT INTO user_reports (reported_user, reported_by, reason)
                 VALUES ($1, $2, $3)`,
                [reportedUserId, userId || null, reason]
            );
        } else {
            // Log it in security_logs as a fallback if it's a post report
            await pool.query(
                `INSERT INTO security_logs (event_type, user_id, details)
                 VALUES ($1, $2, $3)`,
                ['report', userId || null, JSON.stringify({ type, reportedUserId, postId, reason })]
            );
        }
    },

    async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [userId, tokenHash, expiresAt]
        );
    },

    async getPasswordResetToken(tokenHash: string) {
        const res = await pool.query(
            `SELECT id, user_id, expires_at, used_at
             FROM password_reset_tokens
             WHERE token_hash = $1`,
            [tokenHash]
        );
        return res.rows[0] || null;
    },

    async markPasswordResetTokenUsed(id: string) {
        await pool.query(
            `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
            [id]
        );
    },

    async createEmailChangeToken(userId: string, newEmail: string, tokenHash: string, expiresAt: Date) {
        await pool.query(
            `INSERT INTO email_change_tokens (user_id, new_email, token_hash, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [userId, newEmail, tokenHash, expiresAt]
        );
    },

    async getEmailChangeToken(tokenHash: string) {
        const res = await pool.query(
            `SELECT id, user_id, new_email, expires_at, used_at
             FROM email_change_tokens
             WHERE token_hash = $1`,
            [tokenHash]
        );
        return res.rows[0] || null;
    },

    async markEmailChangeTokenUsed(id: string) {
        await pool.query(
            `UPDATE email_change_tokens SET used_at = now() WHERE id = $1`,
            [id]
        );
    },

    // ── Email verification (signup flow) ──────────────────────

    async getUserByVerificationToken(tokenHash: string) {
        const res = await pool.query(
            `SELECT id, email_verified, verification_expires_at 
             FROM users 
             WHERE verification_token = $1`,
            [tokenHash]
        );
        return res.rows[0] || null;
    },

    async verifyUserEmail(userId: string) {
        await pool.query(
            `UPDATE users SET 
                email_verified = true, 
                verification_token = NULL, 
                verification_expires_at = NULL 
             WHERE id = $1`,
            [userId]
        );
    },

    async updateUserVerificationToken(userId: string, tokenHash: string, expiresAt: Date, client: any = pool) {
        await client.query(
            `UPDATE users SET 
                verification_token = $2, 
                verification_expires_at = $3 
             WHERE id = $1`,
            [userId, tokenHash, expiresAt]
        );
    },

    async isEmailVerified(userId: string): Promise<boolean> {
        const res = await pool.query(
            `SELECT email_verified FROM users WHERE id = $1`,
            [userId]
        );
        return res.rows[0]?.email_verified ?? false;
    }
};