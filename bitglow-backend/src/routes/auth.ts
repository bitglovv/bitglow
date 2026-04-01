import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import { JWT_SECRET } from "../services/store";
import { db } from "../services/db";

export async function authRoutes(fastify: FastifyInstance) {

    // Helpful pointers for developers trying to visit routes in browser
    fastify.get("/login", async () => ({ message: "Please use POST /api/auth/login with {email, password} to login." }));
    fastify.get("/signup", async () => ({ message: "Please use POST /api/auth/signup to create an account." }));

    fastify.post("/signup", async (req, reply) => {
        const { username, displayName, email, password } = req.body as any;

        if (!username || !email || !password) {
            return reply.code(400).send({ message: "Missing required fields" });
        }

        const existingUser = await db.findUserByEmail(email) || await db.findUserByUsername(username);
        if (existingUser) {
            return reply.code(409).send({ message: "Username or email already exists" });
        }

        const passwordHash = await db.hashPassword(password);
        
        const newUserObj = {
            id: randomUUID(),
            username,
            displayName: displayName || username,
            email,
            passwordHash,
            avatarUrl: null,
            bio: "New to BitGlow",
            followersCount: 0,
            followsCount: 0,
        };

        const dbUser = await db.createUser(newUserObj);

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

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        return { token, user };
    });

    fastify.post("/login", async (req, reply) => {
        const { email, password } = req.body as any;

        const dbUser = await db.findUserByEmail(email);

        if (!dbUser) {
            return reply.code(401).send({ message: "Invalid email or password" });
        }

        const isValidPassword = await db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ message: "Invalid email or password" });
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

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        return { token, user };
    });
}

