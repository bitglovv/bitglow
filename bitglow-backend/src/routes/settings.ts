import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { getRequestIp, logSecurityEvent, normalizeIdentifier, sanitizeText, validatePassword } from "../services/security";
import {
    emailUpdateSchema,
    idParamSchema,
    onlineStatusUpdateSchema,
    passwordUpdateSchema,
    privacyUpdateSchema,
    reportSchema,
} from "./schemas";

export async function settingsRoutes(fastify: FastifyInstance) {
    /**
     * PUT /api/settings/email
     */
    fastify.put("/email", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
        schema: emailUpdateSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { currentPassword, newEmail } = req.body as any;
        const normalizedEmail = normalizeIdentifier(String(newEmail || ""));
        const ipAddress = getRequestIp(req);

        if (!currentPassword || !normalizedEmail) {
            return reply.code(400).send({ message: "Current password and new email are required" });
        }

        const dbUser = await db.getUserWithPasswordHash(userId);
        if (!dbUser) {
            reply.code(404).send({ message: "User not found" });
            return;
        }

        const isValidPassword = await db.comparePassword(currentPassword, dbUser.password_hash);
        if (!isValidPassword) {
            await logSecurityEvent("change_email_failure", req, { ip: ipAddress }, userId);
            reply.code(401).send({ message: "Invalid current password" });
            return;
        }

        const existingUser = await db.findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== userId) {
            reply.code(409).send({ message: "Email already in use" });
            return;
        }

        await db.updateUserEmail(userId, normalizedEmail);
        await logSecurityEvent("change_email_success", req, { newEmail: normalizedEmail }, userId);

        return { ok: true, email: normalizedEmail };
    });

    /**
     * PUT /api/settings/password
     */
    fastify.put("/password", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
        schema: passwordUpdateSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { currentPassword, newPassword } = req.body as any;
        const ipAddress = getRequestIp(req);

        if (!currentPassword || !newPassword) {
            reply.code(400).send({ message: "Current and new password are required" });
            return;
        }

        if (!validatePassword(String(newPassword))) {
            reply.code(400).send({ message: "New password must be at least 8 characters" });
            return;
        }

        const dbUser = await db.getUserWithPasswordHash(userId);
        if (!dbUser) {
            reply.code(404).send({ message: "User not found" });
            return;
        }

        const isValidPassword = await db.comparePassword(currentPassword, dbUser.password_hash);
        if (!isValidPassword) {
            await logSecurityEvent("change_password_failure", req, { ip: ipAddress }, userId);
            reply.code(401).send({ message: "Invalid current password" });
            return;
        }

        const newHash = await db.hashPassword(newPassword);
        await db.updateUserPassword(userId, newHash);
        await db.revokeSessionsForUser(userId, req.auth!.sessionId); // Revoke other sessions
        await logSecurityEvent("change_password_success", req, {}, userId);

        return { ok: true };
    });

    /**
     * PUT /api/settings/privacy
     */
    fastify.put("/privacy", { preHandler: fastify.requireAuth, schema: privacyUpdateSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { isPrivate } = req.body as any;

        if (typeof isPrivate !== "boolean") {
            reply.code(400).send({ message: "isPrivate must be a boolean" });
            return;
        }

        await db.updateUserPrivacy(userId, isPrivate);
        return { ok: true, isPrivate };
    });

    /**
     * PUT /api/settings/online-status
     */
    fastify.put("/online-status", { preHandler: fastify.requireAuth, schema: onlineStatusUpdateSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { isVisible } = req.body as any;

        if (typeof isVisible !== "boolean") {
            reply.code(400).send({ message: "isVisible must be a boolean" });
            return;
        }

        await db.updateUserOnlineStatusVisible(userId, isVisible);
        return { ok: true, isVisible };
    });

    /**
     * GET /api/settings/blocked
     */
    fastify.get("/blocked", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;
        const blockedUsers = await db.getBlockedUsers(userId);
        return { blockedUsers };
    });

    /**
     * POST /api/settings/blocked/:id
     */
    fastify.post("/blocked/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id: blockedId } = req.params as { id: string };

        if (userId === blockedId) {
            reply.code(400).send({ message: "Cannot block yourself" });
            return;
        }

        const blockedUser = await db.getUserById(blockedId);
        if (!blockedUser) return reply.code(404).send({ message: "User not found" });
        await db.blockUser(userId, blockedId);
        return { ok: true };
    });

    /**
     * DELETE /api/settings/blocked/:id
     */
    fastify.delete("/blocked/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id: unblockedId } = req.params as { id: string };

        await db.unblockUser(userId, unblockedId);
        return { ok: true };
    });

    /**
     * GET /api/settings/saved
     */
    fastify.get("/saved", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;
        const savedPosts = await db.getSavedPosts(userId);
        return { savedPosts };
    });

    /**
     * POST /api/reports
     */
    fastify.post("/reports", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
        schema: reportSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { type, reportedUserId, postId, reason } = req.body as any;

        if (!type || !reason) {
            reply.code(400).send({ message: "Type and reason are required" });
            return;
        }

        if ((type === "account" && !reportedUserId) || (type === "post" && !postId)) {
            return reply.code(400).send({ message: "Report target is required" });
        }
        await db.saveReport(userId, type, reportedUserId, postId, sanitizeText(reason, 1000));
        return { ok: true };
    });
}

