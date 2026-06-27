import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { sanitizeText } from "../services/security";
import { dmEditSchema, dmMessageParamSchema, dmSendSchema, dmUserSchema } from "./schemas";
import { clients } from "../ws";
import WebSocket from "ws";

export async function dmRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/dms
     * List conversations for current user
     */
    fastify.get("/dms", { preHandler: fastify.requireAuth }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;

        const { limit = "50", offset = "0" } = (req.query || {}) as { limit?: string; offset?: string };
        const rows = await db.listDMConversations(userId, Math.min(Number(limit) || 50, 100), Math.max(Number(offset) || 0, 0));
        const conversations = rows.map((r: any) => ({
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
    fastify.get("/dms/:userId", { preHandler: fastify.requireAuth, schema: dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;

        const { userId: otherId } = req.params as { userId: string };
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        // Open messaging enabled


        const convo = await db.getOrCreateDMConversation(userId, otherId);
        if (!convo) return reply.code(403).send({ message: "Messaging blocked" });
        const messages = await db.getDMHistory(convo.id, 200);
        await db.markDMConversationRead(convo.id, userId);

        return messages.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id,
            text: m.text,
            type: m.type || 'text',
            postId: m.post_id,
            profileId: m.profile_id,
            isEdited: !!m.is_edited,
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
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { userId: otherId } = req.params as { userId: string };
        const { text, type, postId, profileId, clientMsgId } = req.body as { 
            text?: string; 
            type?: 'text' | 'post' | 'profile'; 
            postId?: string; 
            profileId?: string;
            clientMsgId?: string;
        };

        if (!otherId || !text || !text.trim()) {
            return reply.code(400).send({ message: "Invalid message" });
        }

        // Open messaging enabled
        const convo = await db.getOrCreateDMConversation(userId, otherId);
        if (!convo) return reply.code(403).send({ message: "Messaging blocked" });
        const saved = await db.saveDMMessage(convo.id, userId, sanitizeText(text.trim(), 2000), type || 'text', postId, profileId);

        const responseMsg = {
            id: saved.id,
            senderId: saved.sender_id,
            receiverId: otherId,
            text: saved.text,
            type: saved.type,
            postId: saved.post_id,
            profileId: saved.profile_id,
            isEdited: !!saved.is_edited,
            createdAt: new Date(saved.created_at).toISOString()
        };

        // Broadcast to WebSocket clients
        const payload = JSON.stringify({
            type: "server:dm:message",
            message: responseMsg,
            clientMsgId
        });

        for (const client of clients) {
            if (
                (client.userId === userId || client.userId === otherId) &&
                client.socket.readyState === WebSocket.OPEN
            ) {
                client.socket.send(payload);
            }
        }

        return responseMsg;
    });

    /**
     * PUT /api/dms/message/:messageId
     * Edit a message sent by current user
     */
    fastify.put("/dms/message/:messageId", { preHandler: fastify.requireAuth, schema: dmEditSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { messageId } = req.params as { messageId: string };
        const { text } = req.body as { text: string };

        const existing = await db.getDMMessageById(messageId);
        if (!existing) {
            return reply.code(404).send({ message: "Message not found" });
        }
        if (existing.sender_id !== userId) {
            return reply.code(403).send({ message: "Access denied" });
        }

        const cleanText = sanitizeText(text.trim(), 2000);
        if (!cleanText) {
            return reply.code(400).send({ message: "Invalid text" });
        }

        const updated = await db.updateDMMessage(messageId, cleanText);
        if (!updated) {
            return reply.code(500).send({ message: "Failed to update message" });
        }

        const otherUserId = existing.user_a === userId ? existing.user_b : existing.user_a;
        const responseMsg = {
            id: updated.id,
            conversationId: updated.conversation_id,
            senderId: updated.sender_id,
            receiverId: otherUserId,
            text: updated.text,
            type: updated.type,
            postId: updated.post_id,
            profileId: updated.profile_id,
            isEdited: true,
            createdAt: new Date(updated.created_at).toISOString()
        };

        const payload = JSON.stringify({
            type: "server:dm:edited",
            message: responseMsg
        });

        for (const client of clients) {
            if (
                (client.userId === existing.user_a || client.userId === existing.user_b) &&
                client.socket.readyState === WebSocket.OPEN
            ) {
                client.socket.send(payload);
            }
        }

        return responseMsg;
    });

    /**
     * DELETE /api/dms/message/:messageId
     * Delete a message sent by current user
     */
    fastify.delete("/dms/message/:messageId", { preHandler: fastify.requireAuth, schema: dmMessageParamSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { messageId } = req.params as { messageId: string };

        const existing = await db.getDMMessageById(messageId);
        if (!existing) {
            return reply.code(404).send({ message: "Message not found" });
        }
        if (existing.sender_id !== userId) {
            return reply.code(403).send({ message: "Access denied" });
        }

        await db.deleteDMMessage(messageId);
        const lastMsg = await db.getLastDMMessageForConversation(existing.conversation_id);
        const otherUserId = existing.user_a === userId ? existing.user_b : existing.user_a;

        const payload = JSON.stringify({
            type: "server:dm:deleted",
            messageId: existing.id,
            conversationId: existing.conversation_id,
            userId,
            otherUserId,
            lastMessage: lastMsg ? lastMsg.text : "",
            lastMessageSenderId: lastMsg ? lastMsg.sender_id : null,
            lastMessageAt: lastMsg ? new Date(lastMsg.created_at).toISOString() : null
        });

        for (const client of clients) {
            if (
                (client.userId === existing.user_a || client.userId === existing.user_b) &&
                client.socket.readyState === WebSocket.OPEN
            ) {
                client.socket.send(payload);
            }
        }

        return { ok: true, messageId: existing.id };
    });

    /**
     * POST /api/dms/:userId/read
     * Mark all incoming messages in this conversation as read.
     */
    fastify.post("/dms/:userId/read", { preHandler: fastify.requireAuth, schema: dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { userId: otherId } = req.params as { userId: string };
        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        const convo = await db.getDMConversation(userId, otherId);
        if (!convo) {
            return { ok: true, readCount: 0 };
        }

        const readCount = await db.markDMConversationRead(convo.id, userId);
        return { ok: true, readCount };
    });

    /**
     * DELETE /api/dms/:userId
     * Delete a conversation (used for rejecting requests)
     */
    fastify.delete("/dms/:userId", { preHandler: fastify.requireAuth, schema: dmUserSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { userId: otherId } = req.params as { userId: string };

        if (!otherId) {
            return reply.code(400).send({ message: "Invalid user" });
        }

        // Delete the DM conversation
        const convRes = await db.query(
            `SELECT id FROM dm_conversations
             WHERE (user_a = $1 AND user_b = $2)
                OR (user_a = $2 AND user_b = $1)`,
            [userId, otherId]
        );
        
        if (convRes.rowCount && convRes.rowCount > 0) {
            for (const row of convRes.rows) {
                await db.query('DELETE FROM dm_messages WHERE conversation_id = $1', [row.id]);
                await db.query('DELETE FROM dm_conversations WHERE id = $1', [row.id]);
            }
        }

        return { ok: true };
    });
}

