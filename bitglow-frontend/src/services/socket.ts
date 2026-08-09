type Subscriber = (data: any) => void;

const isLoopbackHost = (value?: string | null) => {
    if (!value) return false;
    try {
        const host = new URL(value).hostname;
        return host === "localhost" || host === "127.0.0.1";
    } catch {
        return value.includes("localhost") || value.includes("127.0.0.1");
    }
};

const isPrivateNetworkHost = (hostname: string) =>
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname);

function getWsUrl(): string {
    const envHost = (import.meta as any).env?.VITE_API_HOST as string | undefined;
    const hostname = window.location.hostname;

    // Case 1: localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "ws://127.0.0.1:3003";
    }

    // Case 2: LAN / private network — same IP, port 3003
    if (isPrivateNetworkHost(hostname)) {
        if (envHost && !isLoopbackHost(envHost)) {
            return envHost.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
        }
        return `ws://${hostname}:3003`;
    }

    // Case 3: Public domain (Vercel) — derive wss:// from VITE_API_HOST
    if (envHost && !isLoopbackHost(envHost)) {
        return envHost.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    }

    // VITE_API_HOST is not configured for this production deployment.
    // Throw so the misconfiguration is immediately visible rather than
    // silently routing WebSocket traffic to a hardcoded host.
    const msg =
        "[BitGlow] VITE_API_HOST is not set for a production build. " +
        "Add VITE_API_HOST=https://<your-backend>.onrender.com to your Vercel environment variables.";
    console.error(msg);
    throw new Error(msg);
}

class SocketService {
    private socket: WebSocket | null = null;
    private subscribers: Subscriber[] = [];
    private url: string = getWsUrl();
    private reconnectInterval: number = 3000;

    connect() {
        const token = localStorage.getItem("token");
        if (!token) return;

        if (this.socket?.readyState === WebSocket.OPEN) return;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("WS Connected");
            const freshToken = localStorage.getItem("token");
            if (freshToken) {
                this.send({ type: "client:hello", token: freshToken });
            }
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.subscribers.forEach((sub) => sub(data));
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        this.socket.onclose = () => {
            console.log("WS Closed, reconnecting...");
            const freshToken = localStorage.getItem("token");
            if (freshToken) {
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };
    }

    send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    subscribe(callback: Subscriber) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((s) => s !== callback);
        };
    }

    disconnect() {
        this.socket?.close();
        this.socket = null;
    }
}

export const socketService = new SocketService();
