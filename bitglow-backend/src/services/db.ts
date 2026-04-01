import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

console.log('DATABASE_URL from env:', process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:26092008@localhost:5432/bitglow',
});

// Ensure posts + related tables exist for blogging
const initPostsTable = async () => {
    try {
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT,
                content TEXT NOT NULL,
                visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public','friends')),
                created_at TIMESTAMP DEFAULT now()
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
        `);
    } catch (err) {
        console.error("Failed to ensure posts table", err);
    }
};
void initPostsTable();

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
            WHERE lm.room_id = r.id
            ORDER BY lm.created_at DESC
            LIMIT 1
         ) last_message ON true
         WHERE r.created_by = $1
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
                WHERE lm.room_id = r.id
                ORDER BY lm.created_at DESC
                LIMIT 1
            ) last_message ON true
            WHERE r.created_by = target.created_by
            ORDER BY r.created_at ASC, r.id ASC
            LIMIT 1
         ) canonical ON true
         WHERE target.id = $1
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
    query: (text: string, params?: any[]) => pool.query(text, params),

    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    },

    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    },

    async saveMessage(userId: string, username: string, text: string) {
        const query = `
      INSERT INTO messages (user_id, username, text)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
        const res = await pool.query(query, [userId, username, text]);
        return res.rows[0];
    },

    async getLastMessages(limit = 50) {
        const query = `
      SELECT user_id as "userId", username, text, created_at as ts
      FROM messages
      ORDER BY created_at DESC
      LIMIT $1;
    `;
        const res = await pool.query(query, [limit]);
        // reverse to get chronological order for client
        return res.rows.reverse().map(row => ({
            ...row,
            ts: new Date(row.ts).getTime()
        }));
    },

    async findUserByEmail(email: string) {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    },

    async findUserByUsername(username: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, created_at, updated_at FROM users WHERE username = $1', [username]);
        return res.rows[0];
    },

    async createUser(user: any) {
        const query = `
            INSERT INTO users (id, username, display_name, email, password_hash, avatar_url, website, location, bio, followers_count, follows_count, role, is_private)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *;
        `;
        const res = await pool.query(query, [
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
            user.isPrivate || false
        ]);
        return res.rows[0];
    },

    async getUserById(id: string) {
        const res = await pool.query('SELECT id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, is_private, created_at, updated_at FROM users WHERE id = $1', [id]);
        return res.rows[0];
    },

    async getAllUsers() {
        const res = await pool.query('SELECT id, username, display_name as "displayName", avatar_url as "avatarUrl", website, location, bio, followers_count as "followersCount", follows_count as "followsCount", role, is_private as "isPrivate", created_at, updated_at FROM users');
        return res.rows;
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
             WHERE f1.status = 'accepted'
               AND f2.status = 'accepted'
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
                WHERE lm.room_id = cr.id
                ORDER BY lm.created_at DESC
                LIMIT 1
             ) last_message ON true
             WHERE cr.created_by = $1
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
             ORDER BY CASE WHEN cr.created_by = $1 THEN 0 ELSE 1 END,
                      last_message.last_message_at DESC NULLS LAST,
                      u.username ASC`,
            [userId]
        );
        return res.rows.map((row) => mapLiveRoom(row, userId));
    },

    async followUser(userId: string, friendId: string) {
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
        await pool.query(
            `UPDATE friends
             SET status = 'accepted'
             WHERE user_id = $1 AND friend_id = $2`,
            [followerId, userId]
        );
        return true;
    },

    async unfollowUser(userId: string, friendId: string) {
        await pool.query(
            `DELETE FROM friends
             WHERE (user_id = $1 AND friend_id = $2)
                OR (user_id = $2 AND friend_id = $1)`,
            [userId, friendId]
        );
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
             WHERE f.friend_id = $1 AND f.status = 'accepted'
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
             WHERE f.user_id = $1 AND f.status = 'accepted'
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
              AND f2.status = 'accepted'`,
            [userId]
        );
        return res.rows[0]?.count || 0;
    },

    async getFollowersCount(userId: string) {
        const res = await pool.query(
            `SELECT COUNT(*)::int as count
             FROM friends
             WHERE friend_id = $1 AND status = 'accepted'`,
            [userId]
        );
        return res.rows[0]?.count || 0;
    },

    async getFollowingCount(userId: string) {
        const res = await pool.query(
            `SELECT COUNT(*)::int as count
             FROM friends
             WHERE user_id = $1 AND status = 'accepted'`,
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
        const ownerIds = Array.from(new Set([senderId, ...friends.map((friend: any) => friend.id)]));
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
        const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
        const res = await pool.query(
            'INSERT INTO dm_conversations (user_a, user_b) VALUES ($1, $2) RETURNING id, user_a, user_b, created_at',
            [userA, userB]
        );
        return res.rows[0];
    },

    async getOrCreateDMConversation(userId: string, otherId: string) {
        const existing = await this.getDMConversation(userId, otherId);
        if (existing) return existing;
        return await this.createDMConversation(userId, otherId);
    },

    async listDMConversations(userId: string) {
        const res = await pool.query(
            `SELECT c.id as conversation_id,
                    u.id as other_id,
                    u.username as other_username,
                    u.display_name as other_display_name,
                    u.avatar_url as other_avatar_url,
                    m.text as last_message,
                    m.created_at as last_message_at
             FROM dm_conversations c
             JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
             LEFT JOIN LATERAL (
                SELECT text, created_at
                FROM dm_messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
             ) m ON true
             WHERE c.user_a = $1 OR c.user_b = $1
             ORDER BY m.created_at DESC NULLS LAST, c.created_at DESC`,
            [userId]
        );
        return res.rows;
    },

    async getDMHistory(conversationId: string, limit = 100) {
        const res = await pool.query(
            `SELECT id, sender_id, text, created_at
             FROM dm_messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC
             LIMIT $2`,
            [conversationId, limit]
        );
        return res.rows;
    },

    async saveDMMessage(conversationId: string, senderId: string, text: string) {
        const res = await pool.query(
            `INSERT INTO dm_messages (conversation_id, sender_id, text)
             VALUES ($1, $2, $3)
             RETURNING id, sender_id, text, created_at`,
            [conversationId, senderId, text]
        );
        return res.rows[0];
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
                SELECT count(*)::int AS count FROM post_likes pl WHERE pl.post_id = p.id
            ) l ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count FROM post_comments pc WHERE pc.post_id = p.id
            ) c ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::int AS count FROM post_saves ps WHERE ps.post_id = p.id
            ) s ON true
            WHERE
                p.visibility = 'public'
                OR p.author_id = $1
                OR EXISTS (
                    SELECT 1 FROM friends f
                    WHERE f.user_id = $1 AND f.friend_id = p.author_id AND f.status = 'accepted'
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
        const existing = await pool.query(
            'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );
        if ((existing.rowCount ?? 0) > 0) {
            await pool.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        } else {
            await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        }
        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1', [postId]);
        return { liked: (existing.rowCount ?? 0) === 0, count: countRes.rows[0].count };
    },

    async toggleSave(userId: string, postId: string) {
        const existing = await pool.query(
            'SELECT 1 FROM post_saves WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );
        if ((existing.rowCount ?? 0) > 0) {
            await pool.query('DELETE FROM post_saves WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        } else {
            await pool.query('INSERT INTO post_saves (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        }
        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM post_saves WHERE post_id = $1', [postId]);
        return { saved: (existing.rowCount ?? 0) === 0, count: countRes.rows[0].count };
    },

    async addComment(userId: string, postId: string, content: string) {
        const res = await pool.query(
            `INSERT INTO post_comments (post_id, author_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, post_id, author_id, content, created_at`,
            [postId, userId, content]
        );
        return res.rows[0];
    },

    async getComments(postId: string, limit = 50) {
        const res = await pool.query(
            `SELECT c.id, c.content, c.created_at, u.id as author_id, u.username, u.display_name, u.avatar_url
             FROM post_comments c
             JOIN users u ON u.id = c.author_id
             WHERE c.post_id = $1
             ORDER BY c.created_at DESC
             LIMIT $2`,
            [postId, limit]
        );
        return res.rows.map(r => ({
            id: r.id,
            content: r.content,
            createdAt: r.created_at,
            author: {
                id: r.author_id,
                username: r.username,
                displayName: r.display_name,
                avatarUrl: r.avatar_url
            }
        }));
    },

    async updatePost(postId: string, authorId: string, content: string, title?: string) {
        const res = await pool.query(
            `UPDATE posts
             SET content = $1,
                 title = $2,
                 updated_at = now()
             WHERE id = $3 AND author_id = $4
             RETURNING id, author_id, content, title, visibility, created_at, updated_at`,
            [content, title || null, postId, authorId]
        );
        return res.rows[0] || null;
    },

    async deletePost(postId: string, authorId: string) {
        const res = await pool.query(
            `DELETE FROM posts WHERE id = $1 AND author_id = $2`,
            [postId, authorId]
        );
        return (res.rowCount ?? 0) > 0;
    },

    async getNotifications(userId: string, limit = 50) {
        const likesRes = await pool.query(
            `SELECT pl.user_id,
                    pl.post_id,
                    pl.created_at,
                    'like' AS type,
                    u.username,
                    u.display_name,
                    u.avatar_url
             FROM post_likes pl
             JOIN posts p ON p.id = pl.post_id
             JOIN users u ON u.id = pl.user_id
             WHERE p.author_id = $1
             ORDER BY pl.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const commentsRes = await pool.query(
            `SELECT pc.author_id as user_id,
                    pc.post_id,
                    pc.created_at,
                    pc.content,
                    'comment' AS type,
                    u.username,
                    u.display_name,
                    u.avatar_url
             FROM post_comments pc
             JOIN posts p ON p.id = pc.post_id
             JOIN users u ON u.id = pc.author_id
             WHERE p.author_id = $1
             ORDER BY pc.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const followReqRes = await pool.query(
            `SELECT f.user_id,
                    f.created_at,
                    'follow_request' AS type,
                    u.username,
                    u.display_name,
                    u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const items = [
            ...likesRes.rows.map((r: any) => ({
                type: 'like' as const,
                user: { id: r.user_id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
                postId: r.post_id,
                createdAt: r.created_at
            })),
            ...commentsRes.rows.map((r: any) => ({
                type: 'comment' as const,
                user: { id: r.user_id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
                postId: r.post_id,
                content: r.content,
                createdAt: r.created_at
            })),
            ...followReqRes.rows.map((r: any) => ({
                type: 'follow_request' as const,
                user: { id: r.user_id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
                createdAt: r.created_at
            })),
        ];

        return items
            .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())
            .slice(0, limit);
    }
};


