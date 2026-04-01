import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { profileRoutes } from "./routes/profile";
import { startWS } from "./ws";
import { liveRoutes } from "./routes/live";
import { dmRoutes } from "./routes/dms";
import { postRoutes } from "./routes/posts";
import { notificationRoutes } from "./routes/notifications";

const server = Fastify({ 
    logger: true,
    bodyLimit: 52428800 // 50MB limit to handle large mobile image base64 uploads
});

server.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

server.register(authRoutes, { prefix: "/api/auth" });
server.register(userRoutes, { prefix: "/api" });
server.register(profileRoutes, { prefix: "/api/profile" });
server.register(liveRoutes, { prefix: "/api" });
server.register(dmRoutes, { prefix: "/api" });
server.register(postRoutes, { prefix: "/api" });
server.register(notificationRoutes, { prefix: "/api" });

server.get("/health", async () => {
  return { status: "ok" };
});

server.listen({ port: 3003, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);

  startWS(server.server);
  
  // Print registered routes
  server.ready().then(() => {
    console.log("Registered routes:");
    server.printRoutes();
  });
});
