"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmRoutes = dmRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../services/store");
const db_1 = require("../services/db");
function getAuthUserId(req, reply) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        reply.code(401).send({ message: "Authorization required" });
        return null;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        reply.code(401).send({ message: "Malformed token" });
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
        return decoded.id;
    }
    catch (err) {
        reply.code(401).send({ message: "Invalid or expired token" });
        return null;
    }
}
async function dmRoutes(fastify) {
    /**
     * GET /api/dms
     * List conversations for current user
     */
    fastify.get("/dms", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
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
    fastify.get("/dms/:userId", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
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
    fastify.post("/dms/:userId", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
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
        const saved = await db_1.db.saveDMMessage(convo.id, userId, text.trim());
        return {
            id: saved.id,
            senderId: saved.sender_id,
            text: saved.text,
            createdAt: new Date(saved.created_at).toISOString()
        };
    });
}
