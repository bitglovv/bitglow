"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../services/store");
const db_1 = require("../services/db");
const isValidUsername = (username) => /^[a-z0-9._]{3,30}$/.test(username);
async function userRoutes(fastify) {
    const getAuthUserId = (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            reply.code(401).send({ message: "No token provided" });
            return null;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            reply.code(401).send({ message: "Malformed token" });
            return null;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            return decoded.id;
        }
        catch (err) {
            reply.code(401).send({ message: "Invalid token" });
            return null;
        }
    };
    /**
     * GET /api/me
     * Returns the authenticated user from DB
     */
    fastify.get("/me", async (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            const dbUser = await db_1.db.getUserById(decoded.id);
            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }
            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }
            const followersCount = await db_1.db.getFollowersCount(dbUser.id);
            const followsCount = await db_1.db.getFollowingCount(dbUser.id);
            // Map and sanitize
            const user = {
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
            return user;
        }
        catch (err) {
            return reply.code(401).send({ message: "Invalid token" });
        }
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
    fastify.put("/me", async (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            const { displayName, bio, avatarUrl, website, location, username } = req.body;
            let newUsername;
            if (typeof username === "string" && username.trim().length > 0) {
                const lowered = username.trim().toLowerCase();
                if (!isValidUsername(lowered)) {
                    return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
                }
                const existing = await db_1.db.query("SELECT id FROM users WHERE username = $1 AND id <> $2", [lowered, decoded.id]);
                if ((existing.rowCount ?? 0) > 0) {
                    return reply.code(409).send({ message: "Username already taken" });
                }
                newUsername = lowered;
            }
            // Update the user in the database
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
                displayName || null,
                bio || null,
                avatarUrl || null,
                website || null,
                location || null,
                newUsername || null,
                decoded.id
            ]);
            if ((res.rowCount ?? 0) === 0) {
                return reply.code(404).send({ message: "User not found" });
            }
            const updatedUser = res.rows[0];
            const user = {
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
            return user;
        }
        catch (err) {
            return reply.code(401).send({ message: "Invalid token" });
        }
    });
    /**
     * GET /api/username/check?u=
     * Check username availability
     */
    fastify.get("/username/check", async (req, reply) => {
        const { u } = (req.query || {});
        if (!u)
            return reply.code(400).send({ message: "username required" });
        const candidate = u.toLowerCase();
        if (!isValidUsername(candidate)) {
            return reply.code(400).send({ available: false, message: "invalid" });
        }
        const existing = await db_1.db.query("SELECT 1 FROM users WHERE username = $1 LIMIT 1", [candidate]);
        return { available: (existing.rowCount ?? 0) === 0 };
    });
    /**
     * POST /api/users/:id/follow
     * Follow a user (becomes accepted when mutual)
     */
    fastify.post("/users/:id/follow", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
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
        return { status: result.status };
    });
    // List incoming follow requests (for private accounts)
    fastify.get("/follow/requests", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const rows = await db_1.db.query(`SELECT f.user_id as id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending'`, [userId]);
        return { requests: rows.rows };
    });
    // Accept a follow request
    fastify.post("/follow/requests/:id/accept", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        await db_1.db.acceptFollow(userId, id);
        return { ok: true };
    });
    /**
     * DELETE /api/users/:id/follow
     * Unfollow a user (removes mutual link)
     */
    fastify.delete("/users/:id/follow", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
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
    fastify.get("/friends", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const friends = await db_1.db.getFriends(userId);
        return { friends };
    });
    /**
     * GET /api/followers
     * List accepted followers for current user
     */
    fastify.get("/followers", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const followers = await db_1.db.getFollowers(userId);
        return { followers };
    });
    /**
     * GET /api/following
     * List accepted following for current user
     */
    fastify.get("/following", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const following = await db_1.db.getFollowing(userId);
        return { following };
    });
}
