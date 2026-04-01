"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastPresence = broadcastPresence;
exports.broadcastRoomPresence = broadcastRoomPresence;
exports.handleMessage = handleMessage;
/* bitglow-backend/src/ws/handlers.ts */
const ws_1 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../services/db");
const store_1 = require("../services/store");
const RATE_LIMIT_MS    = 1000;              // 1 second anti-spam cooldown
const MESSAGE_TTL      = 5 * 60 * 1_000;  // 5 minutes — messages expire globally
const MAX_MESSAGES     = 100;              // max messages kept in history
const MAX_LENGTH       = 200;              // max chars per message
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
    const count = Array.from(clients).filter((c) => c.socket.readyState === ws_1.default.OPEN && c.rooms.has(roomId)).length;
    const message = JSON.stringify({
        type: "server:room:presence",
        roomId,
        count,
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
                    // Welcome back specifically
                    meta.socket.send(JSON.stringify({
                        type: "server:welcome",
                        userId: meta.userId,
                        username: meta.username,
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
            // Verify the user is allowed to access this room (only fetches 1 row)
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
            try {
                // No history sent — users only see messages sent AFTER they join.
                // This enforces the "live-only" rule: no past chats are visible.
                meta.socket.send(JSON.stringify({
                    type: "server:room:history",
                    roomId: accessResult.room.id,
                    messages: [],          // always empty — live from here
                    ts: Date.now()
                }));
                broadcastRoomPresence(clients, accessResult.room.id);
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
                broadcastRoomPresence(clients, roomId);
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
            const text = String(m.text || "").slice(0, MAX_LENGTH).trim(); // STEP 5b: Enforce MAX_LENGTH
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
