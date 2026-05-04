/* bitglow-backend/src/ws/index.ts */
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { ClientMeta, handleMessage, broadcastPresence, broadcastRoomPresence, roomUsers, userMessageTimestamps } from "./handlers";
import type { FastifyInstance } from "fastify";
import { db } from "../services/db";

const clients = new Set<ClientMeta>();

export function startWS(httpServer: any) {
  const wss = new WebSocketServer({ server: httpServer });

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
            ipAddress: request.socket?.remoteAddress?.toString(),
            userAgent: request.headers?.["user-agent"]?.toString(),
            rooms: new Set(),
            roomOwners: new Map(),
        };

    clients.add(meta);
    console.log(`✅ Client ${userId} connected. Total: ${clients.size}`);

    // Broadcast updated presence
    broadcastPresence(clients);

    // Handle incoming messages
    socket.on("message", (raw) => {
        handleMessage(meta, raw, clients);
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
      console.log(`❌ Client ${userId} disconnected. Total: ${clients.size}`);
      
      broadcastPresence(clients);
      
      for (const roomId of joinedRooms) {
        // STEP 4 & 10: REMOVE USER FROM GLOBAL STORE
        const users = roomUsers.get(roomId);
        if (users) {
          users.delete(meta.userId);
          // Broadcast the new accurate count
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

  console.log("🚀 WebSocket server ready");
}
