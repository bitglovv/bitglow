import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/store";
import { db } from "../services/db";

const getAuthUserId = (req: any, reply: any): string | null => {
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
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.id;
    } catch {
        reply.code(401).send({ message: "Invalid token" });
        return null;
    }
};

export async function notificationRoutes(fastify: FastifyInstance) {
    fastify.get("/notifications", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const items = await db.getNotifications(userId, 50);
        return { notifications: items };
    });
}
