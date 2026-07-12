import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}

function parseCsv(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
    if (value === undefined) return defaultValue;
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(name: string, value: string | undefined, defaultValue: number) {
    const parsed = Number(value ?? defaultValue);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return parsed;
}

const port = Number(process.env.PORT || 3003);
const host = process.env.HOST || "0.0.0.0";

const corsOriginsRaw = process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGIN;
if (!corsOriginsRaw || !corsOriginsRaw.trim()) {
    throw new Error("Missing required environment variable: CORS_ORIGINS");
}

export const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: Number.isFinite(port) ? port : 3003,
    HOST: host,
    DATABASE_URL: requireEnv("DATABASE_URL"),
    JWT_SECRET: requireEnv("JWT_SECRET"),
    JWT_ISSUER: process.env.JWT_ISSUER || "bitglow-backend",
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || "bitglow-api",
    ACCESS_TOKEN_TTL_SECONDS: parsePositiveInteger("ACCESS_TOKEN_TTL_SECONDS", process.env.ACCESS_TOKEN_TTL_SECONDS, 7 * 24 * 60 * 60),
    REFRESH_TOKEN_TTL_SECONDS: parsePositiveInteger("REFRESH_TOKEN_TTL_SECONDS", process.env.REFRESH_TOKEN_TTL_SECONDS, 30 * 24 * 60 * 60),
    CORS_ORIGINS: parseCsv(corsOriginsRaw),
    LOG_SECURITY_EVENTS: process.env.LOG_SECURITY_EVENTS !== "false",
    TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, false),
    DB_STATEMENT_TIMEOUT_MS: parsePositiveInteger("DB_STATEMENT_TIMEOUT_MS", process.env.DB_STATEMENT_TIMEOUT_MS, 15_000),
    DB_CONNECTION_TIMEOUT_MS: parsePositiveInteger("DB_CONNECTION_TIMEOUT_MS", process.env.DB_CONNECTION_TIMEOUT_MS, 10_000),
    LIVE_MESSAGE_TTL_SECONDS: parsePositiveInteger("LIVE_MESSAGE_TTL_SECONDS", process.env.LIVE_MESSAGE_TTL_SECONDS, 300),
    WS_MAX_PAYLOAD_BYTES: parsePositiveInteger("WS_MAX_PAYLOAD_BYTES", process.env.WS_MAX_PAYLOAD_BYTES, 16_384),
    RESEND_API_KEY: process.env.RESEND_API_KEY || "", // Optional during dev if missing
};

if (env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
}
