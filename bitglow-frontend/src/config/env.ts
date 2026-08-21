/**
 * BitGlow Frontend Environment & Endpoint Configuration
 *
 * Single source of truth for REST API and WebSocket URLs across the entire application.
 *
 * Rules:
 * - Production REST API:  https://api.bitglow.site/api
 * - Production WebSocket: wss://api.bitglow.site
 * - Localhost REST API:   http://127.0.0.1:3003/api
 * - Localhost WebSocket:  ws://127.0.0.1:3003
 * - The WebSocket URL is NEVER derived via string manipulation on API_URL.
 */

const isLoopbackHost = (value?: string | null): boolean => {
    if (!value) return false;
    try {
        const host = new URL(value).hostname;
        return host === "localhost" || host === "127.0.0.1";
    } catch {
        return value.includes("localhost") || value.includes("127.0.0.1");
    }
};

/** Returns true for private/LAN IPs (192.168.x, 10.x, 172.16-31.x, 169.254.x) */
const isPrivateNetworkHost = (hostname: string): boolean =>
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname);

/**
 * Resolves the canonical REST API URL.
 * Output always points to the `/api` prefix.
 */
export function getApiUrl(): string {
    const envApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    const envApiHost = (import.meta as any).env?.VITE_API_HOST as string | undefined;
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

    // 1. Explicit VITE_API_URL
    if (envApiUrl) {
        if (!isLoopbackHost(envApiUrl) || hostname === "localhost" || hostname === "127.0.0.1") {
            const cleanUrl = envApiUrl.replace(/\/+$/, "");
            return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
        }
    }

    // 2. Explicit VITE_API_HOST
    if (envApiHost) {
        if (!isLoopbackHost(envApiHost) || hostname === "localhost" || hostname === "127.0.0.1") {
            const cleanHost = envApiHost.replace(/\/+$/, "");
            return cleanHost.endsWith("/api") ? cleanHost : `${cleanHost}/api`;
        }
    }

    // 3. Localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://127.0.0.1:3003/api";
    }

    // 4. LAN / private network IP (testing mobile device on dev Wi-Fi)
    if (isPrivateNetworkHost(hostname)) {
        return `http://${hostname}:3003/api`;
    }

    // 5. Canonical production REST API
    return "https://api.bitglow.site/api";
}

/**
 * Resolves the canonical WebSocket URL.
 * Production default: wss://api.bitglow.site
 * Local default: ws://127.0.0.1:3003
 */
export function getWsUrl(): string {
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

    // 1. Explicit VITE_WS_URL
    if (envWsUrl) {
        if (!isLoopbackHost(envWsUrl) || hostname === "localhost" || hostname === "127.0.0.1") {
            return envWsUrl.replace(/\/+$/, "").replace(/\/api\/?$/, "");
        }
    }

    // 2. Localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "ws://127.0.0.1:3003";
    }

    // 3. LAN / private network IP (testing mobile device on dev Wi-Fi)
    if (isPrivateNetworkHost(hostname)) {
        return `ws://${hostname}:3003`;
    }

    // 4. Canonical production WebSocket
    return "wss://api.bitglow.site";
}

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
