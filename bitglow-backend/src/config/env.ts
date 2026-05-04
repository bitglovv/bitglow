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
    CORS_ORIGINS: parseCsv(corsOriginsRaw),
    LOG_SECURITY_EVENTS: process.env.LOG_SECURITY_EVENTS !== "false",
    TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, false),
};

if (env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
}
