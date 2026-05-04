"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = notificationRoutes;
const db_1 = require("../services/db");
async function notificationRoutes(fastify) {
    fastify.get("/notifications", { preHandler: fastify.requireAuth }, async (req) => {
        const userId = req.auth.id;
        const items = await db_1.db.getNotifications(userId, 50);
        return { notifications: items };
    });
}
