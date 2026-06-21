import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import LiveChatIcon from "../assets/icons/live-chat.svg";
import Header from "../components/common/Header";
import LiveMessageList from "../components/chat/LiveMessageList";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../hooks/useAuth";
import { useLiveRoom } from "../hooks/useLiveRoom";
import { useNavigate } from "react-router-dom";
import { useVisualViewportBottomInset } from "../hooks/useVisualViewportBottomInset";

const SCROLL_KEY = "bitglow_live_msg_scroll";

export default function LiveChatPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const {
    messages,
    roomUsers,
    roomOnline,
    typingUsers,
    status,
    activeRoom,
    roomError,
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
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(88);
  const keyboardInset = useVisualViewportBottomInset();

  useEffect(() => {
    document.title = "BitGlow";
  }, []);

  // Restore scroll on mount
  useEffect(() => {
    if (activeRoomId && hasJoinedChat) {
      const savedScroll = sessionStorage.getItem(`${SCROLL_KEY}_${activeRoomId}`);
      if (savedScroll && messagesScrollRef.current) {
        setTimeout(() => {
          if (messagesScrollRef.current) {
            messagesScrollRef.current.scrollTop = parseInt(savedScroll);
          }
        }, 100);
      }
    }
  }, [hasJoinedChat, activeRoomId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowNewMsgButton(false);
  };

  const onScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    
    if (activeRoomId) {
        sessionStorage.setItem(`${SCROLL_KEY}_${activeRoomId}`, el.scrollTop.toString());
    }

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isAtBottom) setShowNewMsgButton(false);
  };

  useEffect(() => {
    if (hasJoinedChat && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [hasJoinedChat]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || messages.length === 0) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } else {
      setShowNewMsgButton(true);
    }
  }, [messages]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;

    const update = () => {
      setComposerHeight(Math.ceil(el.getBoundingClientRect().height));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [hasJoinedChat]);

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
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white selection:bg-brand/30">
      {!hasJoinedChat ? (
        // Welcome Screen
        <>
          <Header hideActions={true} hideBottomNav={false} />
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-6 pb-[80px]">
            <div className="max-w-sm w-full flex flex-col items-center justify-center text-center">
              <img src={LiveChatIcon} alt="Live Chat" className="live-icon-xl mx-auto mb-6" />
              <h1 className="text-3xl font-black mb-2 tracking-tight text-white">{roomTitle}</h1>
              <p className="text-zinc-500 mb-8 text-[13px] font-medium tracking-wide">
                Your live space for real-time conversations
              </p>
              <div className="flex items-center justify-center gap-2 mb-8 bg-zinc-900/50 border border-white/5 py-1.5 px-4 rounded-full shadow-inner">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black text-white tracking-[0.1em] uppercase">
                  {roomOnline} Online
                </span>
              </div>
              <button
                onClick={handleEnterChat}
                disabled={!activeRoom || status !== "connected"}
                className="w-full h-14 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-black text-[14px] uppercase tracking-widest hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300 active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                Enter Live Chat
              </button>
            </div>
          </div>
        </>
      ) : (
        // Live Chat Screen
        <>
          <Header
            hideBottomNav={true}
            rightContent={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase leading-none">{roomOnline}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
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
            }
          />

          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              ref={messagesScrollRef}
              onScroll={onScroll}
              className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y"
            >
              <div
                className="mx-auto flex min-h-full w-full max-w-[700px] flex-col px-4 pt-2"
                style={{ paddingBottom: composerHeight + keyboardInset + 24 }}
              >
                <div className="mt-auto pointer-events-none" />
                {isResolvingRoom && !activeRoom ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Connecting...</span>
                  </div>
                ) : activeRoom ? (
                  messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-end h-full mb-70 opacity-60 pointer-events-none">
                      <p className="text-[11px] font-black tracking-[0.2em] opacity-50 text-center">Chat will appear here when friends start chatting</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <LiveMessageList messages={messages} selfId={user?.id || null} participants={roomUsers} />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <p className="text-[10px] uppercase font-bold tracking-widest">Connection Interrupted</p>
                  </div>
                )}
              </div>
            </div>

            {showNewMsgButton && (
              <button
                onClick={() => scrollToBottom()}
                className="absolute left-1/2 z-30 flex -translate-x-1/2 animate-bounce items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2 text-[11px] font-bold text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                style={{ bottom: composerHeight + keyboardInset + 16 }}
              >
                <span>New messages</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </button>
            )}

            <div
              ref={composerRef}
              className="z-[120] border-t border-white/[0.03] bg-black px-2 py-1 will-change-transform"
              style={{
                paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
                transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
              }}
            >
              <div className="max-w-[700px] mx-auto">
                <div className="h-1 mb-1 overflow-hidden">
                  {typingLabel && (
                    <div className="text-[11px] text-zinc-500 font-bold animate-in fade-in slide-in-from-bottom-1 duration-300 ml-1">
                      {typingLabel}
                    </div>
                  )}
                </div>
                <MessageInput onSend={handleSend} onChange={handleTyping} disabled={!canSend} />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
