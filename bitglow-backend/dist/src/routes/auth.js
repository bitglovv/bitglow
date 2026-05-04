"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const crypto_1 = require("crypto");
const db_1 = require("../services/db");
const security_1 = require("../services/security");
const schemas_1 = require("./schemas");
async function authRoutes(fastify) {
    // Helpful pointers for developers trying to visit routes in browser
    fastify.get("/login", async () => ({ message: "Please use POST /api/auth/login with {identifier, password} to login." }));
    fastify.get("/signup", async () => ({ message: "Please use POST /api/auth/signup to create an account." }));
    fastify.post("/signup", {
        config: {
            rateLimit: { max: 3, timeWindow: "1 hour" },
        },
        schema: schemas_1.authSignupSchema,
    }, async (req, reply) => {
        const { username, displayName, email, password } = req.body;
        const normalizedUsername = (0, security_1.normalizeIdentifier)(String(username || ""));
        const normalizedEmail = (0, security_1.normalizeIdentifier)(String(email || ""));
        if (!normalizedUsername || !normalizedEmail || !password) {
            return reply.code(400).send({ message: "Missing required fields" });
        }
        if (!(0, security_1.validateUsername)(normalizedUsername)) {
            return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
        }
        if (!(0, security_1.validatePassword)(String(password))) {
            return reply.code(400).send({ message: "Password must be at least 8 characters" });
        }
        const existingUser = await db_1.db.findUserByEmail(normalizedEmail) || await db_1.db.findUserByUsername(normalizedUsername);
        if (existingUser) {
            return reply.code(409).send({ message: "Username or email already exists" });
        }
        const passwordHash = await db_1.db.hashPassword(password);
        const newUserObj = {
            id: (0, crypto_1.randomUUID)(),
            username: normalizedUsername,
            displayName: (0, security_1.sanitizeText)(displayName || normalizedUsername, 64) || normalizedUsername,
            email: normalizedEmail,
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
        const token = (0, security_1.issueAccessToken)({ id: user.id, username: user.username, sid: (0, crypto_1.randomUUID)() });
        await (0, security_1.createSession)(user.id, token, req);
        await db_1.db.pruneUserSessions(user.id, 5);
        await (0, security_1.logSecurityEvent)("signup", req, { identifier: normalizedEmail }, user.id);
        return { token, user };
    });
    fastify.post("/login", {
        config: {
            rateLimit: { max: 30, timeWindow: "15 minutes" },
        },
        schema: schemas_1.authLoginSchema,
    }, async (req, reply) => {
        const { identifier, password } = req.body;
        const normalizedIdentifier = (0, security_1.normalizeIdentifier)(String(identifier || ""));
        const ipAddress = (0, security_1.getRequestIp)(req);
        if (!normalizedIdentifier || !password) {
            return reply.code(400).send({ message: "Username/email and password are required" });
        }
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const failureCountHour = await db_1.db.countSecurityEvents("login_failure", normalizedIdentifier, oneHourAgo);
        const recentLockout = await db_1.db.getLatestSecurityEvent("login_lockout", normalizedIdentifier, thirtyMinutesAgo);
        const recentFailuresByIp = await db_1.db.query(`SELECT COUNT(*)::int AS count
             FROM security_logs
             WHERE event_type = 'login_failure'
               AND details->>'identifier' = $1
               AND ip_address = $2
               AND created_at >= $3`, [normalizedIdentifier, ipAddress, fifteenMinutesAgo]);
        if (recentLockout) {
            return reply.code(429).send({ message: "Too many failed login attempts. Please try again later." });
        }
        if ((recentFailuresByIp.rows[0]?.count || 0) >= 5 || failureCountHour >= 10) {
            await (0, security_1.logSecurityEvent)("login_lockout", req, { identifier: normalizedIdentifier, ip: ipAddress });
            await db_1.db.insertSecurityLog({
                eventType: "security_alert",
                ipAddress,
                userAgent: req.headers["user-agent"]?.toString(),
                details: { type: "login_lockout", identifier: normalizedIdentifier },
            });
            return reply.code(429).send({ message: "Too many failed login attempts. Please try again later." });
        }
        const dbUser = await db_1.db.findUserByLoginIdentifier(normalizedIdentifier);
        if (!dbUser) {
            await (0, security_1.compareAgainstFakeHash)(String(password));
            await (0, security_1.logSecurityEvent)("login_failure", req, { identifier: normalizedIdentifier, ip: ipAddress });
            return reply.code(401).send({ message: "Invalid username/email or password" });
        }
        const isValidPassword = await db_1.db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            await (0, security_1.logSecurityEvent)("login_failure", req, { identifier: normalizedIdentifier, ip: ipAddress }, dbUser.id);
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
        const token = (0, security_1.issueAccessToken)({ id: user.id, username: user.username, sid: (0, crypto_1.randomUUID)() });
        await (0, security_1.createSession)(user.id, token, req);
        await db_1.db.pruneUserSessions(user.id, 5);
        await (0, security_1.logSecurityEvent)("login_success", req, { identifier: normalizedIdentifier }, user.id);
        return { token, user };
    });
    fastify.post("/logout", { schema: schemas_1.logoutSchema }, async (req, reply) => {
        await fastify.requireAuth(req, reply);
        if (reply.sent)
            return;
        await db_1.db.revokeSessionsForUser(req.auth.id);
        await (0, security_1.logSecurityEvent)("logout", req, {}, req.auth?.id);
        return { ok: true };
    });
}
