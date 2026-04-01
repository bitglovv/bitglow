import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/store";
import { db } from "../services/db";

const isValidUsername = (username: string) => /^[a-z0-9._]{3,30}$/.test(username);

export async function userRoutes(fastify: FastifyInstance) {
    const getAuthUserId = (req: any, reply: any): string | null => {
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
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return decoded.id;
        } catch (err) {
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
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const dbUser = await db.getUserById(decoded.id);
                    
            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }

            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }

            const followersCount = await db.getFollowersCount(dbUser.id);
            const followsCount = await db.getFollowingCount(dbUser.id);

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
        } catch (err) {
            return reply.code(401).send({ message: "Invalid token" });
        }
    });

    /**
     * GET /api/users
     * Returns all users (public info)
     */
    fastify.get("/users", async (req, reply) => {
        const users = await db.getAllUsers();
        return users;
    });

    /**
     * GET /api/users/:id
     * Returns a specific user by ID
     */
    fastify.get("/users/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const dbUser = await db.getUserById(id);

        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);

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
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            
            const { displayName, bio, avatarUrl, website, location, username } = req.body as any;

            let newUsername: string | undefined;
            if (typeof username === "string" && username.trim().length > 0) {
                const lowered = username.trim().toLowerCase();
                if (!isValidUsername(lowered)) {
                    return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
                }
                const existing = await db.query("SELECT id FROM users WHERE username = $1 AND id <> $2", [lowered, decoded.id]);
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
            
            const res = await db.query(query, [
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
        } catch (err) {
            return reply.code(401).send({ message: "Invalid token" });
        }
    });

    /**
     * GET /api/username/check?u=
     * Check username availability
     */
    fastify.get("/username/check", async (req, reply) => {
        const { u } = (req.query || {}) as { u?: string };
        if (!u) return reply.code(400).send({ message: "username required" });
        const candidate = u.toLowerCase();
        if (!isValidUsername(candidate)) {
            return reply.code(400).send({ available: false, message: "invalid" });
        }
        const existing = await db.query("SELECT 1 FROM users WHERE username = $1 LIMIT 1", [candidate]);
        return { available: (existing.rowCount ?? 0) === 0 };
    });

    /**
     * POST /api/users/:id/follow
     * Follow a user (becomes accepted when mutual)
     */
    fastify.post("/users/:id/follow", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const { id: paramId } = req.params as { id: string };
        const { friendId: bodyFriendId, username } = (req.body || {}) as { friendId?: string; username?: string };
        let friendId = paramId || bodyFriendId || "";

        if (!friendId && username) {
            const u = await db.findUserByUsername(username);
            if (u?.id) friendId = u.id;
        }

        if (friendId === userId && username) {
            const u = await db.findUserByUsername(username);
            if (u?.id && u.id !== userId) {
                friendId = u.id;
            }
        }

        if (!friendId || friendId === userId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        const result = await db.followUser(userId, friendId);
        return { status: result.status };
    });

    // List incoming follow requests (for private accounts)
    fastify.get("/follow/requests", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const rows = await db.query(
            `SELECT f.user_id as id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending'`,
            [userId]
        );
        return { requests: rows.rows };
    });

    // Accept a follow request
    fastify.post("/follow/requests/:id/accept", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        await db.acceptFollow(userId, id);
        return { ok: true };
    });

    /**
     * DELETE /api/users/:id/follow
     * Unfollow a user (removes mutual link)
     */
    fastify.delete("/users/:id/follow", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const { id: friendId } = req.params as { id: string };
        if (!friendId || friendId === userId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        await db.unfollowUser(userId, friendId);
        return { ok: true };
    });

    /**
     * GET /api/friends
     * List accepted friends for current user
     */
    fastify.get("/friends", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const friends = await db.getFriends(userId);
        return { friends };
    });

    /**
     * GET /api/followers
     * List accepted followers for current user
     */
    fastify.get("/followers", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const followers = await db.getFollowers(userId);
        return { followers };
    });

    /**
     * GET /api/following
     * List accepted following for current user
     */
    fastify.get("/following", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const following = await db.getFollowing(userId);
        return { following };
    });
}
