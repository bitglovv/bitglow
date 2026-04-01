"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = notificationRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../services/store");
const db_1 = require("../services/db");
const getAuthUserId = (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        reply.code(401).send({ message: "No token provided" });
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
    catch {
        reply.code(401).send({ message: "Invalid token" });
        return null;
    }
};
async function notificationRoutes(fastify) {
    fastify.get("/notifications", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const items = await db_1.db.getNotifications(userId, 50);
        return { notifications: items };
    });
}
