"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveRoutes = liveRoutes;
const db_1 = require("../services/db");
const schemas_1 = require("./schemas");
async function liveRoutes(fastify) {
    fastify.get("/live/rooms", { preHandler: fastify.requireAuth }, async (req) => {
        const userId = req.auth.id;
        await db_1.db.getOrCreateOwnerLiveRoom(userId);
        const rooms = await db_1.db.getAccessibleLiveRooms(userId);
        return { rooms };
    });
    fastify.post("/live/rooms", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.liveCreateSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { ownerId } = (req.body ?? {});
        const targetOwnerId = ownerId || userId;
        if (targetOwnerId !== userId) {
            const targetUser = await db_1.db.getUserById(targetOwnerId);
            if (!targetUser) {
                return reply.code(404).send({ message: "Live room owner not found" });
            }
            const isFriend = await db_1.db.isMutual(userId, targetOwnerId);
            if (!isFriend) {
                return reply.code(403).send({ message: "Only friends have access to Live Space" });
            }
        }
        const room = await db_1.db.getOrCreateOwnerLiveRoom(targetOwnerId);
        const accessibleRoom = await db_1.db.getAccessibleOwnerRoom(userId, room.id);
        if (!accessibleRoom) {
            return reply.code(403).send({ message: "Only friends have access to Live Space" });
        }
        return {
            room: accessibleRoom
        };
    });
}
