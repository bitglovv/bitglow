"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBearerToken = parseBearerToken;
exports.hashToken = hashToken;
exports.normalizeIdentifier = normalizeIdentifier;
exports.getRequestIp = getRequestIp;
exports.getRequestUserAgent = getRequestUserAgent;
exports.sanitizeText = sanitizeText;
exports.validatePassword = validatePassword;
exports.validateUsername = validateUsername;
exports.validateUrl = validateUrl;
exports.issueAccessToken = issueAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.createSession = createSession;
exports.logSecurityEvent = logSecurityEvent;
exports.countRecentEvents = countRecentEvents;
exports.compareAgainstFakeHash = compareAgainstFakeHash;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const env_1 = require("../config/env");
const db_1 = require("./db");
const FAKE_PASSWORD_HASH = "$2b$12$m9a4X0n04vM8lGg0t3F2Mu4LjXLp8dkUBaRdOyqK8BPVKxHrsAayG";
function parseBearerToken(header) {
    if (!header)
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token)
        return null;
    return token.trim();
}
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function normalizeIdentifier(identifier) {
    return identifier.trim().toLowerCase();
}
function getRequestIp(req) {
    if (env_1.env.TRUST_PROXY) {
        return (req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket?.remoteAddress || "").toString();
    }
    return (req.ip || req.socket?.remoteAddress || "").toString();
}
function getRequestUserAgent(req) {
    return (req.headers["user-agent"] || req.headers["User-Agent"] || "").toString();
}
function sanitizeText(input, maxLength = 5000) {
    const clean = (0, sanitize_html_1.default)(input, { allowedTags: [], allowedAttributes: {} }).trim();
    return clean.slice(0, maxLength);
}
function validatePassword(password) {
    return typeof password === "string" && password.length >= 8;
}
function validateUsername(username) {
    return /^[a-z0-9._]{3,30}$/.test(username);
}
function validateUrl(value) {
    if (!value)
        return true;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    }
    catch {
        return false;
    }
}
function issueAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: "7d" });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
}
async function createSession(userId, token, req) {
    return db_1.db.createSession({
        userId,
        tokenHash: hashToken(token),
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
}
async function logSecurityEvent(type, req, details = {}, userId) {
    if (!env_1.env.LOG_SECURITY_EVENTS)
        return;
    await db_1.db.insertSecurityLog({
        eventType: type,
        userId: userId || null,
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        details,
    });
}
async function countRecentEvents(eventType, identifier, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return db_1.db.countSecurityEvents(eventType, identifier, since);
}
async function compareAgainstFakeHash(password) {
    return bcryptCompare(password, FAKE_PASSWORD_HASH);
}
async function bcryptCompare(password, hash) {
    const bcrypt = await import("bcrypt");
    return bcrypt.compare(password, hash);
}
