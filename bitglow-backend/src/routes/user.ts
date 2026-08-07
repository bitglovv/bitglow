import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { hashToken, parseBearerToken, validateUsername, sanitizeText, validateUrl, verifyAccessToken } from "../services/security";
import { deleteAccountSchema, followSchema, idParamSchema, paginationSchema, usernameCheckSchema, userUpdateSchema, requestAccountDeletionOtpSchema } from "./schemas";
import { uploadAvatar } from "../services/storage";
import { sendAccountDeletionEmail } from "../services/email";
import { VerificationService } from "../services/verification/VerificationService";
import { disconnectUserSockets } from "../ws";

export async function userRoutes(fastify: FastifyInstance) {

    /**
     * POST /api/upload/avatar
     * Uploads an avatar image and returns the public URL
     */
    fastify.post("/upload/avatar", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const data = await req.file();
        if (!data) {
            return reply.code(400).send({ message: "No file uploaded" });
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedMimeTypes.includes(data.mimetype)) {
            return reply.code(400).send({ message: "Invalid image format. Allowed: JPEG, PNG, WebP" });
        }

        const buffer = await data.toBuffer();
        if (buffer.length > 5 * 1024 * 1024) {
            return reply.code(400).send({ message: "File exceeds 5MB limit" });
        }

        try {
            const url = await uploadAvatar(req.auth!.id, buffer, data.mimetype);
            return { url };
        } catch (error) {
            return reply.code(500).send({ message: "Failed to upload avatar to storage" });
        }
    });
    /**
     * GET /api/me
     * Returns the authenticated user from DB
     */
    fastify.get("/me", { preHandler: fastify.requireAuth }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const dbUser = await db.getUserById(req.auth.id);
        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);

        return {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name || dbUser.displayName,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url || dbUser.avatarUrl,
            website: dbUser.website,
            location: dbUser.location,
            bio: dbUser.bio,
            followersCount,
            followsCount,
            isPrivate: dbUser.is_private,
            onlineStatusVisible: dbUser.online_status_visible,
        };
    });

    /**
     * GET /api/users
     * Returns all users (public info)
     */
    fastify.get("/users", { schema: paginationSchema }, async (req, reply) => {
        const requesterId = await getOptionalRequesterId(req);
        const { limit = "50", offset = "0" } = (req.query || {}) as { limit?: string; offset?: string };
        const users = await db.getAllUsers(Math.min(Number(limit) || 50, 100), Math.max(Number(offset) || 0, 0));
        const filtered = [];
        for (const user of users) {
            const authorized = requesterId === user.id || (!!requesterId && await db.areFriends(requesterId, user.id));
            filtered.push(filterPublicUser(user, authorized));
        }
        return filtered;
    });

    /**
     * GET /api/users/:id
     * Returns a specific user by ID
     */
    fastify.get("/users/:id", { schema: idParamSchema }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const dbUser = await db.getUserById(id);

        if (!dbUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        const followersCount = await db.getFollowersCount(dbUser.id);
        const followsCount = await db.getFollowingCount(dbUser.id);

        const requesterId = await getOptionalRequesterId(req);
        const authorized = requesterId === dbUser.id || (!!requesterId && await db.areFriends(requesterId, dbUser.id));
        return filterPublicUser({
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            website: dbUser.website,
            location: dbUser.location,
            bio: dbUser.bio,
            followersCount,
            followsCount,
            isPrivate: dbUser.is_private,
        }, authorized);
    });

    /**
     * PUT /api/me
     * Updates the authenticated user's profile
     */
    fastify.put("/me", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: userUpdateSchema,
    }, async (req, reply) => {
        const { displayName, bio, avatarUrl, website, location, username } = req.body as any;

        if (website && !validateUrl(website)) {
            return reply.code(400).send({ message: "Invalid website URL" });
        }
        if (avatarUrl && !validateUrl(avatarUrl)) {
            return reply.code(400).send({ message: "Invalid avatar URL" });
        }

        let newUsername: string | undefined;
        if (typeof username === "string" && username.trim().length > 0) {
            const lowered = username.trim().toLowerCase();
            if (!validateUsername(lowered)) {
                return reply.code(400).send({ message: "Invalid username. Use 3-30 chars: lowercase letters, numbers, dots, underscores." });
            }
            const existing = await db.query("SELECT id FROM users WHERE username = $1 AND id <> $2", [lowered, req.auth!.id]);
            if ((existing.rowCount ?? 0) > 0) {
                return reply.code(409).send({ message: "Username already taken" });
            }
            newUsername = lowered;
        }

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
            displayName ? sanitizeText(displayName, 64) : null,
            bio ? sanitizeText(bio, 500) : null,
            avatarUrl || null,
            website || null,
            location ? sanitizeText(location, 80) : null,
            newUsername || null,
            req.auth!.id
        ]);

        if ((res.rowCount ?? 0) === 0) {
            return reply.code(404).send({ message: "User not found" });
        }

        const updatedUser = res.rows[0];
        return {
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
    });

    /**
     * POST /api/me/request-deletion-otp
     * Re-authenticates password and requests a 6-digit Email OTP for account deletion verification.
     */
    fastify.post("/me/request-deletion-otp", { preHandler: fastify.requireAuth, schema: requestAccountDeletionOtpSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { password } = (req.body || {}) as { password?: string };

        if (!password) {
            return reply.code(400).send({ code: "INVALID_INPUT", message: "Current password is required to request deletion code." });
        }

        const dbUser = await db.getUserWithPasswordHash(userId);
        if (!dbUser) {
            return reply.code(404).send({ code: "USER_NOT_FOUND", message: "User account not found." });
        }

        const isValidPassword = await db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid current password." });
        }

        try {
            const result = await VerificationService.requestVerification(
                userId,
                "delete_account",
                "email",
                {
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]?.toString(),
                }
            );

            return {
                ok: true,
                code: "OTP_SENT",
                message: result.message || "A 6-digit verification code has been sent to your registered email address.",
                expiresAt: result.expiresAt,
            };
        } catch (err: any) {
            return reply.code(400).send({
                code: "VERIFICATION_REQUEST_FAILED",
                message: err.message || "Failed to request verification code.",
            });
        }
    });

    /**
     * DELETE /api/me
     * Multi-factor account deletion: Password + Email OTP + "DELETE" text confirmation.
     * Schedules account deletion for 30 days, deactivates account, revokes all sessions, closes WebSockets, and emails user.
     */
    fastify.delete("/me", { preHandler: fastify.requireAuth, schema: deleteAccountSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { password, otpCode, confirmText, reason } = (req.body || {}) as {
            password?: string;
            otpCode?: string;
            confirmText?: string;
            reason?: string;
        };

        if (!password) {
            return reply.code(400).send({ code: "INVALID_INPUT", message: "Current password is required to re-authenticate." });
        }

        if (!otpCode || otpCode.trim().length !== 6) {
            return reply.code(400).send({ code: "INVALID_INPUT", message: "A 6-digit verification code is required." });
        }

        if (!confirmText || confirmText.trim().toUpperCase() !== "DELETE") {
            return reply.code(400).send({ code: "INVALID_INPUT", message: "You must type 'DELETE' to confirm account deletion." });
        }

        // Fetch user from DB using authenticated JWT userId (NEVER trust frontend payload user/email/id)
        const dbUser = await db.getUserWithPasswordHash(userId);
        if (!dbUser) {
            return reply.code(404).send({ code: "USER_NOT_FOUND", message: "User account not found." });
        }

        // 1. Re-authenticate password
        const isValidPassword = await db.comparePassword(password, dbUser.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid current password." });
        }

        // 2. Verify Email OTP using reusable VerificationService
        const verifResult = await VerificationService.verifyCode(userId, "delete_account", otpCode, {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]?.toString(),
        });

        if (!verifResult.success) {
            return reply.code(400).send({
                code: verifResult.reason || "INVALID_OTP",
                message: verifResult.message,
                attemptsLeft: verifResult.attemptsLeft,
            });
        }

        // 3. Schedule account deletion (30-day grace period) & deactivate account immediately
        const audit = {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]?.toString(),
        };

        const result = await db.scheduleUserAccountDeletion(userId, reason, audit);

        // 4. Revoke all active sessions & refresh tokens for user
        await db.revokeSessionsForUser(userId);

        // 5. Disconnect active WebSocket connections for user
        disconnectUserSockets(userId);

        const scheduledDateStr = new Date(result.scheduled_deletion_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        // 6. Dispatch confirmation email with restoration instructions
        await sendAccountDeletionEmail(dbUser.email, dbUser.username, scheduledDateStr);

        return {
            ok: true,
            scheduledDeletionAt: result.scheduled_deletion_at,
            message: `Account scheduled for deletion on ${scheduledDateStr}. You have 30 days to log back in if you wish to restore it.`,
        };
    });

    /**
     * GET /api/username/check?u=
     * Check username availability
     */
    fastify.get("/username/check", { schema: usernameCheckSchema }, async (req, reply) => {
        const { u } = (req.query || {}) as { u?: string };
        if (!u) return reply.code(400).send({ message: "username required" });
        const candidate = u.toLowerCase();
        if (!validateUsername(candidate)) {
            return reply.code(400).send({ available: false, message: "invalid" });
        }
        const existing = await db.query("SELECT 1 FROM users WHERE username = $1 LIMIT 1", [candidate]);
        return { available: (existing.rowCount ?? 0) === 0 };
    });

    /**
     * POST /api/users/:id/follow
     * Follow a user (becomes accepted when mutual)
     */
    fastify.post("/users/:id/follow", { preHandler: fastify.requireAuth, schema: followSchema }, async (req, reply) => {
        const userId = req.auth!.id;

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
        if (result.status === "blocked") {
            return reply.code(403).send({ message: "Follow blocked" });
        }
        return { status: result.status };
    });

    // List incoming follow requests (for private accounts)
    fastify.get("/follow/requests", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;

        const rows = await db.query(
            `SELECT f.user_id as id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending' AND COALESCE(u.is_deleted, FALSE) = FALSE`,
            [userId]
        );
        return { requests: rows.rows };
    });

    // List outgoing follow requests
    fastify.get("/follow/pending", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;

        const rows = await db.query(
            `SELECT f.friend_id as id, u.username, u.display_name, u.avatar_url
             FROM friends f
             JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'pending' AND COALESCE(u.is_deleted, FALSE) = FALSE`,
            [userId]
        );
        return { pending: rows.rows };
    });

    // Accept a follow request
    fastify.post("/follow/requests/:id/accept", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const accepted = await db.acceptFollow(userId, id);
        if (!accepted) return reply.code(404).send({ message: "Follow request not found" });
        return { ok: true };
    });

    // Reject a follow request
    fastify.post("/follow/requests/:id/reject", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const rejected = await db.rejectFollow(userId, id);
        if (!rejected) return reply.code(404).send({ message: "Follow request not found" });
        return { ok: true };
    });

    /**
     * DELETE /api/users/:id/follow
     * Unfollow a user (removes mutual link)
     */
    fastify.delete("/users/:id/follow", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;

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
    fastify.get("/friends", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;

        const friends = await db.getFriends(userId);
        return { friends };
    });

    /**
     * GET /api/followers
     * List accepted followers for current user
     */
    fastify.get("/followers", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;

        const followers = await db.getFollowers(userId);
        return { followers };
    });

    /**
     * GET /api/following
     * List accepted following for current user
     */
    fastify.get("/following", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;

        const following = await db.getFollowing(userId);
        return { following };
    });
}

function filterPublicUser(user: any, isAuthorized = false) {
    const base = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.display_name,
        avatarUrl: user.avatarUrl || user.avatar_url,
        // Expose privacy flag so frontend can show lock icon & message
        isPrivate: user.isPrivate ?? user.is_private ?? false,
        // Expose online status visibility setting so frontend/presence logic can respect it
        onlineStatusVisible: user.onlineStatusVisible ?? user.online_status_visible ?? true,
    };

    // If the account is private and the requester is not authorized (not the owner or a follower/friend),
    // only return the minimal public-facing fields specified in the requirements: profile picture, display name, username, and online status visibility.
    if (base.isPrivate && !isAuthorized) {
        return base;
    }

    // For authorized viewers (owner or accepted follower/friend) return the full profile fields including bio, website, location and counts.
    return {
        ...base,
        website: user.website,
        location: user.location,
        bio: user.bio,
        followersCount: user.followersCount ?? user.followers_count ?? 0,
        followsCount: user.followsCount ?? user.follows_count ?? 0,
    };
}
async function getOptionalRequesterId(req: any) {
    const token = parseBearerToken(req.headers?.authorization);
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
