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
    type: "access";
};

export type RequestActor = {
    id: string;
    username: string;
    sessionId: string;
    role?: string | null;
};

export function parseBearerToken(header?: string | null) {
    if (!header) return null;
    const parts = header.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const [scheme, token] = parts;
    if (scheme.toLowerCase() !== "bearer" || !token) return null;
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
    return (req.headers["user-agent"] || "").toString().slice(0, 512);
}

export function sanitizeText(input: string, maxLength = 5000) {
    const clean = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
    return clean.slice(0, maxLength);
}

export function validatePassword(password: string) {
    return typeof password === "string" && password.length >= 8 && password.length <= 128;
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

export function issueAccessToken(payload: Omit<AuthTokenPayload, "type">) {
    return jwt.sign(
        { ...payload, type: "access" },
        env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE,
        }
    );
}

export function verifyAccessToken(token: string) {
    const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    }) as AuthTokenPayload;
    if (payload.type !== "access" || !payload.id || !payload.sid || !payload.username) {
        throw new Error("Invalid access token payload");
    }
    return payload;
}

export function issueRefreshToken() {
    return crypto.randomBytes(48).toString("base64url");
}

export async function createSession(userId: string, sid: string, token: string, refreshToken: string, req: any) {
    const session = await db.createSession({
        userId,
        sid,
        tokenHash: hashToken(token),
        refreshTokenHash: hashToken(refreshToken),
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        expiresAt: new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000),
        refreshExpiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
    });
    return session;
}

export async function logSecurityEvent(
    type: string,
    req: any,
    details: Record<string, unknown> = {},
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

