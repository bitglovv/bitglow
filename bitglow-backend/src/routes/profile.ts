import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { users, JWT_SECRET } from "../services/store";
import { db } from "../services/db";

export async function profileRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/profile/me
     * Returns the currently authenticated user's profile
     */
    fastify.get("/me", async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ message: "Authorization required" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return reply.code(401).send({ message: "Malformed token" });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const dbUser = await db.getUserById(decoded.id);

            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }

            const friendsCount = await db.getFriendsCount(dbUser.id);
            const followersCount = await db.getFollowersCount(dbUser.id);
            const followsCount = await db.getFollowingCount(dbUser.id);

            // Map and sanitize
            const user = {
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

            return user;
        } catch (err) {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });

    /**
     * GET /api/profile/:username
     * Returns public profile data for a specific username
     */
    fastify.get("/:username", async (request, reply) => {
        const { username } = request.params as { username: string };

        // Find user by username
        const dbUser = await db.findUserByUsername(username);

        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const friendsCount = await db.getFriendsCount(dbUser.id);
        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);

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
            friendsCount
        };

        return user;
    });

    /**
     * GET /api/profile/admin/users
     * Admin endpoint to view all users
     */
    fastify.get("/admin/users", async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ message: "Authorization required" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return reply.code(401).send({ message: "Malformed token" });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const currentUser = await db.getUserById(decoded.id);

            if (!currentUser || currentUser.role !== 'admin') {
                return reply.code(403).send({ message: "Access denied. Admin role required." });
            }

            const allUsers = await db.getAllUsers();
            return { users: allUsers, count: allUsers.length };
        } catch (err) {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });
}
