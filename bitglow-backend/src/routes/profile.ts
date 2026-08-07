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

        // Minimal public profile (visible to everyone)
        const minimalPublicProfile: any = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            // Expose privacy flag and online status visibility so frontend can display lock and presence appropriately
            isPrivate: dbUser.is_private,
            onlineStatusVisible: dbUser.online_status_visible,
        };

        const requesterId = await getOptionalRequesterId(request);
        // Authorized if requester is the owner, or the requester is a follower (one-way accepted) or mutual friend
        const isFollower = requesterId ? await db.isFollowing(requesterId, dbUser.id) : false;
        const isMutual = requesterId ? await db.areFriends(requesterId, dbUser.id) : false;
        const authorized = requesterId === dbUser.id || !!requesterId && (isFollower || isMutual);

        // If the account is private and requester is not authorized, return only the minimal profile fields.
        if (dbUser.is_private && !authorized) {
            return minimalPublicProfile;
        }

        // For authorized viewers return full profile including counts and profile fields.
        const publicProfile = {
            ...minimalPublicProfile,
            followersCount,
            followsCount,
            friendsCount,
            postsCount,
            createdAt: dbUser.created_at,
            bio: dbUser.bio,
            website: dbUser.website,
            location: dbUser.location,
        };
        return publicProfile;
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
