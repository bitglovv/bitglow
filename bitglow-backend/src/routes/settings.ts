import { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";
import { db } from "../services/db";
import { getRequestIp, hashToken, logSecurityEvent, normalizeIdentifier, sanitizeText, validatePassword } from "../services/security";
import { sendEmailChangedNotification, sendPasswordChangedNotification } from "../services/email";
import { VerificationService } from "../services/verification/VerificationService";
import { broadcastUserRelationshipUpdate, disconnectUserSockets, clients, broadcastUserStatus } from "../ws";
import {
    emailConfirmSchema,
    emailResendSchema,
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

        const rawToken = randomBytes(32).toString("hex");
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

        await db.createEmailChangeToken(userId, normalizedEmail, tokenHash, expiresAt);
        await VerificationService.requestVerification(userId, "change_email", "email", { ipAddress }, normalizedEmail);

        await logSecurityEvent("change_email_requested", req, { newEmail: normalizedEmail }, userId);

        return { ok: true, message: "A verification code has been sent to the new address." };
    });

    fastify.post("/email/verify", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
        schema: emailConfirmSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { otpCode } = req.body as any;
        const ipAddress = getRequestIp(req);

        if (!otpCode || typeof otpCode !== "string") {
            return reply.code(400).send({ message: "Verification code is required" });
        }

        const pending = await db.getPendingEmailChangeTokenByUser(userId);
        if (!pending) {
            return reply.code(400).send({ message: "No pending email change request found. Please request a new verification code." });
        }

        if (new Date(pending.expires_at).getTime() < Date.now()) {
            return reply.code(400).send({ message: "The pending email change request has expired. Please request a new code." });
        }

        const verificationResult = await VerificationService.verifyCode(userId, "change_email", otpCode, { ipAddress });
        if (!verificationResult.success) {
            await logSecurityEvent("change_email_verify_failure", req, { reason: verificationResult.reason, attemptsLeft: verificationResult.attemptsLeft }, userId);
            return reply.code(400).send({ message: verificationResult.message });
        }

        const dbUser = await db.getUserById(userId);
        const oldEmail = dbUser?.email || null;
        await db.updateUserEmail(userId, pending.new_email);
        await db.markEmailChangeTokenUsed(pending.id);
        await sendEmailChangedNotification(oldEmail ?? pending.new_email, pending.new_email, dbUser?.username || "");
        await db.revokeSessionsForUser(userId);
        await disconnectUserSockets(userId);

        await logSecurityEvent("change_email_success", req, { oldEmail, newEmail: pending.new_email }, userId);

        return { ok: true, message: "Email updated successfully. Please sign in again." };
    });

    fastify.post("/email/resend", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
        schema: emailResendSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const ipAddress = getRequestIp(req);
        const pending = await db.getPendingEmailChangeTokenByUser(userId);

        if (!pending) {
            return reply.code(400).send({ message: "No active email change request found." });
        }

        if (new Date(pending.expires_at).getTime() < Date.now()) {
            return reply.code(400).send({ message: "Your pending email change request has expired. Please start again." });
        }

        await VerificationService.requestVerification(userId, "change_email", "email", { ipAddress }, pending.new_email);
        await logSecurityEvent("change_email_resend", req, { newEmail: pending.new_email }, userId);

        return { ok: true, message: "A new verification code has been sent to your new email address." };
    });

    fastify.get("/verify-email", {
        config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    }, async (req, reply) => {
        const { token } = req.query as any;

        if (!token) {
            return reply.code(400).send({ message: "Verification token is required" });
        }

        const tokenHash = hashToken(token);
        const changeToken = await db.getEmailChangeToken(tokenHash);

        if (!changeToken) {
            return reply.code(400).send({ message: "Invalid or expired token" });
        }

        if (changeToken.used_at) {
            return reply.code(400).send({ message: "Token has already been used" });
        }

        if (new Date(changeToken.expires_at).getTime() < Date.now()) {
            return reply.code(400).send({ message: "Token has expired" });
        }

        // Update the user's email
        await db.updateUserEmail(changeToken.user_id, changeToken.new_email);
        
        // Mark token as used
        await db.markEmailChangeTokenUsed(changeToken.id);

        await logSecurityEvent("change_email_success", req, { newEmail: changeToken.new_email }, changeToken.user_id);

        return { ok: true, message: "Email updated successfully" };
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
        const updatedUser = await db.getUserById(userId);
        await sendPasswordChangedNotification(updatedUser?.email || "", updatedUser?.username || "");
        await db.revokeSessionsForUser(userId);
        await disconnectUserSockets(userId);
        await logSecurityEvent("change_password_success", req, {}, userId);

        return { ok: true, message: "Password updated successfully. Please sign in again." };
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

        const updatedUser = await db.updateUserPrivacy(userId, isPrivate);
        if (!updatedUser) {
            return reply.code(404).send({ message: "User not found" });
        }

        return { ok: true, isPrivate: updatedUser.is_private };
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

        // Update any active WebSocket client metadata for this user so future presence broadcasts respect the new visibility.
        try {
            for (const c of clients) {
                if (c.userId === userId) {
                    c.onlineVisible = isVisible;
                }
            }

            if (isVisible) {
                // If the user turned visibility ON, broadcast their current online state (true if any active authenticated connection exists)
                const currentlyOnline = Array.from(clients).some((c) => c.userId === userId && c.isAuth);
                broadcastUserStatus(userId, Boolean(currentlyOnline), clients, true);
            } else {
                // If turned OFF, broadcast that presence is not visible so frontends can hide indicators
                broadcastUserStatus(userId, false, clients, false);
            }
        } catch (err) {
            // Non-fatal: if WS subsystem is unavailable, still persist DB change.
            console.warn("Failed to propagate online-status change to WebSocket clients:", err);
        }

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
        broadcastUserRelationshipUpdate(userId, blockedId, "block");
        return { ok: true, user: blockedUser };
    });

    /**
     * DELETE /api/settings/blocked/:id
     */
    fastify.delete("/blocked/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id: unblockedId } = req.params as { id: string };

        await db.unblockUser(userId, unblockedId);
        broadcastUserRelationshipUpdate(userId, unblockedId, "unblock");
        return { ok: true };
    });

    /**
     * GET /api/settings/muted
     */
    fastify.get("/muted", { preHandler: fastify.requireAuth }, async (req, reply) => {
        const userId = req.auth!.id;
        const mutedUsers = await db.getMutedUsers(userId);
        return { mutedUsers };
    });

    /**
     * POST /api/settings/muted/:id
     */
    fastify.post("/muted/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id: mutedId } = req.params as { id: string };

        if (userId === mutedId) {
            reply.code(400).send({ message: "Cannot mute yourself" });
            return;
        }

        const userToMute = await db.getUserById(mutedId);
        if (!userToMute) return reply.code(404).send({ message: "User not found" });
        await db.muteUser(userId, mutedId);
        broadcastUserRelationshipUpdate(userId, mutedId, "mute");
        return { ok: true, user: userToMute };
    });

    /**
     * DELETE /api/settings/muted/:id
     */
    fastify.delete("/muted/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id: unmutedId } = req.params as { id: string };

        await db.unmuteUser(userId, unmutedId);
        broadcastUserRelationshipUpdate(userId, unmutedId, "unmute");
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

