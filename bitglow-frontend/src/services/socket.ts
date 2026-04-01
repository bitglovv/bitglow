type Subscriber = (data: any) => void;

class SocketService {
    private socket: WebSocket | null = null;
    private subscribers: Subscriber[] = [];
    private url: string = (() => {
        const hostname = window.location.hostname;
        const isRemoteDeviceHost = !!hostname && hostname !== "localhost" && hostname !== "127.0.0.1";

        if (isRemoteDeviceHost) {
            return `ws://${hostname}:3003`;
        }

        return "ws://127.0.0.1:3003";
    })();
    private reconnectInterval: number = 3000;

    connect() {
        if (this.socket?.readyState === WebSocket.OPEN) return;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("WS Connected");
            const token = localStorage.getItem("token");
            if (token) {
                this.send({ type: "client:hello", token });
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
            setTimeout(() => this.connect(), this.reconnectInterval);
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
