"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = profileRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../services/store");
const db_1 = require("../services/db");
async function profileRoutes(fastify) {
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
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            const dbUser = await db_1.db.getUserById(decoded.id);
            if (!dbUser) {
                return reply.code(404).send({ message: "User not found" });
            }
            const friendsCount = await db_1.db.getFriendsCount(dbUser.id);
            const followersCount = await db_1.db.getFollowersCount(dbUser.id);
            const followsCount = await db_1.db.getFollowingCount(dbUser.id);
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
        }
        catch (err) {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });
    /**
     * GET /api/profile/:username
     * Returns public profile data for a specific username
     */
    fastify.get("/:username", async (request, reply) => {
        const { username } = request.params;
        // Find user by username
        const dbUser = await db_1.db.findUserByUsername(username);
        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }
        const friendsCount = await db_1.db.getFriendsCount(dbUser.id);
        const followersCount = await db_1.db.getFollowersCount(dbUser.id);
        const followsCount = await db_1.db.getFollowingCount(dbUser.id);
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
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            const currentUser = await db_1.db.getUserById(decoded.id);
            if (!currentUser || currentUser.role !== 'admin') {
                return reply.code(403).send({ message: "Access denied. Admin role required." });
            }
            const allUsers = await db_1.db.getAllUsers();
            return { users: allUsers, count: allUsers.length };
        }
        catch (err) {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });
}
