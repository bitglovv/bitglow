import { useCallback, useEffect, useRef, useState } from "react";
import { api, LiveRoom } from "../services/api";
import { WS_URL } from "../config/env";
import { useChatStore } from "../store/chatStore";

type ChatMessage = {
  id: string;
  roomId: string;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  text: string;
  ts: number;
  type?: "chat" | "system";
};

type RoomUser = {
  id: string;
  username: string;
  avatarUrl?: string;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const MESSAGE_TTL = 5 * 60 * 1_000;
const MAX_MESSAGES = 100;
const MESSAGE_COOLDOWN = 1_000;
const MAX_LENGTH = 200;

export function useLiveRoom(token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [roomOnline, setRoomOnline] = useState<number>(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; ts: number }>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [isResolvingRoom, setIsResolvingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string>("");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [hasJoinedChat, setHasJoinedChat] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const expiryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeRoomIdRef = useRef<string | null>(null);
  const resolveRequestRef = useRef(0);
  const idRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const lastTypingSentRef = useRef(0);

  activeRoomIdRef.current = activeRoom?.id || null;

  const clearAllExpiryTimers = () => {
    expiryTimersRef.current.forEach((t) => clearTimeout(t));
    expiryTimersRef.current.clear();
  };

  const scheduleExpiry = (msgId: string, ts: number) => {
    if (expiryTimersRef.current.has(msgId)) return;
    const remaining = MESSAGE_TTL - (Date.now() - ts);
    if (remaining <= 0) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      return;
    }
    const timer = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      expiryTimersRef.current.delete(msgId);
    }, remaining);
    expiryTimersRef.current.set(msgId, timer);
  };

  useEffect(() => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (socket?.readyState === WebSocket.OPEN && roomId && hasJoinedChat) {
        socket.send(JSON.stringify({ type: "client:room:presence", roomId }));
    }
  }, [activeRoom, status, hasJoinedChat]);

  const openOwnLiveRoom = useCallback(async () => {
    const requestId = ++resolveRequestRef.current;
    setIsResolvingRoom(true);
    try {
      const room = await api.live.openRoom();
      if (!room) throw new Error("Failed to open room");
      if (resolveRequestRef.current !== requestId) return null;
      setActiveRoom(room);
      setMessages([]);
      setRoomError("");
      return room;
    } catch (error) {
      if (resolveRequestRef.current === requestId) {
        setActiveRoom(null);
        setRoomError("Failed to open your live room.");
      }
      return null;
    } finally {
      if (resolveRequestRef.current === requestId) setIsResolvingRoom(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void openOwnLiveRoom();
  }, [token, openOwnLiveRoom]);

  useEffect(() => {
    if (!token) return;

    setStatus("connecting");
    let socket: WebSocket;
    let didCleanup = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      socket = new WebSocket(WS_URL);
    } catch (err) {
      console.error("[LiveRoom] WebSocket creation error:", err);
      setStatus("disconnected");
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), 10000);
      reconnectTimer = setTimeout(() => {
        setReconnectAttempt((attempt) => attempt + 1);
      }, delay);
      return () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };
    }

    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      setReconnectAttempt(0);
      socket.send(JSON.stringify({ type: "client:hello", token }));
    };

    socket.onmessage = async (event) => {
      if (didCleanup) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "server:welcome") setSelfId(data.userId);
        
        if (data.type === "server:room:history" && data.roomId === activeRoomIdRef.current) {
          const now = Date.now();
          const history = (data.messages || [])
            .filter((m: any) => (now - m.ts) < MESSAGE_TTL)
            .map((m: any) => ({
              id: m.id || `hist-${m.ts}-${m.userId}`,
              roomId: m.roomId, userId: m.userId, username: m.username, avatarUrl: m.avatarUrl, text: m.text, ts: m.ts,
            }));

          setMessages((prev) => {
             const existingIds = new Set(prev.map(m => m.id));
             const newHist = history.filter((h: any) => !existingIds.has(h.id));
             const merged = [...newHist, ...prev].sort((a, b) => a.ts - b.ts);
             merged.forEach((m: ChatMessage) => scheduleExpiry(m.id, m.ts));
             return merged;
          });
        }

        if (data.type === "server:room:message" && data.roomId === activeRoomIdRef.current) {
          const msg = data.message;
          if (!msg) return;
          const { restrictedUsers, mutedUsers } = useChatStore.getState();
          if (msg.userId && (restrictedUsers.has(msg.userId) || mutedUsers.has(msg.userId))) return;
          const msgTs: number = msg.ts ?? Date.now();
          if (Date.now() - msgTs >= MESSAGE_TTL) return;

          idRef.current += 1;
          const newMsg: ChatMessage = {
            id: msg.id || `msg-${idRef.current}`,
            roomId: data.roomId, userId: msg.userId, username: msg.username, avatarUrl: msg.avatarUrl, text: msg.text, ts: msgTs,
          };
          scheduleExpiry(newMsg.id, msgTs);
          setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), newMsg]);
        }

        if (data.type === "server:room:presence" && data.roomId === activeRoomIdRef.current) {
          const { restrictedUsers, mutedUsers } = useChatStore.getState();
          setRoomOnline(Number(data.count) || 0);
          setRoomUsers((data.users || []).filter((u: RoomUser) => !restrictedUsers.has(u.id) && !mutedUsers.has(u.id)));
        }

        if (data.type === "server:room:system" && data.roomId === activeRoomIdRef.current) {
          const msg: ChatMessage = {
            id: `sys-${data.ts}-${data.message}`, roomId: data.roomId, text: data.message, ts: data.ts, type: "system"
          };
          setMessages(prev => [...prev, msg]);
        }

        if (data.type === "server:room:typing" && data.roomId === activeRoomIdRef.current) {
          setTypingUsers(prev => ({ ...prev, [data.userId]: { username: data.username, ts: Date.now() } }));
        }

        if (data.type === "server:error" && data.message) {
          const message = String(data.message);
          if (/access denied|can only be sent from your own room/i.test(message)) {
            const room = await openOwnLiveRoom();
            if (room) setRoomError("Live room refreshed. You're back in your room.");
            else setRoomError(message);
            return;
          }
          setRoomError(message);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    socket.onerror = () => {
    };

    socket.onclose = () => {
      if (didCleanup) return;
      setStatus("disconnected");
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), 10000);
      reconnectTimer = setTimeout(() => {
        setReconnectAttempt((attempt) => attempt + 1);
      }, delay);
    };

    const typingInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const uid in next) {
          if (now - next[uid].ts > 2500) { delete next[uid]; changed = true; }
        }
        return changed ? next : prev;
      });
    }, 500);

    return () => {
      didCleanup = true;
      clearInterval(typingInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearAllExpiryTimers();
      if (socket.readyState === WebSocket.OPEN) {
        if (activeRoomIdRef.current) socket.send(JSON.stringify({ type: "client:leave_room", roomId: activeRoomIdRef.current }));
        socket.close();
      }
    };
  }, [token, openOwnLiveRoom, reconnectAttempt]);

  useEffect(() => {
    const applyRelationshipChange = (event: Event) => {
      const { userId, blocked, muted } = (event as CustomEvent).detail || {};
      if (!userId || (!blocked && !muted)) return;
      setMessages((prev) => prev.filter((message) => message.userId !== userId));
      setRoomUsers((prev) => prev.filter((roomUser) => roomUser.id !== userId));
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };
    window.addEventListener("bitglow:block-changed", applyRelationshipChange);
    window.addEventListener("bitglow:mute-changed", applyRelationshipChange);
    return () => {
      window.removeEventListener("bitglow:block-changed", applyRelationshipChange);
      window.removeEventListener("bitglow:mute-changed", applyRelationshipChange);
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;
    if (!hasJoinedChat) return;

    setRoomError("");
    setRoomOnline(0);
    socket.send(JSON.stringify({ type: "client:join_room", roomId }));

    return () => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "client:leave_room", roomId }));
    };
  }, [activeRoom?.id, hasJoinedChat, status]);

  const handleSend = useCallback((rawText: string) => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId || !hasJoinedChat) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < MESSAGE_COOLDOWN) return;

    const text = rawText.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    lastSentAtRef.current = now;
    socket.send(JSON.stringify({ type: "client:chat:send", roomId, text }));
  }, [activeRoom, hasJoinedChat]);

  const handleTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !activeRoom?.id || !hasJoinedChat) return;
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    socket.send(JSON.stringify({ type: "client:typing", roomId: activeRoom.id }));
  }, [activeRoom, hasJoinedChat]);

  const handleLeave = useCallback(() => {
    const socket = socketRef.current;
    const rid = activeRoomIdRef.current;
    localStorage.removeItem('bitglow_live_joined');
    localStorage.removeItem('bitglow_live_joined_at');
    if (rid) {
        sessionStorage.removeItem(`${CACHE_KEY}_${rid}`);
        sessionStorage.removeItem(`${TIMESTAMP_KEY}_${rid}`);
        sessionStorage.removeItem(`${SCROLL_KEY}_${rid}`);
    }
    if (socket && socket.readyState === WebSocket.OPEN && rid) {
      socket.send(JSON.stringify({ type: "client:leave_room", roomId: rid }));
    }
    clearAllExpiryTimers();
    setMessages([]);
    setRoomOnline(0);
    setRoomError("");
    setHasJoinedChat(false);
  }, []);

  const handleEnterChat = useCallback(() => {
    const now = Date.now();
    localStorage.setItem('bitglow_live_joined', 'true');
    localStorage.setItem('bitglow_live_joined_at', String(now));
    setRoomError("");
    setHasJoinedChat(true);
  }, []);

  return {
    messages,
    roomUsers,
    roomOnline,
    typingUsers,
    selfId,
    status,
    activeRoom,
    roomError,
    isResolvingRoom,
    hasJoinedChat,
    handleSend,
    handleTyping,
    handleLeave,
    handleEnterChat,
    activeRoomId: activeRoomIdRef.current,
  };
}
