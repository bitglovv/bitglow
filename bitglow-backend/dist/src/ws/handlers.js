"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomUsers = void 0;
exports.broadcastPresence = broadcastPresence;
exports.broadcastRoomPresence = broadcastRoomPresence;
exports.handleMessage = handleMessage;
/* bitglow-backend/src/ws/handlers.ts */
const ws_1 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../services/db");
const store_1 = require("../services/store");
const RATE_LIMIT_MS = 1_000; // 1 second anti-spam cooldown
const MESSAGE_TTL = 5 * 60 * 1_000; // 5 minutes — messages expire globally
const MAX_MESSAGES = 100; // max messages kept in history
const MAX_LENGTH = 200; // max chars per message
// STEP 1: GLOBAL MEMORY STORE
exports.roomUsers = new Map();
function broadcastPresence(clients) {
    const message = JSON.stringify({
        type: "server:presence",
        onlineCount: clients.size,
        ts: Date.now(),
    });
    for (const c of clients) {
        if (c.socket.readyState === ws_1.default.OPEN) {
            c.socket.send(message);
        }
    }
}
function broadcastRoomPresence(clients, roomId) {
    const usersInRoom = exports.roomUsers.get(roomId) || new Set();
    const count = usersInRoom.size;
    // We still want to send the first few profiles for the avatar stack
    // (We find them by looking in the active WS clients)
    const activeInRoom = Array.from(clients).filter((c) => c.socket.readyState === ws_1.default.OPEN && c.rooms.has(roomId));
    const message = JSON.stringify({
        type: "server:room:presence",
        roomId,
        count,
        users: activeInRoom.slice(0, 10).map(u => ({
            id: u.userId,
            username: u.username,
            avatarUrl: u.avatarUrl
        })),
        ts: Date.now(),
    });
    for (const c of clients) {
        if (c.socket.readyState === ws_1.default.OPEN && c.rooms.has(roomId)) {
            c.socket.send(message);
        }
    }
}
async function handleMessage(meta, raw, clients) {
    let msg;
    try {
        const text = raw.toString();
        msg = JSON.parse(text);
    }
    catch (err) {
        meta.socket.send(JSON.stringify({ type: "server:error", message: "Invalid JSON", ts: Date.now() }));
        return;
    }
    console.log(`[ws] [${meta.userId}] Received:`, msg.type);
    switch (msg.type) {
        case "client:hello": {
            const m = msg;
            // If token provided, try to authorize
            if (m.token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(m.token, store_1.JWT_SECRET);
                    meta.userId = decoded.id;
                    meta.username = decoded.username;
                    meta.isAuth = true;
                    // Fetch user for avatarUrl
                    const user = await db_1.db.getUserById(meta.userId);
                    if (user)
                        meta.avatarUrl = user.avatarUrl;
                    // Welcome back specifically
                    meta.socket.send(JSON.stringify({
                        type: "server:welcome",
                        userId: meta.userId,
                        username: meta.username,
                        avatarUrl: meta.avatarUrl,
                        ts: Date.now()
                    }));
                }
                catch (err) {
                    meta.socket.send(JSON.stringify({
                        type: "server:error",
                        message: "Invalid or expired token",
                        ts: Date.now()
                    }));
                }
            }
            // Always respond with current presence
            meta.socket.send(JSON.stringify({
                type: "server:presence",
                onlineCount: clients.size,
                ts: Date.now(),
            }));
            return;
        }
        case "client:join_room": {
            if (!meta.isAuth) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Authentication required",
                    ts: Date.now()
                }));
                return;
            }
            const m = msg;
            const roomId = String(m.roomId || "");
            if (!roomId) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "roomId is required",
                    ts: Date.now()
                }));
                return;
            }
            // Verify the user is allowed to access this room
            const accessResult = await db_1.db.getAccessibleLiveMessages(meta.userId, roomId, 1);
            if (!accessResult) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Access denied for room",
                    ts: Date.now()
                }));
                return;
            }
            meta.rooms.add(accessResult.room.id);
            meta.roomOwners.set(accessResult.room.id, accessResult.room.ownerId);
            // STEP 3: JOIN ROOM
            if (!exports.roomUsers.has(accessResult.room.id)) {
                exports.roomUsers.set(accessResult.room.id, new Set());
            }
            exports.roomUsers.get(accessResult.room.id).add(meta.userId);
            // Broadcast the new count to everyone in the room
            broadcastRoomPresence(clients, accessResult.room.id);
            try {
                // No history sent — users only see messages sent AFTER they join.
                // This enforces the "live-only" rule: no past chats are visible.
                meta.socket.send(JSON.stringify({
                    type: "server:room:history",
                    roomId: accessResult.room.id,
                    messages: [], // always empty — live from here
                    ts: Date.now()
                }));
                broadcastRoomPresence(clients, accessResult.room.id);
                // Broadcast join system message
                const joinMsg = JSON.stringify({
                    type: "server:room:system",
                    roomId: accessResult.room.id,
                    message: `${meta.username} joined`,
                    ts: Date.now()
                });
                for (const c of clients) {
                    if (c.rooms.has(accessResult.room.id) && c.userId !== meta.userId) {
                        c.socket.send(joinMsg);
                    }
                }
            }
            catch (err) {
                console.error("Failed to join room:", err);
            }
            return;
        }
        case "client:leave_room": {
            const m = msg;
            const roomId = String(m.roomId || "");
            if (roomId) {
                meta.rooms.delete(roomId);
                meta.roomOwners.delete(roomId);
                // STEP 4: LEAVE ROOM
                exports.roomUsers.get(roomId)?.delete(meta.userId);
                broadcastRoomPresence(clients, roomId);
                // Broadcast leave system message
                const leaveMsg = JSON.stringify({
                    type: "server:room:system",
                    roomId,
                    message: `${meta.username} left`,
                    ts: Date.now()
                });
                for (const c of clients) {
                    if (c.rooms.has(roomId)) {
                        c.socket.send(leaveMsg);
                    }
                }
            }
            return;
        }
        case "client:room:presence": {
            const m = msg;
            const roomId = String(m.roomId || "");
            if (!roomId)
                return;
            // STEP 7: SUPPORT PRE-ENTRY COUNT
            const count = exports.roomUsers.get(roomId)?.size || 0;
            meta.socket.send(JSON.stringify({
                type: "server:room:presence",
                roomId,
                count,
                ts: Date.now()
            }));
            return;
        }
        case "client:typing": {
            const m = msg;
            const roomId = String(m.roomId || "");
            if (!roomId || !meta.rooms.has(roomId))
                return;
            const payload = JSON.stringify({
                type: "server:room:typing",
                roomId,
                userId: meta.userId,
                username: meta.username,
                ts: Date.now()
            });
            for (const c of clients) {
                if (c.rooms.has(roomId) && c.userId !== meta.userId) {
                    c.socket.send(payload);
                }
            }
            return;
        }
        case "client:chat:send": {
            // SECURITY: Must be authenticated
            if (!meta.isAuth) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Authentication required",
                    ts: Date.now()
                }));
                return;
            }
            // RATE LIMITING
            const now = Date.now();
            if (now - meta.lastMessageAt < RATE_LIMIT_MS) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Rate limit exceeded. Please slow down.",
                    ts: Date.now()
                }));
                return;
            }
            meta.lastMessageAt = now;
            const m = msg;
            const roomId = String(m.roomId || "");
            // STEP 5b: Enforce MAX_LENGTH
            const text = String(m.text || "").slice(0, MAX_LENGTH).trim();
            if (!roomId) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "roomId is required",
                    ts: Date.now()
                }));
                return;
            }
            const senderRoom = await db_1.db.getOrCreateOwnerLiveRoom(meta.userId);
            if (roomId !== senderRoom.id) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Live messages can only be sent from your own room",
                    ts: Date.now()
                }));
                return;
            }
            if (!meta.rooms.has(senderRoom.id)) {
                meta.socket.send(JSON.stringify({
                    type: "server:error",
                    message: "Join your live room before sending messages",
                    ts: Date.now()
                }));
                return;
            }
            meta.roomOwners.set(senderRoom.id, senderRoom.ownerId);
            if (!text) {
                return;
            }
            try {
                const mirroredResult = await db_1.db.saveMirroredLiveMessages(meta.userId, text);
                for (const delivery of mirroredResult.deliveries) {
                    const room = delivery.room;
                    const saved = delivery.message;
                    const out = {
                        type: "server:room:message",
                        roomId: room.id,
                        message: {
                            id: saved.id,
                            roomId: room.id,
                            userId: meta.userId,
                            username: meta.username,
                            avatarUrl: meta.avatarUrl,
                            text,
                            ts: new Date(saved.created_at).getTime()
                        }
                    };
                    const payload = JSON.stringify(out);
                    for (const c of clients) {
                        if (!c.rooms.has(room.id) || c.socket.readyState !== ws_1.default.OPEN) {
                            continue;
                        }
                        const allowed = await db_1.db.canAccessOwnerRoom(c.userId, room.id);
                        if (!allowed) {
                            c.rooms.delete(room.id);
                            c.roomOwners.delete(room.id);
                            c.socket.send(JSON.stringify({
                                type: "server:error",
                                message: "Access denied for room",
                                ts: Date.now()
                            }));
                            broadcastRoomPresence(clients, room.id);
                            continue;
                        }
                        c.roomOwners.set(room.id, room.ownerId);
                        c.socket.send(payload);
                    }
                }
            }
            catch (err) {
                console.error("Failed to save message:", err);
            }
            return;
        }
        default:
            meta.socket.send(JSON.stringify({
                type: "server:error",
                message: "Unknown message type",
                ts: Date.now(),
            }));
    }
}
