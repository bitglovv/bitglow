import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
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
import { db, initializeDatabase } from "./services/db";

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
    bodyLimit: 1024 * 1024,
    trustProxy: env.TRUST_PROXY ? 1 : false,
});

server.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: env.NODE_ENV === "production"
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: "no-referrer" },
});

server.register(authPlugin);

server.addHook("onSend", async (_request, reply) => {
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  reply.header("Cache-Control", "no-store");
});

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
    });
  }
  const statusCode = Number((error as any).statusCode);
 if (statusCode >= 400 && statusCode < 500) {
    const message =
        error instanceof Error
            ? error.message
            : "Request failed";

    return reply.code(statusCode).send({
        message: statusCode === 404 ? "Not found" : message,
    });
}
  if ((error as any).code === "23505") {
    return reply.code(409).send({ message: "Resource already exists" });
  }
  request.log.error({ err: error, requestId: request.id }, "request failed");
  return reply.code(500).send({ message: "Internal server error" });
});

server.register(authRoutes, { prefix: "/api/auth" });
server.register(userRoutes, { prefix: "/api" });
server.register(profileRoutes, { prefix: "/api/profile" });
server.register(liveRoutes, { prefix: "/api" });
server.register(dmRoutes, { prefix: "/api" });
server.register(postRoutes, { prefix: "/api" });
server.register(notificationRoutes, { prefix: "/api" });
server.register(settingsRoutes, { prefix: "/api/settings" });

server.get("/health", async (_request, reply) => {
  try {
    await db.healthCheck();
    return { status: "ok" };
  } catch {
    return reply.code(503).send({ status: "unavailable" });
  }
});

// Global Error Handler: Log internal details on server, expose structured user-friendly errors to client
server.setErrorHandler((error: any, _request, reply) => {
  server.log.error(error);

  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500;

  if (statusCode === 429) {
    return reply.code(429).send({
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many requests. Please try again later.",
    });
  }

  if (statusCode >= 500) {
    return reply.code(500).send({
      code: "SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }

  return reply.code(statusCode).send({
    code: error.code || "INVALID_INPUT",
    message: error.message || "Please check your request and try again.",
  });
});

import { startBackgroundAccountCleanup } from "./services/cleanup";

async function start() {
  await initializeDatabase();
  const address = await server.listen({ port: env.PORT, host: env.HOST });
  server.log.info({ address }, "server listening");
  startWS(server.server);
  startBackgroundAccountCleanup();
  setInterval(() => {
    db.cleanupExpiredLiveMessages(env.LIVE_MESSAGE_TTL_SECONDS * 1000).catch((error: unknown) => {
      server.log.error({ error }, "failed to clean up expired live messages");
    });
  }, 5 * 60 * 1000).unref();
}

async function shutdown(signal: string) {
  server.log.info({ signal }, "shutting down");
  await server.close();
  await db.close();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

start().catch((error: unknown) => {
  server.log.fatal({ error }, "failed to start server");
  process.exitCode = 1;
});