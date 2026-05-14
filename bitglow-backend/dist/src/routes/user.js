"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const db_1 = require("../services/db");
const security_1 = require("../services/security");
const schemas_1 = require("./schemas");
async function userRoutes(fastify) {
    /**
     * GET /api/me
     * Returns the authenticated user from DB
     */
    fastify.get("/me", { preHandler: fastify.requireAuth }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const dbUser = await db_1.db.getUserById(req.auth.id);
        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }
        const followersCount = await db_1.db.getFollowersCount(dbUser.id);
        const followsCount = await db_1.db.getFollowingCount(dbUser.id);
        return {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name || dbUser.displayName,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url || dbUser.avatarUrl,
            website: dbUser.website,
            location: dbUser.location,
            bio: dbUser.bio,
            followersCount,
            followsCount
        };
    });
    /**
     * GET /api/users
     * Returns all users (public info)
     */
    fastify.get("/users", async (req, reply) => {
        const users = await db_1.db.getAllUsers();
        return users;
    });
    /**
     * GET /api/users/:id
     * Returns a specific user by ID
     */
    fastify.get("/users/:id", async (req, reply) => {
        const { id } = req.params;
        const dbUser = await db_1.db.getUserById(id);
        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }
        const followersCount = await db_1.db.getFollowersCount(dbUser.id);
        const followsCount = await db_1.db.getFollowingCount(dbUser.id);
        const user = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            website: dbUser.website,
            location: dbUser.location,
            bio: dbUser.bio,
            followersCount,
            followsCount
        };
        return user;
    });
    /**
     * PUT /api/me
     * Updates the authenticated user's profile
     */
    fastify.put("/me", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.userUpdateSchema,
    }, async (req, reply) => {
        const { displayName, bio, avatarUrl, website, location, username } = req.body;
        if (website && !(0, security_1.validateUrl)(website)) {
            return reply.code(400).send({ message: "Invalid website URL" });
        }
        if (avatarUrl && !(0, security_1.validateUrl)(avatarUrl)) {
            return reply.code(400).send({ message: "Invalid avatar URL" });
        }
        let newUsername;
        if (typeof username === "string" && username.trim().length > 0) {
            const lowered = username.trim().toLowerCase();
            if (!(0, security_1.validateUsername)(lowered)) {
                return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
            }
            const existing = await db_1.db.query("SELECT id FROM users WHERE username = $1 AND id <> $2", [lowered, req.auth.id]);
            if ((existing.rowCount ?? 0) > 0) {
                return reply.code(409).send({ message: "Username already taken" });
            }
            newUsername = lowered;
        }
        const query = `
            UPDATE users 
            SET display_name = COALESCE($1, display_name),
                bio = COALESCE($2, bio),
                avatar_url = COALESCE($3, avatar_url),
                website = COALESCE($4, website),
                location = COALESCE($5, location),
                username = COALESCE($6, username),
                updated_at = NOW()
            WHERE id = $7
            RETURNING id, username, display_name, email, avatar_url, website, location, bio, followers_count, follows_count, role, is_private, created_at, updated_at;
        `;
        const res = await db_1.db.query(query, [
            displayName ? (0, security_1.sanitizeText)(displayName, 64) : null,
            bio ? (0, security_1.sanitizeText)(bio, 500) : null,
            avatarUrl || null,
            website || null,
            location ? (0, security_1.sanitizeText)(location, 80) : null,
            newUsername || null,
            req.auth.id
        ]);
        if ((res.rowCount ?? 0) === 0) {
            return reply.code(404).send({ message: "User not found" });
        }
        const updatedUser = res.rows[0];
        return {
            id: updatedUser.id,
            username: updatedUser.username,
            displayName: updatedUser.display_name,
            email: updatedUser.email,
            avatarUrl: updatedUser.avatar_url,
            website: updatedUser.website,
            location: updatedUser.location,
            bio: updatedUser.bio,
            followersCount: updatedUser.followers_count,
            followsCount: updatedUser.follows_count
        };
    });
    /**
     * DELETE /api/me
     * Deletes the authenticated user after confirming identifier + password
     */
    fastify.delete("/me", { preHandler: fastify.requireAuth, schema: schemas_1.deleteAccountSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { identifier, password } = (req.body || {});
        if (!identifier || !password) {
            return reply.code(400).send({ message: "Username/email and password are required" });
        }
        const dbUser = await db_1.db.findUserByLoginIdentifier(identifier);
        if (!dbUser || dbUser.id !== userId) {
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }
        const isValidPassword = await db_1.db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }
        await db_1.db.revokeSessionsForUser(userId);
        await db_1.db.deleteUserAccount(userId);
        await db_1.db.insertSecurityLog({
            eventType: "delete_account",
            userId,
            details: { identifier },
        });
        return { ok: true };
    });
    /**
     * GET /api/username/check?u=
     * Check username availability
     */
    fastify.get("/username/check", { schema: schemas_1.usernameCheckSchema }, async (req, reply) => {
        const { u } = (req.query || {});
        if (!u)
            return reply.code(400).send({ message: "username required" });
        const candidate = u.toLowerCase();
        if (!(0, security_1.validateUsername)(candidate)) {
            return reply.code(400).send({ available: false, message: "invalid" });
        }
        const existing = await db_1.db.query("SELECT 1 FROM users WHERE username = $1 LIMIT 1", [candidate]);
        return { available: (existing.rowCount ?? 0) === 0 };
    });
    /**
     * POST /api/users/:id/follow
     * Follow a user (becomes accepted when mutual)
     */
    fastify.post("/users/:id/follow", { preHandler: fastify.requireAuth, schema: schemas_1.followSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { id: paramId } = req.params;
        const { friendId: bodyFriendId, username } = (req.body || {});
        let friendId = paramId || bodyFriendId || "";
        if (!friendId && username) {
            const u = await db_1.db.findUserByUsername(username);
            if (u?.id)
                friendId = u.id;
        }
        if (friendId === userId && username) {
            const u = await db_1.db.findUserByUsername(username);
            if (u?.id && u.id !== userId) {
                friendId = u.id;
            }
        }
        if (!friendId || friendId === userId) {
            return reply.code(400).send({ message: "Invalid user" });
        }
        const result = await db_1.db.followUser(userId, friendId);
        const { pushSocialActivity } = await import("../ws/socialBroadcast.js");
        pushSocialActivity(friendId);
        return { status: result.status };
    });
    // List incoming follow requests (for private accounts)
    fastify.get("/follow/requests", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const rows = await db_1.db.query(`SELECT f.user_id as id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending'`, [userId]);
        return { requests: rows.rows };
    });
    // Accept a follow request
    fastify.post("/follow/requests/:id/accept", { preHandler: fastify.requireAuth, schema: schemas_1.idParamSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        await db_1.db.acceptFollow(userId, id);
        const { pushSocialActivity } = await import("../ws/socialBroadcast.js");
        pushSocialActivity(id);
        return { ok: true };
    });
    /**
     * DELETE /api/users/:id/follow
     * Unfollow a user (removes mutual link)
     */
    fastify.delete("/users/:id/follow", { preHandler: fastify.requireAuth, schema: schemas_1.idParamSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { id: friendId } = req.params;
        if (!friendId || friendId === userId) {
            return reply.code(400).send({ message: "Invalid user" });
        }
        await db_1.db.unfollowUser(userId, friendId);
        return { ok: true };
    });
    /**
     * GET /api/friends
     * List accepted friends for current user
     */
    fastify.get("/friends", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const friends = await db_1.db.getFriends(userId);
        return { friends };
    });
    /**
     * GET /api/followers
     * List accepted followers for current user
     */
    fastify.get("/followers", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const followers = await db_1.db.getFollowers(userId);
        return { followers };
    });
    /**
     * GET /api/following
     * List accepted following for current user
     */
    fastify.get("/following", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const following = await db_1.db.getFollowing(userId);
        return { following };
    });
}
