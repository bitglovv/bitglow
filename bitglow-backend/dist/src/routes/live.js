"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveRoutes = liveRoutes;
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
async function liveRoutes(fastify) {
    fastify.get("/live/rooms", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        await db_1.db.getOrCreateOwnerLiveRoom(userId);
        const rooms = await db_1.db.getAccessibleLiveRooms(userId);
        return { rooms };
    });
    fastify.post("/live/rooms", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { ownerId } = (req.body ?? {});
        const targetOwnerId = ownerId || userId;
        if (targetOwnerId !== userId) {
            const targetUser = await db_1.db.getUserById(targetOwnerId);
            if (!targetUser) {
                return reply.code(404).send({ message: "Live room owner not found" });
            }
            const isFriend = await db_1.db.isMutual(userId, targetOwnerId);
            if (!isFriend) {
                return reply.code(403).send({ message: "Mutual friends only" });
            }
        }
        const room = await db_1.db.getOrCreateOwnerLiveRoom(targetOwnerId);
        const accessibleRoom = await db_1.db.getAccessibleOwnerRoom(userId, room.id);
        if (!accessibleRoom) {
            return reply.code(403).send({ message: "Mutual friends only" });
        }
        return {
            room: accessibleRoom
        };
    });
}
