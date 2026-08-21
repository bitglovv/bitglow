import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import LiveChatIcon from "../assets/icons/LiveChat.png";
import Header from "../components/common/Header";
import LiveMessageList from "../components/chat/LiveMessageList";
import MessageComposer from "../components/chat/MessageComposer";
import { useAuth } from "../hooks/useAuth";
import { useLiveRoom } from "../hooks/useLiveRoom";
import { useVisualViewport } from "../hooks/useVisualViewport";

const SCROLL_KEY = "bitglow_live_msg_scroll";

export default function LiveChatPage() {
  const { token, user } = useAuth();

  const {
    messages,
    roomUsers,
    roomOnline,
    typingUsers,
    status,
    activeRoom,
    isResolvingRoom,
    hasJoinedChat,
    handleSend,
    handleTyping,
    handleLeave,
    handleEnterChat,
    activeRoomId,
  } = useLiveRoom(token);

  const [showNewMsgButton, setShowNewMsgButton] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const restoredRoomRef = useRef<string | null>(null);
  const viewport = useVisualViewport();

  useEffect(() => {
    document.title = "BitGlow";
  }, []);

  // Restore the room position once, otherwise start at the latest message.
  useEffect(() => {
    if (!activeRoomId || !hasJoinedChat || restoredRoomRef.current === activeRoomId) return;
    restoredRoomRef.current = activeRoomId;
    previousMessageCountRef.current = messages.length;
    requestAnimationFrame(() => {
      const el = messagesScrollRef.current;
      if (!el) return;
      const saved = sessionStorage.getItem(`${SCROLL_KEY}_${activeRoomId}`);
      const savedPosition = saved === null ? Number.NaN : Number(saved);
      el.scrollTop = Number.isFinite(savedPosition) ? savedPosition : el.scrollHeight;
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
      setShowNewMsgButton(false);
    });
  }, [hasJoinedChat, activeRoomId, messages.length]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    isAtBottomRef.current = true;
    setShowNewMsgButton(false);
  };

  const measureIsAtBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  };

  const onScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    
    if (activeRoomId) {
        sessionStorage.setItem(`${SCROLL_KEY}_${activeRoomId}`, el.scrollTop.toString());
    }

    const isAtBottom = measureIsAtBottom();
    isAtBottomRef.current = isAtBottom;
    if (isAtBottom) setShowNewMsgButton(false);
  };

  // Keep scroll at bottom on container resize (e.g. keyboard viewport adjustments)
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || messages.length === 0) return;

    const previousCount = previousMessageCountRef.current;
    const hasNewMessage = messages.length > previousCount;
    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage) return;

    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      });
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

  const roomTitle = useMemo(() => {
    return `${user?.displayName || user?.username || 'BitGlow'}'s Room`;
  }, [user?.displayName, user?.username]);

  const canSend = status === "connected" && !!activeRoom?.id && hasJoinedChat && !isResolvingRoom;

  return (
    <div
      className={clsx(
        "bg-black text-white selection:bg-brand/30",
        hasJoinedChat ? "fixed left-0 right-0 top-0 flex flex-col overflow-hidden" : "flex min-h-svh flex-col"
      )}
      style={hasJoinedChat ? { height: `${viewport.height}px` } : undefined}
    >
      {!hasJoinedChat ? (
        // Welcome Screen
        <>
          <Header hideActions={true} hideBottomNav={false} />
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-6 pb-[80px] w-full max-w-5xl mx-auto px-4 md:px-6">
            <div className="max-w-sm w-full flex flex-col items-center justify-center text-center">
              <img src={LiveChatIcon} alt="Live Chat" className="live-icon-xl mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-1.5 tracking-tight text-white">{roomTitle}</h1>
              <p className="text-zinc-600 mb-8 text-[13px] font-medium tracking-wide">
                Real-time conversations
              </p>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase">
                  {roomOnline} Online
                </span>
              </div>
              <button
                onClick={handleEnterChat}
                disabled={!activeRoom || status !== "connected"}
                className="w-full h-12 rounded-full bg-white text-black font-bold text-[13px] uppercase tracking-widest hover:bg-zinc-200 transition-all duration-200 active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Enter
              </button>
            </div>
          </div>
        </>
      ) : (
        // Live Chat Screen
        <>
          <Header
            hideBottomNav={true}
            leftContent={
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-white tracking-tight">Live</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            }
            rightContent={
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{roomOnline} online</span>
                </div>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="h-7 px-3.5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-[10px] font-bold tracking-widest transition-all text-white uppercase"
                >
                  Leave
                </button>
              </div>
            }
          />

          <main className="flex min-h-0 flex-1 flex-col w-full max-w-5xl mx-auto px-0 md:px-0">
            <div
              ref={messagesScrollRef}
              onScroll={onScroll}
              className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-black touch-pan-y [overflow-anchor:none] [-webkit-overflow-scrolling:touch]"
            >
              <div
                className="mx-auto flex flex-col justify-end min-h-full w-full max-w-[760px] px-3 pb-2 pt-3 sm:px-5 md:pb-3 md:pt-4"
              >
                {isResolvingRoom && !activeRoom ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mb-3" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">Connecting...</span>
                  </div>
                ) : activeRoom ? (
                  messages.length === 0 ? (
                    <div className="pointer-events-none flex flex-1 items-center justify-center px-6 py-10">
                      <div className="flex max-w-[240px] flex-col items-center text-center">
                        <p className="text-[13px] font-medium text-zinc-600">No messages yet</p>
                        <p className="mt-1 text-[11px] font-normal leading-5 text-zinc-700">
                          Say something to start the conversation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex flex-col justify-end min-h-full w-full">
                      <LiveMessageList messages={messages} selfId={user?.id || null} participants={roomUsers} isLiveChat={true} />
                      {typingLabel && (
                        <div className="animate-in fade-in slide-in-from-bottom-1 ml-1 mt-2 text-[11px] font-medium text-zinc-600 duration-300">
                          {typingLabel}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <p className="text-[10px] uppercase font-semibold tracking-widest text-zinc-600">Connection Interrupted</p>
                  </div>
                )}
              </div>
            </div>

            {showNewMsgButton && (
              <button
                onClick={() => scrollToBottom()}
                className="mx-auto mb-2 flex shrink-0 items-center gap-2 rounded-full border border-white/[0.06] bg-zinc-950 px-4 py-2 text-[11px] font-semibold text-white shadow-lg transition-all hover:bg-zinc-900 active:scale-95"
              >
                <span>New messages</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </button>
            )}

            <div
              className="shrink-0 border-t border-white/[0.04] bg-black px-3 py-2 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-4"
            >
              <div className="mx-auto max-w-[760px]">
                <MessageComposer
                  onSend={handleSend}
                  onChange={handleTyping}
                  disabled={!canSend}
                  variant="live"
                />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
