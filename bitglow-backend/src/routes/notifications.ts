import { FastifyInstance } from "fastify";
import { db } from "../services/db";

export async function notificationRoutes(fastify: FastifyInstance) {
    fastify.get("/notifications", { preHandler: fastify.requireAuth }, async (req) => {
        const userId = req.auth!.id;

        const items = await db.getNotifications(userId, 50);
        return { notifications: items };
    });
}
