import { FastifyPluginAsync } from "fastify";
import { hashToken, parseBearerToken, verifyAccessToken } from "../services/security";
import { db } from "../services/db";
import type { RequestActor } from "../services/security";

declare module "fastify" {
    interface FastifyRequest {
        auth?: RequestActor;
    }
    interface FastifyInstance {
        requireAuth: any;
        requireAdmin: any;
    }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorateRequest("auth", null);

    fastify.decorate("requireAuth", async (request: any, reply: any) => {
        const token = parseBearerToken(request.headers.authorization);
        if (!token) {
            return reply.code(401).send({ message: "Authorization required" });
        }

        try {
            const decoded = verifyAccessToken(token);
            const session = await db.getActiveSessionByToken(hashToken(token));
            if (!session || session.user_id !== decoded.id) {
                return reply.code(401).send({ message: "Session expired or revoked" });
            }

            await db.touchSession(session.id);

            const user = await db.getUserById(decoded.id);
            if (!user) {
                return reply.code(401).send({ message: "User not found" });
            }

            request.auth = {
                id: decoded.id,
                username: decoded.username,
                sessionId: session.id,
                role: user.role,
            };
        } catch {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });

    fastify.decorate("requireAdmin", async (request: any, reply: any) => {
        await fastify.requireAuth(request, reply);
        if (reply.sent) return;
        if (request.auth?.role !== "admin") {
            return reply.code(403).send({ message: "Access denied. Admin role required." });
        }
    });
};

export default authPlugin;
