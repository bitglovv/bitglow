import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/store";
import { db } from "../services/db";

function getAuthUserId(req: any, reply: any): string | null {
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
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.id;
    } catch (err) {
        reply.code(401).send({ message: "Invalid or expired token" });
        return null;
    }
}

export async function liveRoutes(fastify: FastifyInstance) {
    fastify.get("/live/rooms", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        await db.getOrCreateOwnerLiveRoom(userId);
        const rooms = await db.getAccessibleLiveRooms(userId);

        return { rooms };
    });

    fastify.post("/live/rooms", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

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
