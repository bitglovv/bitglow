import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { db } from "../services/db";
import {
    compareAgainstFakeHash,
    createSession,
    getRequestIp,
    hashToken,
    issueAccessToken,
    issueRefreshToken,
    logSecurityEvent,
    normalizeIdentifier,
    sanitizeText,
    validatePassword,
    validateUsername,
} from "../services/security";
import { env } from "../config/env";
import { authLoginSchema, authSignupSchema, logoutSchema, refreshSchema } from "./schemas";

export async function authRoutes(fastify: FastifyInstance) {

    // Helpful pointers for developers trying to visit routes in browser
    fastify.get("/login", async () => ({ message: "Please use POST /api/auth/login with {identifier, password} to login." }));
    fastify.get("/signup", async () => ({ message: "Please use POST /api/auth/signup to create an account." }));

    fastify.post("/signup", {
        config: {
            rateLimit: { max: 20, timeWindow: "1 hour" },
        },
        schema: authSignupSchema,
    }, async (req, reply) => {
        const { username, displayName, email, password } = req.body as any;
        const normalizedUsername = normalizeIdentifier(String(username || ""));
        const normalizedEmail = normalizeIdentifier(String(email || ""));

        if (!normalizedUsername || !normalizedEmail || !password) {
            return reply.code(400).send({ message: "Missing required fields" });
        }
        if (!validateUsername(normalizedUsername)) {
            return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
        }
        if (!validatePassword(String(password))) {
            return reply.code(400).send({ message: "Password must be at least 8 characters" });
        }

        const existingUser = await db.findUserByEmail(normalizedEmail) || await db.findUserByUsername(normalizedUsername);
        if (existingUser) {
            return reply.code(409).send({ message: "Username or email already exists" });
        }

        const passwordHash = await db.hashPassword(password);
        
        const newUserObj = {
            id: randomUUID(),
            username: normalizedUsername,
            displayName: sanitizeText(displayName || normalizedUsername, 64) || normalizedUsername,
            email: normalizedEmail,
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
            followsCount: dbUser.follows_count ?? dbUser.followsCount ?? 0,
            isPrivate: dbUser.is_private ?? false,
            onlineStatusVisible: dbUser.online_status_visible ?? true,
        };

        const sid = randomUUID();
        const token = issueAccessToken({ id: user.id, username: user.username, sid });
        const refreshToken = issueRefreshToken();
        await createSession(user.id, sid, token, refreshToken, req);
        await db.pruneUserSessions(user.id, 5);
        await logSecurityEvent("signup", req, { identifier: normalizedEmail }, user.id);
        return { token, refreshToken, user };
    });

    fastify.post("/login", {
        config: {
            rateLimit: { max: 30, timeWindow: "15 minutes" },
        },
        schema: authLoginSchema,
    }, async (req, reply) => {
        const { identifier, password } = req.body as any;
        const normalizedIdentifier = normalizeIdentifier(String(identifier || ""));
        const ipAddress = getRequestIp(req);

        if (!normalizedIdentifier || !password) {
            return reply.code(400).send({ message: "Username/email and password are required" });
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const failureCountHour = await db.countSecurityEvents("login_failure", normalizedIdentifier, oneHourAgo);
        const recentLockout = await db.getLatestSecurityEvent("login_lockout", normalizedIdentifier, thirtyMinutesAgo);
        const recentFailuresByIp = await db.query(
            `SELECT COUNT(*)::int AS count
             FROM security_logs
             WHERE event_type = 'login_failure'
               AND details->>'identifier' = $1
               AND ip_address = $2
               AND created_at >= $3`,
            [normalizedIdentifier, ipAddress, fifteenMinutesAgo]
        );

        if (recentLockout) {
            return reply.code(429).send({ message: "Too many failed login attempts. Please try again later." });
        }
        if ((recentFailuresByIp.rows[0]?.count || 0) >= 5 || failureCountHour >= 10) {
            await logSecurityEvent("login_lockout", req, { identifier: normalizedIdentifier, ip: ipAddress });
            await db.insertSecurityLog({
                eventType: "security_alert",
                ipAddress,
                userAgent: req.headers["user-agent"]?.toString(),
                details: { type: "login_lockout", identifier: normalizedIdentifier },
            });
            return reply.code(429).send({ message: "Too many failed login attempts. Please try again later." });
        }

        const dbUser = await db.findUserByLoginIdentifier(normalizedIdentifier);

        if (!dbUser) {
            await compareAgainstFakeHash(String(password));
            await logSecurityEvent("login_failure", req, { identifier: normalizedIdentifier, ip: ipAddress });
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }

        const isValidPassword = await db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            await logSecurityEvent("login_failure", req, { identifier: normalizedIdentifier, ip: ipAddress }, dbUser.id);
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
            followsCount: dbUser.follows_count ?? dbUser.followsCount ?? 0,
            isPrivate: dbUser.is_private,
            onlineStatusVisible: dbUser.online_status_visible,
        };

        const sid = randomUUID();
        const token = issueAccessToken({ id: user.id, username: user.username, sid });
        const refreshToken = issueRefreshToken();
        await createSession(user.id, sid, token, refreshToken, req);
        await db.pruneUserSessions(user.id, 5);
        await logSecurityEvent("login_success", req, { identifier: normalizedIdentifier }, user.id);
        return { token, refreshToken, user };
    });

    fastify.post("/logout", { schema: logoutSchema }, async (req, reply) => {
        await fastify.requireAuth(req, reply);
        if (reply.sent) return;
        await db.revokeSessionById(req.auth!.sessionId);
        await logSecurityEvent("logout", req, {}, req.auth?.id);
        return { ok: true };
    });

    fastify.post("/logout-all", { preHandler: fastify.requireAuth }, async (req) => {
        await db.revokeSessionsForUser(req.auth!.id);
        await logSecurityEvent("logout_all_devices", req, {}, req.auth!.id);
        return { ok: true };
    });

    fastify.post("/refresh", {
        config: { rateLimit: { max: 20, timeWindow: "15 minutes" } },
        schema: refreshSchema,
    }, async (req, reply) => {
        const { refreshToken } = req.body as { refreshToken: string };
        const currentHash = hashToken(refreshToken);
        const session = await db.getActiveSessionByRefreshToken(currentHash);
        if (!session) {
            return reply.code(401).send({ message: "Invalid or expired refresh token" });
        }
        const user = await db.getUserById(session.user_id);

if (!user) {
    await db.revokeSessionById(session.id);
    return reply.code(401).send({
        message: "Invalid or expired refresh token"
    });
}

if (user.is_banned) {
    await db.revokeSessionById(session.id);

    await logSecurityEvent(
        "token_refresh_denied",
        req,
        { reason: "account_disabled" },
        user.id
    );

    return reply.code(403).send({
        message: "Account has been disabled"
    });
}
       

        const token = issueAccessToken({ id: user.id, username: user.username, sid: session.sid });
        const nextRefreshToken = issueRefreshToken();
        const rotated = await db.rotateSession(
            currentHash,
            hashToken(token),
            hashToken(nextRefreshToken),
            new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000),
            new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000)
        );
        if (!rotated) {
            return reply.code(401).send({ message: "Invalid or expired refresh token" });
        }

        await logSecurityEvent("token_refresh", req, {}, user.id);
        return { token, refreshToken: nextRefreshToken };
    });
}


