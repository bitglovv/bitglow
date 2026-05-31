"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = settingsRoutes;
const db_1 = require("../services/db");
const security_1 = require("../services/security");
const schemas_1 = require("./schemas");
async function settingsRoutes(fastify) {
    /**
     * PUT /api/settings/email
     */
    fastify.put("/email", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const { currentPassword, newEmail } = req.body;
        const normalizedEmail = (0, security_1.normalizeIdentifier)(String(newEmail || ""));
        const ipAddress = (0, security_1.getRequestIp)(req);
        if (!currentPassword || !normalizedEmail) {
            return reply.code(400).send({ message: "Current password and new email are required" });
        }
        const dbUser = await db_1.db.getUserById(userId);
        if (!dbUser) {
            reply.code(404).send({ message: "User not found" });
            return;
        }
        const isValidPassword = await db_1.db.comparePassword(currentPassword, dbUser.password_hash);
        if (!isValidPassword) {
            await (0, security_1.logSecurityEvent)("change_email_failure", req, { ip: ipAddress }, userId);
            reply.code(401).send({ message: "Invalid current password" });
            return;
        }
        const existingUser = await db_1.db.findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== userId) {
            reply.code(409).send({ message: "Email already in use" });
            return;
        }
        await db_1.db.updateUserEmail(userId, normalizedEmail);
        await (0, security_1.logSecurityEvent)("change_email_success", req, { newEmail: normalizedEmail }, userId);
        return { ok: true, email: normalizedEmail };
    });
    /**
     * PUT /api/settings/password
     */
    fastify.put("/password", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const { currentPassword, newPassword } = req.body;
        const ipAddress = (0, security_1.getRequestIp)(req);
        if (!currentPassword || !newPassword) {
            reply.code(400).send({ message: "Current and new password are required" });
            return;
        }
        if (!(0, security_1.validatePassword)(String(newPassword))) {
            reply.code(400).send({ message: "New password must be at least 8 characters" });
            return;
        }
        const dbUser = await db_1.db.getUserById(userId);
        if (!dbUser) {
            reply.code(404).send({ message: "User not found" });
            return;
        }
        const isValidPassword = await db_1.db.comparePassword(currentPassword, dbUser.password_hash);
        if (!isValidPassword) {
            await (0, security_1.logSecurityEvent)("change_password_failure", req, { ip: ipAddress }, userId);
            reply.code(401).send({ message: "Invalid current password" });
            return;
        }
        const newHash = await db_1.db.hashPassword(newPassword);
        await db_1.db.updateUserPassword(userId, newHash);
        await db_1.db.revokeSessionsForUser(userId, req.auth.sessionId); // Revoke other sessions
        await (0, security_1.logSecurityEvent)("change_password_success", req, {}, userId);
        return { ok: true };
    });
    /**
     * PUT /api/settings/privacy
     */
    fastify.put("/privacy", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const { isPrivate } = req.body;
        if (typeof isPrivate !== "boolean") {
            reply.code(400).send({ message: "isPrivate must be a boolean" });
            return;
        }
        await db_1.db.updateUserPrivacy(userId, isPrivate);
        return { ok: true, isPrivate };
    });
    /**
     * PUT /api/settings/online-status
     */
    fastify.put("/online-status", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const { isVisible } = req.body;
        if (typeof isVisible !== "boolean") {
            reply.code(400).send({ message: "isVisible must be a boolean" });
            return;
        }
        await db_1.db.updateUserOnlineStatusVisible(userId, isVisible);
        return { ok: true, isVisible };
    });
    /**
     * GET /api/settings/blocked
     */
    fastify.get("/blocked", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const blockedUsers = await db_1.db.getBlockedUsers(userId);
        return { blockedUsers };
    });
    /**
     * POST /api/settings/blocked/:id
     */
    fastify.post("/blocked/:id", { preHandler: fastify.requireAuth, schema: schemas_1.idParamSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { id: blockedId } = req.params;
        if (userId === blockedId) {
            reply.code(400).send({ message: "Cannot block yourself" });
            return;
        }
        await db_1.db.blockUser(userId, blockedId);
        return { ok: true };
    });
    /**
     * DELETE /api/settings/blocked/:id
     */
    fastify.delete("/blocked/:id", { preHandler: fastify.requireAuth, schema: schemas_1.idParamSchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { id: unblockedId } = req.params;
        await db_1.db.unblockUser(userId, unblockedId);
        return { ok: true };
    });
    /**
     * GET /api/settings/saved
     */
    fastify.get("/saved", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const savedPosts = await db_1.db.getSavedPosts(userId);
        return { savedPosts };
    });
    /**
     * POST /api/reports
     */
    fastify.post("/reports", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth.id;
        const { type, reportedUserId, postId, reason } = req.body;
        if (!type || !reason) {
            reply.code(400).send({ message: "Type and reason are required" });
            return;
        }
        await db_1.db.saveReport(userId, type, reportedUserId, postId, reason);
        return { ok: true };
    });
}
