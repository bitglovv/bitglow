import crypto from "crypto";
import jwt from "jsonwebtoken";
import net from "net";
import sanitizeHtml from "sanitize-html";
import { env } from "../config/env";
import { db } from "./db";

const FAKE_PASSWORD_HASH = "$2b$12$m9a4X0n04vM8lGg0t3F2Mu4LjXLp8dkUBaRdOyqK8BPVKxHrsAayG";

export type AuthTokenPayload = {
    id: string;
    username: string;
    sid: string;
};

export type RequestActor = {
    id: string;
    username: string;
    sessionId: string;
    role?: string | null;
};

export function parseBearerToken(header?: string | null) {
    if (!header) return null;
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token.trim();
}

export function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizeIdentifier(identifier: string) {
    return identifier.trim().toLowerCase();
}

export function getRequestIp(req: any) {
    return (req.ip || req.socket?.remoteAddress || "").toString();
}

export function getRequestUserAgent(req: any) {
    return (req.headers["user-agent"] || req.headers["User-Agent"] || "").toString();
}

export function sanitizeText(input: string, maxLength = 5000) {
    const clean = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
    return clean.slice(0, maxLength);
}

export function validatePassword(password: string) {
    return typeof password === "string" && password.length >= 8;
}

export function validateUsername(username: string) {
    return /^[a-z0-9._]{3,30}$/.test(username);
}

export function validateUrl(value?: string | null) {
    if (!value) return true;
    if (value.length > 2048) return false;
    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) return false;
        return !isLocalOrPrivateHost(url.hostname);
    } catch {
        return false;
    }
}

function isLocalOrPrivateHost(hostname: string) {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost")) return true;

    const ipVersion = net.isIP(host);
    if (ipVersion === 4) {
        const [a, b] = host.split(".").map(Number);
        return a === 10
            || a === 127
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168)
            || a === 0;
    }
    if (ipVersion === 6) {
        return host === "::1"
            || host.startsWith("fc")
            || host.startsWith("fd")
            || host.startsWith("fe80:");
    }

    return false;
}

export function issueAccessToken(payload: AuthTokenPayload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export async function createSession(userId: string, sid: string, token: string, req: any) {
    return db.createSession({
        userId,
        sid,
        tokenHash: hashToken(token),
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
}

export async function logSecurityEvent(
    type: string,
    req: any,
    details: Record<string, any> = {},
    userId?: string | null
) {
    if (!env.LOG_SECURITY_EVENTS) return;
    await db.insertSecurityLog({
        eventType: type,
        userId: userId || null,
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        details,
    });
}

export async function countRecentEvents(eventType: string, identifier: string, windowMs: number) {
    const since = new Date(Date.now() - windowMs);
    return db.countSecurityEvents(eventType, identifier, since);
}

export async function compareAgainstFakeHash(password: string) {
    return bcryptCompare(password, FAKE_PASSWORD_HASH);
}

async function bcryptCompare(password: string, hash: string) {
    const bcrypt = await import("bcrypt");
    return bcrypt.compare(password, hash);
}

