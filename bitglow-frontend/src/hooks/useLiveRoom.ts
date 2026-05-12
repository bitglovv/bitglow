import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, api, LiveRoom } from "../services/api";

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

const CACHE_KEY = "bitglow_live_messages_v1";
const TIMESTAMP_KEY = "bitglow_live_msg_ts";
const SCROLL_KEY = "bitglow_live_msg_scroll";

export function useLiveRoom(token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const rid = localStorage.getItem('bitglow_last_room_id');
      const saved = sessionStorage.getItem(`${CACHE_KEY}_${rid}`);
      const savedTs = sessionStorage.getItem(`${TIMESTAMP_KEY}_${rid}`);
      if (saved && savedTs) {
        const now = Date.now();
        return JSON.parse(saved).filter((m: any) => (now - m.ts) < MESSAGE_TTL);
      }
    } catch(e) {}
    return [];
  });
  
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [roomOnline, setRoomOnline] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; ts: number }>>({});
  const [selfId, setSelfId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [roomError, setRoomError] = useState("");
  const [isResolvingRoom, setIsResolvingRoom] = useState(true);
  const [hasJoinedChat, setHasJoinedChat] = useState(() => localStorage.getItem('bitglow_live_joined') === 'true');

  const socketRef = useRef<WebSocket | null>(null);
  const idRef = useRef(0);
  const activeRoomIdRef = useRef<string | null>(null);
  const resolveRequestRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const lastTypingSentRef = useRef(0);
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id ?? null;
    if (activeRoom?.id) {
       localStorage.setItem('bitglow_last_room_id', activeRoom.id);
    }
  }, [activeRoom]);

  useEffect(() => {
    const rid = activeRoomIdRef.current;
    if (rid && hasJoinedChat) {
       sessionStorage.setItem(`${CACHE_KEY}_${rid}`, JSON.stringify(messages));
       sessionStorage.setItem(`${TIMESTAMP_KEY}_${rid}`, Date.now().toString());
    }
  }, [messages, hasJoinedChat]);

  useEffect(() => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (socket?.readyState === WebSocket.OPEN && roomId) {
        socket.send(JSON.stringify({ type: "client:room:presence", roomId }));
    }
  }, [activeRoom, status]);

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
    const wsHost = API_URL.replace("http://", "ws://").replace("https://", "wss://").replace("/api", "");
    const socket = new WebSocket(wsHost);
    socketRef.current = socket;

    let didCleanup = false;

    socket.onopen = () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "client:hello", token }));
      if (activeRoomIdRef.current) {
        socket.send(JSON.stringify({ type: "client:join_room", roomId: activeRoomIdRef.current }));
      }
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
          setRoomOnline(Number(data.count) || 0);
          setRoomUsers(data.users || []);
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

    socket.onclose = () => { if (!didCleanup) setStatus("disconnected"); };

    const typingInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
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
      clearAllExpiryTimers();
      if (socket.readyState === WebSocket.OPEN) {
        if (activeRoomIdRef.current) socket.send(JSON.stringify({ type: "client:leave_room", roomId: activeRoomIdRef.current }));
        socket.close();
      }
    };
  }, [token, openOwnLiveRoom]);

  useEffect(() => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;
    if (activeRoomIdRef.current) {
        setRoomError("");
        setRoomOnline(0);
        socket.send(JSON.stringify({ type: "client:join_room", roomId }));
    }
    return () => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "client:leave_room", roomId }));
    };
  }, [activeRoom?.id, hasJoinedChat]);

  function scheduleExpiry(msgId: string, msgTs: number) {
    const existing = timerMapRef.current.get(msgId);
    if (existing) clearTimeout(existing);

    const remaining = MESSAGE_TTL - (Date.now() - msgTs);
    if (remaining <= 0) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      return;
    }

    const tid = setTimeout(() => {
      timerMapRef.current.delete(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }, remaining);
    timerMapRef.current.set(msgId, tid);
  }

  function clearAllExpiryTimers() {
    timerMapRef.current.forEach((tid) => clearTimeout(tid));
    timerMapRef.current.clear();
  }

  const handleSend = useCallback((rawText: string) => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < MESSAGE_COOLDOWN) return;

    const text = rawText.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    lastSentAtRef.current = now;
    socket.send(JSON.stringify({ type: "client:chat:send", roomId, text }));
  }, [activeRoom]);

  const handleTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !activeRoom?.id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    socket.send(JSON.stringify({ type: "client:typing", roomId: activeRoom.id }));
  }, [activeRoom]);

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
    if (socketRef.current?.readyState === WebSocket.OPEN && activeRoomIdRef.current) {
      socketRef.current.send(JSON.stringify({ type: "client:join_room", roomId: activeRoomIdRef.current }));
    }
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
