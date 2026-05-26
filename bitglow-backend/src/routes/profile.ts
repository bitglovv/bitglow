import { FastifyInstance } from "fastify";
import { db } from "../services/db";
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

        const user = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            bio: dbUser.bio,
            website: dbUser.website,
            location: dbUser.location,
            followersCount,
            followsCount,
            friendsCount,
            postsCount,
            createdAt: dbUser.created_at
        };

        return user;
    });

    /**
     * GET /api/profile/admin/users
     * Admin endpoint to view all users
     */
    fastify.get("/admin/users", { preHandler: fastify.requireAdmin }, async () => {
        const allUsers = await db.getAllUsers();
        return { users: allUsers, count: allUsers.length };
    });
}
