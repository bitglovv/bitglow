import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { hashToken, parseBearerToken, verifyAccessToken } from "../services/security";
import { profileUsernameSchema } from "./schemas";

export async function profileRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/profile/me
     * Returns the currently authenticated user's profile
     */
    fastify.get("/me", { preHandler: fastify.requireAuth }, async (request, reply) => {
        const dbUser = await db.getUserById(request.auth!.id);
        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const friendsCount = await db.getFriendsCount(dbUser.id);
        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);

        return {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url,
            bio: dbUser.bio,
            website: dbUser.website,
            location: dbUser.location,
            followersCount,
            followsCount,
            friendsCount
        };
    });

    /**
     * GET /api/profile/:username
     * Returns public profile data for a specific username
     */
    fastify.get("/:username", { schema: profileUsernameSchema }, async (request, reply) => {
        const { username } = request.params as { username: string };

        // Find user by username
        const dbUser = await db.findUserByUsername(username);

        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const friendsCount = await db.getFriendsCount(dbUser.id);
        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);
        
        const postsRes = await db.query('SELECT COUNT(*)::int FROM posts WHERE author_id = $1', [dbUser.id]);
        const postsCount = postsRes.rows[0].count;

        const publicProfile = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            followersCount,
            followsCount,
            friendsCount,
            postsCount,
            createdAt: dbUser.created_at
        };

        const requesterId = await getOptionalRequesterId(request);
        const authorized = requesterId === dbUser.id || (!!requesterId && await db.areFriends(requesterId, dbUser.id));

        if (dbUser.is_private && !authorized) {
            return publicProfile;
        }

        return {
            ...publicProfile,
            bio: dbUser.bio,
            website: dbUser.website,
            location: dbUser.location,
        };
    });

    /**
     * GET /api/profile/admin/users
     * Admin endpoint to view all users
     */
    fastify.get("/admin/users", { preHandler: fastify.requireAdmin }, async () => {
        const allUsers = await db.getAllUsers(100, 0);
        return { users: allUsers, count: allUsers.length };
    });
}
async function getOptionalRequesterId(request: any) {
    const token = parseBearerToken(request.headers?.authorization);
    if (!token) return undefined;
    try {
        const decoded = verifyAccessToken(token);
        const session = await db.getActiveSessionByToken(hashToken(token));
        if (!session || session.user_id !== decoded.id || session.sid !== decoded.sid) return undefined;
        return decoded.id;
    } catch {
        return undefined;
    }
}
