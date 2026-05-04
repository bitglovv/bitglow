"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const auth_1 = require("./routes/auth");
const user_1 = require("./routes/user");
const profile_1 = require("./routes/profile");
const ws_1 = require("./ws");
const live_1 = require("./routes/live");
const dms_1 = require("./routes/dms");
const posts_1 = require("./routes/posts");
const notifications_1 = require("./routes/notifications");
const auth_2 = __importDefault(require("./plugins/auth"));
const env_1 = require("./config/env");
const db_1 = require("./services/db");
function isPrivateOrLoopbackHost(hostname) {
    return hostname === "localhost"
        || hostname === "127.0.0.1"
        || hostname === "::1"
        || /^10\./.test(hostname)
        || /^192\.168\./.test(hostname)
        || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        || /^169\.254\./.test(hostname);
}
function isAllowedOrigin(origin) {
    if (!origin)
        return true;
    if (env_1.env.CORS_ORIGINS.includes(origin))
        return true;
    if (env_1.env.NODE_ENV !== "production") {
        try {
            const url = new URL(origin);
            return isPrivateOrLoopbackHost(url.hostname);
        }
        catch {
            return false;
        }
    }
    return false;
}
const server = (0, fastify_1.default)({
    logger: true,
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: env_1.env.TRUST_PROXY,
});
server.register(cors_1.default, {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
});
server.register(rate_limit_1.default, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
});
server.register(helmet_1.default, {
    contentSecurityPolicy: false,
});
server.register(auth_2.default);
server.setErrorHandler(async (error, request, reply) => {
    if (error.statusCode === 429) {
        await db_1.db.insertSecurityLog({
            eventType: "rate_limit",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"]?.toString(),
            details: { path: request.url },
        });
        await db_1.db.insertSecurityLog({
            eventType: "security_alert",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"]?.toString(),
            details: { type: "rate_limit", path: request.url },
        });
    }
    if (error.validation) {
        return reply.code(400).send({
            message: "Invalid request payload",
            details: error.validation,
        });
    }
    reply.send(error);
});
server.register(auth_1.authRoutes, { prefix: "/api/auth" });
server.register(user_1.userRoutes, { prefix: "/api" });
server.register(profile_1.profileRoutes, { prefix: "/api/profile" });
server.register(live_1.liveRoutes, { prefix: "/api" });
server.register(dms_1.dmRoutes, { prefix: "/api" });
server.register(posts_1.postRoutes, { prefix: "/api" });
server.register(notifications_1.notificationRoutes, { prefix: "/api" });
server.get("/health", async () => {
    return { status: "ok" };
});
server.listen({ port: env_1.env.PORT, host: env_1.env.HOST }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
    (0, ws_1.startWS)(server.server);
    // Print registered routes
    server.ready().then(() => {
        console.log("Registered routes:");
        server.printRoutes();
    });
});
