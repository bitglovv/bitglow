import { WS_URL } from "../config/env";

type Subscriber = (data: any) => void;

class SocketService {
    private socket: WebSocket | null = null;
    private subscribers: Subscriber[] = [];
    private reconnectAttempt: number = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isManuallyClosed: boolean = false;

    connect() {
        this.isManuallyClosed = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;

        try {
            this.socket = new WebSocket(WS_URL);
        } catch (e) {
            console.error("[WS] Connection creation failed:", e);
            this.scheduleReconnect();
            return;
        }

        this.socket.onopen = () => {
            this.reconnectAttempt = 0;
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
                console.error("[WS] Parse error:", e);
            }
        };

        this.socket.onerror = () => {
            // Handled via onclose
        };

        this.socket.onclose = () => {
            if (this.isManuallyClosed) return;
            this.scheduleReconnect();
        };
    }

    private scheduleReconnect() {
        if (this.isManuallyClosed || this.reconnectTimer) return;
        const freshToken = localStorage.getItem("token");
        if (!freshToken) return;

        // Exponential backoff: 2s -> 3s -> 4.5s -> 6.75s -> max 15s
        const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempt), 15000);
        this.reconnectAttempt++;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
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
        this.isManuallyClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
