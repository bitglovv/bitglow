import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Live-chat limits (must match backend) ───────────────────────────────────
const MESSAGE_TTL = 5 * 60 * 1_000; // 5 minutes
const MAX_MESSAGES = 100;
const MESSAGE_COOLDOWN = 1_000;           // 1 second anti-spam
const MAX_LENGTH = 200;
// ─────────────────────────────────────────────────────────────────────────────
import clsx from "clsx";
import LiveChatIcon from "../assets/icons/live-chat.svg";

import Header from "../components/common/Header";
import LiveMessageList from "../components/chat/LiveMessageList";
import MessageInput from "../components/chat/MessageInput";
import { API_URL, api, LiveRoom } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

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

type ConnectionStatus = "connecting" | "connected" | "disconnected";

// SESSION CACHE: Keeps messages alive during navigation and refreshes.
const CACHE_KEY = "bitglow_live_messages_v1";
const TIMESTAMP_KEY = "bitglow_live_msg_ts";
const SCROLL_KEY = "bitglow_live_msg_scroll";

export default function LiveChatPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // STEP 2: Restore from sessionStorage on initial load
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
        const rid = localStorage.getItem('bitglow_last_room_id');
        const saved = sessionStorage.getItem(`${CACHE_KEY}_${rid}`);
        const savedTs = sessionStorage.getItem(`${TIMESTAMP_KEY}_${rid}`);
        
        if (saved && savedTs) {
            const now = Date.now();
            const age = now - parseInt(savedTs);
            // If the cache is too old (e.g. session was cold for 10m), we might skip it,
            // but for now we follow the user's "no loss" rule.
            return JSON.parse(saved).filter((m: any) => (now - m.ts) < MESSAGE_TTL);
        }
    } catch(e) {}
    return [];
  });
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [roomOnline, setRoomOnline] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; ts: number }>>({});
  const lastTypingSentRef = useRef<number>(0);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [roomError, setRoomError] = useState("");
  const [isResolvingRoom, setIsResolvingRoom] = useState(true);
  const [hasJoinedChat, setHasJoinedChat] = useState(() => {
    return localStorage.getItem('bitglow_live_joined') === 'true';
  });
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const idRef = useRef(0);
  const activeRoomIdRef = useRef<string | null>(null);
  const resolveRequestRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const joinedAtRef = useRef<number>(parseInt(localStorage.getItem('bitglow_live_joined_at') || '0'));
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "BitGlow \u2022 Live Chat";
  }, []);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id ?? null;
    if (activeRoom?.id) {
       localStorage.setItem('bitglow_last_room_id', activeRoom.id);
    }
  }, [activeRoom]);

  // STEP 1: Save messages and timestamp whenever they change
  useEffect(() => {
    const rid = activeRoomIdRef.current;
    if (rid && hasJoinedChat) {
       sessionStorage.setItem(`${CACHE_KEY}_${rid}`, JSON.stringify(messages));
       sessionStorage.setItem(`${TIMESTAMP_KEY}_${rid}`, Date.now().toString());
    }
  }, [messages, hasJoinedChat]);

  // STEP 5: Restore scroll on mount (after a tiny delay once messages render)
  useEffect(() => {
    const rid = activeRoomIdRef.current;
    if (rid && hasJoinedChat) {
      const savedScroll = sessionStorage.getItem(`${SCROLL_KEY}_${rid}`);
      if (savedScroll && messagesScrollRef.current) {
        // Use a timeout to ensure DOM is ready
        setTimeout(() => {
          if (messagesScrollRef.current) {
            messagesScrollRef.current.scrollTop = parseInt(savedScroll);
          }
        }, 100);
      }
    }
  }, [hasJoinedChat]);

  // STEP 7: SUPPORT PRE-ENTRY COUNT
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
      if (!room) {
        throw new Error("Failed to open room");
      }

      if (resolveRequestRef.current !== requestId) {
        return null;
      }

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
      if (resolveRequestRef.current === requestId) {
        setIsResolvingRoom(false);
      }
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

        if (data.type === "server:welcome") {
          setSelfId(data.userId);
        }

          if (data.type === "server:room:history") {
          if (data.roomId !== activeRoomIdRef.current) return;

          const now = Date.now();

          // Filter for history that is within the 5-minute TTL.
          const history = (data.messages || [])
            .filter((m: any) => (now - m.ts) < MESSAGE_TTL)
            .map((message: any) => ({
              id: message.id || `hist-${message.ts}-${message.userId}`,
              roomId: message.roomId,
              userId: message.userId,
              username: message.username,
              avatarUrl: message.avatarUrl,
              text: message.text,
              ts: message.ts,
            }));

          // Merge history with current messages (avoid duplicates)
          setMessages((prev) => {
             const existingIds = new Set(prev.map(m => m.id));
             const newHist = history.filter((h: any) => !existingIds.has(h.id));
             const merged = [...newHist, ...prev].sort((a, b) => a.ts - b.ts);
             
             // Schedule individual expiry timers for everything merged
             merged.forEach((m: ChatMessage) => scheduleExpiry(m.id, m.ts));
             return merged;
          });
        }

        if (data.type === "server:room:message") {
          if (data.roomId !== activeRoomIdRef.current) return;

          const message = data.message;
          if (!message) return;

          const msgTs: number = message.ts ?? Date.now();
          const now = Date.now();

          // Drop if already expired (clock skew / late delivery)
          if (now - msgTs >= MESSAGE_TTL) return;

          idRef.current += 1;
          const newMsg: ChatMessage = {
            id: message.id || `msg-${idRef.current}`,
            roomId: data.roomId,
            userId: message.userId,
            username: message.username,
            avatarUrl: message.avatarUrl,
            text: message.text,
            ts: msgTs,
          };

          scheduleExpiry(newMsg.id, msgTs);
          setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), newMsg]);
        }

        if (data.type === "server:room:presence") {
          if (data.roomId !== activeRoomIdRef.current) return;
          setRoomOnline(Number(data.count) || 0);
          setRoomUsers(data.users || []);
        }

        if (data.type === "server:room:system") {
          if (data.roomId !== activeRoomIdRef.current) return;
          const msg: ChatMessage = {
            id: `sys-${data.ts}-${data.message}`,
            roomId: data.roomId,
            text: data.message,
            ts: data.ts,
            type: "system"
          };
          setMessages(prev => [...prev, msg]);
        }

        if (data.type === "server:room:typing") {
          if (data.roomId !== activeRoomIdRef.current) return;
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: { username: data.username, ts: Date.now() }
          }));
        }

        if (data.type === "server:error" && data.message) {
          const message = String(data.message);
          if (/access denied|can only be sent from your own room/i.test(message)) {
            const room = await openOwnLiveRoom();
            if (room) {
              setRoomError("Live room refreshed. You're back in your room.");
            } else {
              setRoomError(message);
            }
            return;
          }

          setRoomError(message);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    socket.onclose = () => {
      if (!didCleanup) {
        setStatus("disconnected");
      }
    };

    // Periodically purge typing users
    const typingInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        let changed = false;
        const next = { ...prev };
        for (const uid in next) {
          if (now - next[uid].ts > 2500) {
            delete next[uid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);

    return () => {
      didCleanup = true;
      clearInterval(typingInterval);
      clearAllExpiryTimers(); // cancel all per-message expire timeouts
      if (socket.readyState === WebSocket.OPEN) {
        if (activeRoomIdRef.current) {
          socket.send(JSON.stringify({ type: "client:leave_room", roomId: activeRoomIdRef.current }));
        }
        socket.close();
      }
    };
  }, [token, openOwnLiveRoom]);

  useEffect(() => {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;

    // STEP 11: SILENT AUTO-JOIN (Accurate Online Count)
    // We join the room as soon as we connect, so we are counted as "Online" 
    // even if we are still on the "Welcome Screen".
    if (activeRoomIdRef.current) {
        setRoomError("");
        setRoomOnline(0);
        socket.send(JSON.stringify({ type: "client:join_room", roomId }));
    }

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "client:leave_room", roomId }));
      }
    };
  }, [activeRoom?.id, hasJoinedChat]);

  function handleSend(rawText: string) {
    const socket = socketRef.current;
    const roomId = activeRoom?.id;
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;

    // STEP 5a: Client-side anti-spam cooldown
    const now = Date.now();
    if (now - lastSentAtRef.current < MESSAGE_COOLDOWN) return;

    // STEP 5b: Client-side length guard
    const text = rawText.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    lastSentAtRef.current = now;
    socket.send(JSON.stringify({
      type: "client:chat:send",
      roomId,
      text,
    }));
  }

  function handleTyping() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !activeRoom?.id) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;

    socket.send(JSON.stringify({
      type: "client:typing",
      roomId: activeRoom.id
    }));
  }

  const canSend = status === "connected" && !!activeRoom?.id && !isResolvingRoom;

  /**
   * Schedule an individual timeout that removes a single message from state
   * exactly when its 5-minute TTL expires. Clears any previous timer for the
   * same id to avoid double-removal if history + live stream overlap.
   */
  function scheduleExpiry(msgId: string, msgTs: number) {
    const existing = timerMapRef.current.get(msgId);
    if (existing) clearTimeout(existing);

    const remaining = MESSAGE_TTL - (Date.now() - msgTs);
    if (remaining <= 0) {
      // Already expired — remove immediately
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      return;
    }

    const tid = setTimeout(() => {
      timerMapRef.current.delete(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }, remaining);

    timerMapRef.current.set(msgId, tid);
  }

  /** Cancel all pending expiry timers (called on leave / unmount). */
  function clearAllExpiryTimers() {
    timerMapRef.current.forEach((tid) => clearTimeout(tid));
    timerMapRef.current.clear();
  }

  const roomTitle = useMemo(() => {
    return `${user?.displayName || user?.username || 'BitGlow'}'s Room`;
  }, [user?.displayName, user?.username]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [id, user] of Object.entries(next)) {
          if (now - user.ts > 3000) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLeave = useCallback(() => {
    const socket = socketRef.current;
    const rid = activeRoomIdRef.current;

    // 1. Clear persisted state completely on Leave Room
    localStorage.removeItem('bitglow_live_joined');
    localStorage.removeItem('bitglow_live_joined_at');
    if (rid) {
        sessionStorage.removeItem(`${CACHE_KEY}_${rid}`);
        sessionStorage.removeItem(`${TIMESTAMP_KEY}_${rid}`);
        sessionStorage.removeItem(`${SCROLL_KEY}_${rid}`);
    }

    // 2. Tell server we're leaving so presence count updates for others
    if (socket && socket.readyState === WebSocket.OPEN && rid) {
      socket.send(JSON.stringify({ type: "client:leave_room", roomId: rid }));
    }

    // 3. Immediately wipe all local messages & cancel their timers
    clearAllExpiryTimers();
    setMessages([]);
    setRoomOnline(0);
    setRoomError("");

    // Reset local joining refs
    joinedAtRef.current = 0;
    setHasJoinedChat(false);
  }, [clearAllExpiryTimers]);

  const handleEnterChat = useCallback(() => {
    // Record the moment the user pressed "Enter Live Chat"
    const now = Date.now();
    joinedAtRef.current = now;

    // Persist joined state so it survives refresh/back button
    localStorage.setItem('bitglow_live_joined', 'true');
    localStorage.setItem('bitglow_live_joined_at', String(now));

    // STEP 3: Remove setMessages([]) from entry to avoid wipe if re-entering
    setRoomError("");
    setHasJoinedChat(true);

    // Re-join if socket already open
    if (socketRef.current?.readyState === WebSocket.OPEN && activeRoomIdRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "client:join_room",
        roomId: activeRoomIdRef.current
      }));
    }
  }, [clearAllExpiryTimers]);

  // Auto-scroll logic (Instagram style)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowNewMsgButton(false);
  };

  const onScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    
    // STEP 5: Save scroll position on update
    const rid = activeRoomIdRef.current;
    if (rid) {
        sessionStorage.setItem(`${SCROLL_KEY}_${rid}`, el.scrollTop.toString());
    }

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isAtBottom) setShowNewMsgButton(false);
  };

  // Scroll to bottom on join/re-entry (instant)
  useEffect(() => {
    if (hasJoinedChat && messages.length > 0) {
      setTimeout(() => scrollToBottom("auto"), 50);
    }
  }, [hasJoinedChat]);

  // Scroll to bottom on new message if user is at bottom
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || messages.length === 0) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isAtBottom) {
      scrollToBottom("smooth");
    } else {
      setShowNewMsgButton(true);
    }
  }, [messages]);

  const typingLabel = useMemo(() => {
    const users = Object.values(typingUsers);
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].username} is typing...`;
    if (users.length === 2) return `${users[0].username} & ${users[1].username} are typing...`;
    return 'Several people are typing...';
  }, [typingUsers]);

  return (
    <div className="flex flex-col h-screen bg-black text-white selection:bg-brand/30 overflow-hidden touch-none">

      {!hasJoinedChat ? (
        // Welcome Screen - Before entering chat
        <>
          <Header hideActions={true} hideBottomNav={false} />
          <div className="flex-1 flex items-center justify-center p-6 pb-[80px] bg-black">
            <div className="max-w-sm w-full flex flex-col items-center justify-center text-center">

              {/* Centered Icon */}
              <img src={LiveChatIcon} alt="Live Chat" className="live-icon-xl mx-auto mb-6" />

              {/* Typography */}
              <h1 className="text-3xl font-black mb-2 tracking-tight text-white">
                {roomTitle}
              </h1>
              <p className="text-zinc-500 mb-8 text-[13px] font-medium tracking-wide">
                Your live space for real-time conversations
              </p>

              {/* Online Presence */}
              <div className="flex items-center justify-center gap-2 mb-8 bg-zinc-900/50 border border-white/5 py-1.5 px-4 rounded-full shadow-inner">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black text-white tracking-[0.1em] uppercase">
                  {roomOnline} Online
                </span>
              </div>
              {/* Premium Button */}
              <button
                onClick={handleEnterChat}
                disabled={!activeRoom || status !== "connected"}
                className="w-full h-14 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-black text-[14px] uppercase tracking-widest hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300 active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                Enter Live Chat
              </button>
            </div>
          </div>
        </>
      ) : (
        // Live Chat Screen - After entering
        <>
          <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-black/80 backdrop-blur-3xl border-b border-white/[0.03] px-5 flex items-center justify-between">
            {/* LEFT: Identity & Status */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col min-w-0">
                <h2 className="text-[13px] font-black text-white truncate max-w-[120px] sm:max-w-xs leading-tight tracking-tight">
                  {roomTitle}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black tracking-widest text-emerald-500 uppercase leading-none">{roomOnline} Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Actions & Live Indicator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-[9px] font-black tracking-tighter text-emerald-400 uppercase">LIVE</span>
              </div>
              <button
                type="button"
                onClick={handleLeave}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-[10px] font-black tracking-widest transition-all text-white shadow-lg shadow-red-600/20 uppercase"
              >
                LEAVE
              </button>
            </div>
          </header>

          <main className="flex-1 flex flex-col h-[calc(100vh-56px)] mt-14 overflow-hidden relative">
            {/* Messages Container */}
            <div
              ref={messagesScrollRef}
              onScroll={onScroll}
              className="flex-1 overflow-y-auto scrollbar-hide flex flex-col touch-pan-y overscroll-none"
            >
              <div className="w-full max-w-[700px] mx-auto flex flex-col min-h-full px-4 pt-2 pb-[0px]">
                {/* FLEX SPACER: Pushes content to the bottom so chat starts above input bar */}
                <div className="mt-auto pointer-events-none" />

                {isResolvingRoom && !activeRoom ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Connecting...</span>
                  </div>
                ) : activeRoom ? (
                  messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-end h-full mb-70 opacity-60 pointer-events-none">
                      <p className="text-[11px] font-black tracking-[0.2em]  opacity-50 text-center">Chat will appear here when friends start chatting</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <LiveMessageList
                        messages={messages}
                        selfId={user?.id || null}
                        participants={roomUsers}
                      />
                      {/* Auto-scroll anchor */}
                      <div ref={messagesEndRef} className="h-0 w-0" />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <p className="text-[10px] uppercase font-bold tracking-widest">Connection Interrupted</p>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Scroll Button */}
            {showNewMsgButton && (
              <button
                onClick={() => scrollToBottom()}
                className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2 animate-bounce hover:scale-105 active:scale-95 transition-all z-30"
              >
                <span>New messages</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </button>
            )}

            {/* Sticky Input Bar ( Style) */}
            <div className="bg-black border-t border-white/[0.03] px-2 py-1 pb-[calc(12px+env(safe-area-inset-bottom))] z-20">
              <div className="max-w-[700px] mx-auto">
                {/* Typing Indicator */}
                <div className="h-1 mb-1 overflow-hidden">
                  {typingLabel && (
                    <div className="text-[11px] text-zinc-500 font-bold animate-in fade-in slide-in-from-bottom-1 duration-300 ml-1">
                      {typingLabel}
                    </div>
                  )}
                </div>
                <MessageInput
                  onSend={handleSend}
                  onChange={handleTyping}
                  disabled={!canSend}
                />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
