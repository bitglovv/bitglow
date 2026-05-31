"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmRoutes = dmRoutes;
const db_1 = require("../services/db");
const security_1 = require("../services/security");
const schemas_1 = require("./schemas");
async function dmRoutes(fastify) {
    /**
     * GET /api/dms
     * List conversations for current user
     */
    fastify.get("/dms", { preHandler: fastify.requireAuth }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const rows = await db_1.db.listDMConversations(userId);
        const conversations = rows.map((r) => ({
            userId: r.other_id,
            username: r.other_username,
            displayName: r.other_display_name || r.other_username,
            avatarUrl: r.other_avatar_url,
            lastMessage: r.last_message || "",
            lastMessageSenderId: r.last_message_sender_id || null,
            lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
            unreadCount: Number(r.unread_count || 0)
        }));
        return conversations;
    });
    /**
     * GET /api/dms/:userId
     * Get message history with a specific user
     */
    fastify.get("/dms/:userId", { preHandler: fastify.requireAuth, schema: schemas_1.dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const { userId: otherId } = req.params;
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }
        // Open messaging enabled
        const convo = await db_1.db.getOrCreateDMConversation(userId, otherId);
        const messages = await db_1.db.getDMHistory(convo.id, 200);
        await db_1.db.markDMConversationRead(convo.id, userId);
        return messages.map((m) => ({
            id: m.id,
            senderId: m.sender_id,
            text: m.text,
            type: m.type || 'text',
            postId: m.post_id,
            profileId: m.profile_id,
            createdAt: new Date(m.created_at).toISOString()
        }));
    });
    /**
     * POST /api/dms/:userId
     * Send a message to a user (friends only)
     */
    fastify.post("/dms/:userId", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.dmSendSchema,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const { userId: otherId } = req.params;
        const { text, type, postId, profileId } = req.body;
        if (!otherId || !text || !text.trim()) {
            return reply.code(400).send({ message: "Invalid message" });
        }
        // Open messaging enabled
        const convo = await db_1.db.getOrCreateDMConversation(userId, otherId);
        const saved = await db_1.db.saveDMMessage(convo.id, userId, (0, security_1.sanitizeText)(text.trim(), 2000), type || 'text', postId, profileId);
        return {
            id: saved.id,
            senderId: saved.sender_id,
            text: saved.text,
            type: saved.type,
            postId: saved.post_id,
            profileId: saved.profile_id,
            createdAt: new Date(saved.created_at).toISOString()
        };
    });
    /**
     * POST /api/dms/:userId/read
     * Mark all incoming messages in this conversation as read.
     */
    fastify.post("/dms/:userId/read", { preHandler: fastify.requireAuth, schema: schemas_1.dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const { userId: otherId } = req.params;
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }
        const convo = await db_1.db.getDMConversation(userId, otherId);
        if (!convo) {
            return { ok: true, readCount: 0 };
        }
        const readCount = await db_1.db.markDMConversationRead(convo.id, userId);
        return { ok: true, readCount };
    });
    /**
     * DELETE /api/dms/:userId
     * Delete a conversation (used for rejecting requests)
     */
    fastify.delete("/dms/:userId", { preHandler: fastify.requireAuth, schema: schemas_1.dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const { userId: otherId } = req.params;
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }
        // Delete the DM conversation
        const convRes = await db_1.db.query(`SELECT id FROM dm_conversations
             WHERE (user_a = $1 AND user_b = $2)
                OR (user_a = $2 AND user_b = $1)`, [userId, otherId]);
        if (convRes.rowCount && convRes.rowCount > 0) {
            for (const row of convRes.rows) {
                await db_1.db.query('DELETE FROM dm_messages WHERE conversation_id = $1', [row.id]);
                await db_1.db.query('DELETE FROM dm_conversations WHERE id = $1', [row.id]);
            }
        }
        return { ok: true };
    });
}
