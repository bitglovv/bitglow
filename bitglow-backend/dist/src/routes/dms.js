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
            unreadCount: 0
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
        const allowed = await db_1.db.isMutual(userId, otherId);
        if (!allowed) {
            return reply.code(403).send({ message: "You can only message friends" });
        }
        const convo = await db_1.db.getOrCreateDMConversation(userId, otherId);
        const messages = await db_1.db.getDMHistory(convo.id, 200);
        return messages.map((m) => ({
            id: m.id,
            senderId: m.sender_id,
            text: m.text,
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
        const { text } = req.body;
        if (!otherId || !text || !text.trim()) {
            return reply.code(400).send({ message: "Invalid message" });
        }
        const allowed = await db_1.db.isMutual(userId, otherId);
        if (!allowed) {
            return reply.code(403).send({ message: "You can only message friends" });
        }
        const convo = await db_1.db.getOrCreateDMConversation(userId, otherId);
        const saved = await db_1.db.saveDMMessage(convo.id, userId, (0, security_1.sanitizeText)(text.trim(), 2000));
        return {
            id: saved.id,
            senderId: saved.sender_id,
            text: saved.text,
            createdAt: new Date(saved.created_at).toISOString()
        };
    });
}
