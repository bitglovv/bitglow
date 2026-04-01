/* bitglow-backend/src/ws/types.ts */
export type WSMessage =
    | ClientHello
    | ClientSetName
    | ClientJoinRoom
    | ClientLeaveRoom
    | ClientRoomPresence
    | ClientChatSend
    | ClientTyping
    | ServerWelcome
    | ServerRoomHistory
    | ServerRoomMessage
    | ServerRoomPresence
    | ServerRoomSystem
    | ServerRoomTyping
    | ServerPresence
    | ServerError;

/* ... Base and existing interfaces ... */

export interface ClientTyping extends Base {
    type: "client:typing";
    roomId: string;
}

export interface ServerRoomPresence extends Base {
    type: "server:room:presence";
    roomId: string;
    count: number;
    users?: { id: string; username: string; avatarUrl?: string; }[];
}

export interface ServerRoomSystem extends Base {
    type: "server:room:system";
    roomId: string;
    message: string;
}

export interface ServerRoomTyping extends Base {
    type: "server:room:typing";
    roomId: string;
    userId: string;
    username: string;
}

interface Base {
    type: string;
    ts?: number;
}

/* CLIENT -> SERVER */

export interface ClientHello extends Base {
    type: "client:hello";
    token?: string;
}

export interface ClientSetName extends Base {
    type: "client:set_name";
    username: string;
}

export interface ClientChatSend extends Base {
    type: "client:chat:send";
    roomId: string;
    text: string;
}

export interface ClientJoinRoom extends Base {
    type: "client:join_room";
    roomId: string;
}

export interface ClientLeaveRoom extends Base {
    type: "client:leave_room";
    roomId: string;
}

export interface ClientRoomPresence extends Base {
    type: "client:room:presence";
    roomId: string;
}

/* SERVER -> CLIENT */

export interface ServerWelcome extends Base {
    type: "server:welcome";
    userId: string;
    username: string;
}

export type RoomMessage = {
    id: string;
    roomId: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    text: string;
    ts: number;
};

export interface ServerRoomHistory extends Base {
    type: "server:room:history";
    roomId: string;
    messages: RoomMessage[];
}

export interface ServerRoomMessage extends Base {
    type: "server:room:message";
    roomId: string;
    message: RoomMessage;
}

export interface ServerPresence extends Base {
    type: "server:presence";
    onlineCount: number;
}

export interface ServerError extends Base {
    type: "server:error";
    message: string;
}
