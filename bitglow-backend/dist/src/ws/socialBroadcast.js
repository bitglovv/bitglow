"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSocialFeedClients = attachSocialFeedClients;
exports.pushSocialActivity = pushSocialActivity;
const ws_1 = __importDefault(require("ws"));
let clientsRef = null;
/** Wire the live WS client pool so activity pushes can reach open tabs. */
function attachSocialFeedClients(clients) {
    clientsRef = clients;
}
/** Notify a user (all their connected sockets) to refresh activity / notifications. */
function pushSocialActivity(targetUserId) {
    if (!clientsRef)
        return;
    const payload = JSON.stringify({
        type: "server:social_activity",
        ts: Date.now(),
    });
    for (const c of clientsRef) {
        if (c.isAuth && c.userId === targetUserId && c.socket.readyState === ws_1.default.OPEN) {
            c.socket.send(payload);
        }
    }
}
