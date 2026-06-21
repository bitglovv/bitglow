import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { profileRoutes } from "./routes/profile";
import { startWS } from "./ws";
import { liveRoutes } from "./routes/live";
import { dmRoutes } from "./routes/dms";
import { postRoutes } from "./routes/posts";
import { notificationRoutes } from "./routes/notifications";
import { settingsRoutes } from "./routes/settings";
import authPlugin from "./plugins/auth";
import { env } from "./config/env";
import { db } from "./services/db";

function isPrivateOrLoopbackHost(hostname: string) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    || /^169\.254\./.test(hostname);
}

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (env.CORS_ORIGINS.includes(origin)) return true;

  if (env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      return isPrivateOrLoopbackHost(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

const server = Fastify({ 
    logger: true,
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: env.TRUST_PROXY ? 1 : false,
});

server.register(cors, {
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

server.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: "1 minute",
});

server.register(helmet, {
  contentSecurityPolicy: false,
});

server.register(authPlugin);

server.setErrorHandler(async (error, request, reply) => {
  if ((error as any).statusCode === 429) {
    await db.insertSecurityLog({
      eventType: "rate_limit",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]?.toString(),
      details: { path: request.url },
    });
    await db.insertSecurityLog({
      eventType: "security_alert",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]?.toString(),
      details: { type: "rate_limit", path: request.url },
    });
  }
  if ((error as any).validation) {
    return reply.code(400).send({
      message: "Invalid request payload",
      details: (error as any).validation,
    });
  }
  reply.send(error);
});

server.register(authRoutes, { prefix: "/api/auth" });
server.register(userRoutes, { prefix: "/api" });
server.register(profileRoutes, { prefix: "/api/profile" });
server.register(liveRoutes, { prefix: "/api" });
server.register(dmRoutes, { prefix: "/api" });
server.register(postRoutes, { prefix: "/api" });
server.register(notificationRoutes, { prefix: "/api" });
server.register(settingsRoutes, { prefix: "/api/settings" });

server.get("/health", async () => {
  return { status: "ok" };
});

server.listen({ port: env.PORT, host: env.HOST }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);

  startWS(server.server);
  setInterval(() => {
    db.cleanupExpiredLiveMessages().catch((error: unknown) => {
      server.log.error({ error }, "failed to clean up expired live messages");
    });
  }, 5 * 60 * 1000).unref();
  
  // Print registered routes
  server.ready().then(() => {
    console.log("Registered routes:");
    server.printRoutes();
  });
});


