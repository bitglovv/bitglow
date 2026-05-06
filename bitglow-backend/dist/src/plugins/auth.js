"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const security_1 = require("../services/security");
const db_1 = require("../services/db");
const authPlugin = async (fastify) => {
    fastify.decorateRequest("auth", null);
    fastify.decorate("requireAuth", async (request, reply) => {
        const token = (0, security_1.parseBearerToken)(request.headers.authorization);
        if (!token) {
            return reply.code(401).send({ message: "Authorization required" });
        }
        try {
            const decoded = (0, security_1.verifyAccessToken)(token);
            const session = await db_1.db.getActiveSessionByToken((0, security_1.hashToken)(token));
            if (!session || session.user_id !== decoded.id) {
                return reply.code(401).send({ message: "Session expired or revoked" });
            }
            const user = await db_1.db.getUserById(decoded.id);
            if (!user) {
                return reply.code(401).send({ message: "User not found" });
            }
            await db_1.db.touchSession(session.id);
            request.auth = {
                id: decoded.id,
                username: decoded.username,
                sessionId: session.id,
                role: user.role,
            };
        }
        catch (err) {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    });
    fastify.decorate("requireAdmin", async (request, reply) => {
        await fastify.requireAuth(request, reply);
        if (reply.sent)
            return;
        if (request.auth?.role !== "admin") {
            return reply.code(403).send({ message: "Access denied. Admin role required." });
        }
    });
};
exports.default = (0, fastify_plugin_1.default)(authPlugin);
