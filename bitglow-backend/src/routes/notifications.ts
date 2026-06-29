import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { paginationSchema } from "./schemas";

export async function notificationRoutes(fastify: FastifyInstance) {
    fastify.get("/notifications", { preHandler: fastify.requireAuth, schema: paginationSchema }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;
        const { limit = "50", offset = "0" } = (req.query || {}) as { limit?: string; offset?: string };

        const items = await db.getNotifications(userId, Math.min(Number(limit) || 50, 100), Math.max(Number(offset) || 0, 0));
        return { notifications: items };
    });
}

