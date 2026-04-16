"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const store_1 = require("../services/store");
const db_1 = require("../services/db");
async function authRoutes(fastify) {
    // Helpful pointers for developers trying to visit routes in browser
    fastify.get("/login", async () => ({ message: "Please use POST /api/auth/login with {identifier, password} to login." }));
    fastify.get("/signup", async () => ({ message: "Please use POST /api/auth/signup to create an account." }));
    fastify.post("/signup", async (req, reply) => {
        const { username, displayName, email, password } = req.body;
        if (!username || !email || !password) {
            return reply.code(400).send({ message: "Missing required fields" });
        }
        const existingUser = await db_1.db.findUserByEmail(email) || await db_1.db.findUserByUsername(username);
        if (existingUser) {
            return reply.code(409).send({ message: "Username or email already exists" });
        }
        const passwordHash = await db_1.db.hashPassword(password);
        const newUserObj = {
            id: (0, crypto_1.randomUUID)(),
            username,
            displayName: displayName || username,
            email,
            passwordHash,
            avatarUrl: null,
            bio: "New to BitGlow",
            followersCount: 0,
            followsCount: 0,
        };
        const dbUser = await db_1.db.createUser(newUserObj);
        // Map fields
        const user = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name || dbUser.displayName,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url || dbUser.avatarUrl,
            bio: dbUser.bio,
            followersCount: dbUser.followers_count ?? dbUser.followersCount ?? 0,
            followsCount: dbUser.follows_count ?? dbUser.followsCount ?? 0
        };
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, store_1.JWT_SECRET);
        return { token, user };
    });
    fastify.post("/login", async (req, reply) => {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return reply.code(400).send({ message: "Username/email and password are required" });
        }
        const dbUser = await db_1.db.findUserByLoginIdentifier(identifier);
        if (!dbUser) {
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }
        const isValidPassword = await db_1.db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }
        const user = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name || dbUser.displayName,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url || dbUser.avatarUrl,
            bio: dbUser.bio,
            followersCount: dbUser.followers_count ?? dbUser.followersCount ?? 0,
            followsCount: dbUser.follows_count ?? dbUser.followsCount ?? 0
        };
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, store_1.JWT_SECRET);
        return { token, user };
    });
}
