import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { liveCreateSchema } from "./schemas";

export async function liveRoutes(fastify: FastifyInstance) {
    fastify.get("/live/rooms", { preHandler: fastify.requireAuth }, async (req) => {
        const userId = req.auth!.id;

        await db.getOrCreateOwnerLiveRoom(userId);
        const rooms = await db.getAccessibleLiveRooms(userId);

        return { rooms };
    });

    fastify.post("/live/rooms", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: liveCreateSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;

        const { ownerId } = ((req.body as { ownerId?: string } | undefined) ?? {});
        const targetOwnerId = ownerId || userId;

        if (targetOwnerId !== userId) {
            const targetUser = await db.getUserById(targetOwnerId);
            if (!targetUser) {
                return reply.code(404).send({ message: "Live room owner not found" });
            }

            const isFriend = await db.isMutual(userId, targetOwnerId);
            if (!isFriend) {
                return reply.code(403).send({ message: "Mutual friends only" });
            }
        }

        const room = await db.getOrCreateOwnerLiveRoom(targetOwnerId);
        const accessibleRoom = await db.getAccessibleOwnerRoom(userId, room.id);

        if (!accessibleRoom) {
            return reply.code(403).send({ message: "Mutual friends only" });
        }

        return {
            room: accessibleRoom
        };
    });
}
