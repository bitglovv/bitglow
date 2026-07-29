/* bitglow-backend/src/ws/index.ts */
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { ClientMeta, handleMessage, broadcastPresence, broadcastRoomPresence, broadcastUserStatus, roomUsers, userMessageTimestamps } from "./handlers";
import type { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { env } from "../config/env";

export const clients = new Set<ClientMeta>();

export function startWS(httpServer: any) {
  const wss = new WebSocketServer({
    server: httpServer,
    maxPayload: env.WS_MAX_PAYLOAD_BYTES,
    verifyClient: ({ origin }, done) => {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        done(true);
        return;
      }
      done(false, 403, "Origin not allowed");
    },
  });
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.ping();
    }
  }, 30_000);
  heartbeat.unref();
  wss.on("close", () => clearInterval(heartbeat));

    wss.on("connection", (socket: WebSocket, request: any) => {
        const userId = randomUUID();

    // Create client metadata
    const meta: ClientMeta = {
      userId,
      username: "guest",
            socket,
            isAuth: false,
            helloReceived: false,
            lastMessageAt: 0,
            lastTypingAt: 0,
            lastPresenceAt: 0,
            ipAddress: request.socket?.remoteAddress?.toString(),
            userAgent: request.headers?.["user-agent"]?.toString(),
            rooms: new Set(),
            roomOwners: new Map(),
            onlineVisible: true,
        };

    clients.add(meta);
    console.info(`✅ Client ${userId} connected. Total: ${clients.size}`);

    // Broadcast updated presence
    broadcastPresence(clients);

    // Handle incoming messages
    socket.on("message", (raw) => {
        void handleMessage(meta, raw, clients).catch((error: unknown) => {
          console.error("[ws] message handler failed", error);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "server:error", message: "Unable to process message", ts: Date.now() }));
          }
        });
    });

    const helloTimeout = setTimeout(() => {
        if (!meta.helloReceived) {
            void db.insertSecurityLog({
              eventType: "ws_auth_rejected",
              ipAddress: meta.ipAddress,
              userAgent: meta.userAgent,
              details: { reason: "hello_timeout" },
            });
            socket.close();
        }
    }, 5_000);

    // Handle disconnection
    socket.on("close", () => {
      clearTimeout(helloTimeout);
      const joinedRooms = Array.from(meta.rooms);
      clients.delete(meta);
      console.info(`❌ Client ${userId} disconnected. Total: ${clients.size}`);
      
      broadcastPresence(clients);

      // Broadcast offline status if no other connections for this user
      const stillConnected = Array.from(clients).some(c => c.userId === meta.userId && c.isAuth);
      if (!stillConnected && meta.isAuth && meta.onlineVisible) {
        broadcastUserStatus(meta.userId, false, clients);
      }
      
      for (const roomId of joinedRooms) {
        // STEP 4 & 10: REMOVE USER FROM GLOBAL STORE
        const users = roomUsers.get(roomId);
        if (users) {
          const hasAnotherConnection = Array.from(clients).some(
            (client) => client.userId === meta.userId && client.rooms.has(roomId)
          );
          if (!hasAnotherConnection) users.delete(meta.userId);
          if (users.size === 0) {
            roomUsers.delete(roomId);
          }
          broadcastRoomPresence(clients, roomId);
        }
      }
      const stillConnectedForUser = Array.from(clients).some((client) => client.userId === meta.userId);
      if (!stillConnectedForUser) {
        userMessageTimestamps.delete(meta.userId);
      }
    });

    // Handle errors
    socket.on("error", (err: Error) => {
      console.error(`❌ Socket error for ${userId}:`, err);
    });
  });

  console.info("🚀 WebSocket server ready");
}

export function disconnectUserSockets(userId: string) {
  for (const client of clients) {
    if (client.userId === userId) {
      try {
        client.socket.close(1008, "Account deactivated");
      } catch (err) {
        // ignore error during disconnect
      }
    }
  }
}

export function broadcastUserRelationshipUpdate(actorId: string, targetId: string, kind: "block" | "mute" | "unblock" | "unmute") {
  const payload = JSON.stringify({
    type: "server:user_relationship:update",
    kind,
    actorId,
    targetId,
    ts: Date.now(),
  });

  for (const client of clients) {
    if ((client.userId === actorId || client.userId === targetId) && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(payload);
    }
  }

  if (kind === "block") {
    for (const client of clients) {
      if (client.userId !== actorId && client.userId !== targetId) continue;
      const rooms = Array.from(client.rooms);
      for (const roomId of rooms) {
        const ownerId = client.roomOwners.get(roomId);
        if (ownerId !== actorId && ownerId !== targetId) continue;
        client.rooms.delete(roomId);
        client.roomOwners.delete(roomId);
        const users = roomUsers.get(roomId);
        users?.delete(client.userId);
        if (users?.size === 0) roomUsers.delete(roomId);
        broadcastRoomPresence(clients, roomId);
      }
    }
  }
}

