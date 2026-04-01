"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const auth_1 = require("./routes/auth");
const user_1 = require("./routes/user");
const profile_1 = require("./routes/profile");
const ws_1 = require("./ws");
const live_1 = require("./routes/live");
const dms_1 = require("./routes/dms");
const posts_1 = require("./routes/posts");
const notifications_1 = require("./routes/notifications");
const server = (0, fastify_1.default)({ logger: true });
server.register(cors_1.default, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
server.listen({ port: 3003, host: "0.0.0.0" }, (err, address) => {
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
