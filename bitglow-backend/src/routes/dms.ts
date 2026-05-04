import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { sanitizeText } from "../services/security";
import { dmSendSchema, dmUserSchema } from "./schemas";

export async function dmRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/dms
     * List conversations for current user
     */
    fastify.get("/dms", { preHandler: fastify.requireAuth }, async (req) => {
        const userId = req.auth!.id;

        const rows = await db.listDMConversations(userId);
        const conversations = rows.map((r: any) => ({
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
    fastify.get("/dms/:userId", { preHandler: fastify.requireAuth, schema: dmUserSchema }, async (req, reply) => {
        const userId = req.auth!.id;

        const { userId: otherId } = req.params as { userId: string };
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        const allowed = await db.isMutual(userId, otherId);
        if (!allowed) {
            return reply.code(403).send({ message: "You can only message friends" });
        }

        const convo = await db.getOrCreateDMConversation(userId, otherId);
        const messages = await db.getDMHistory(convo.id, 200);

        return messages.map((m: any) => ({
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
        schema: dmSendSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;

        const { userId: otherId } = req.params as { userId: string };
        const { text } = req.body as { text?: string };
        if (!otherId || !text || !text.trim()) {
            return reply.code(400).send({ message: "Invalid message" });
        }

        const allowed = await db.isMutual(userId, otherId);
        if (!allowed) {
            return reply.code(403).send({ message: "You can only message friends" });
        }

        const convo = await db.getOrCreateDMConversation(userId, otherId);
        const saved = await db.saveDMMessage(convo.id, userId, sanitizeText(text.trim(), 2000));

        return {
            id: saved.id,
            senderId: saved.sender_id,
            text: saved.text,
            createdAt: new Date(saved.created_at).toISOString()
        };
    });
}
