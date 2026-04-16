"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWS = startWS;
/* bitglow-backend/src/ws/index.ts */
const ws_1 = require("ws");
const crypto_1 = require("crypto");
const handlers_1 = require("./handlers");
const clients = new Set();
function startWS(httpServer) {
    const wss = new ws_1.WebSocketServer({ server: httpServer });
    wss.on("connection", (socket) => {
        const userId = (0, crypto_1.randomUUID)();
        // Create client metadata
        const meta = {
            userId,
            username: "guest",
            socket,
            isAuth: false,
            lastMessageAt: 0,
            rooms: new Set(),
            roomOwners: new Map(),
        };
        clients.add(meta);
        console.log(`✅ Client ${userId} connected. Total: ${clients.size}`);
        // Broadcast updated presence
        (0, handlers_1.broadcastPresence)(clients);
        // Handle incoming messages
        socket.on("message", (raw) => {
            (0, handlers_1.handleMessage)(meta, raw, clients);
        });
        // Handle disconnection
        socket.on("close", () => {
            const joinedRooms = Array.from(meta.rooms);
            clients.delete(meta);
            console.log(`❌ Client ${userId} disconnected. Total: ${clients.size}`);
            (0, handlers_1.broadcastPresence)(clients);
            for (const roomId of joinedRooms) {
                // STEP 4 & 10: REMOVE USER FROM GLOBAL STORE
                const users = handlers_1.roomUsers.get(roomId);
                if (users) {
                    users.delete(meta.userId);
                    // Broadcast the new accurate count
                    (0, handlers_1.broadcastRoomPresence)(clients, roomId);
                }
            }
        });
        // Handle errors
        socket.on("error", (err) => {
            console.error(`❌ Socket error for ${userId}:`, err);
        });
    });
    console.log("🚀 WebSocket server ready");
}
