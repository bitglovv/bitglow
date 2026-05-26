import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useVisualViewportBottomInset } from "../../hooks/useVisualViewportBottomInset";
import { Conversation, DMMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../ui/Avatar";
import { ChatHeader } from "./ChatHeader";
import LiveMessageList from "./LiveMessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: DMMessage[];
  currentUserId: string;
  isTyping: boolean;
  onBack: () => void;
  /** Hide header back on wide split layouts (inbox + chat visible). */
  showHeaderBack?: boolean;
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  isOnline: boolean;
  isLoadingMessages?: boolean;
  isRequest?: boolean;
  onAcceptRequest?: () => void;
  onRejectRequest?: () => void;
}

export const ChatWindow = ({
  conversation,
  messages,
  currentUserId,
  isTyping,
  onBack,
  showHeaderBack = true,
  onSendMessage,
  onTyping,
  isOnline,
  isLoadingMessages = false,
  isRequest = false,
  onAcceptRequest,
  onRejectRequest,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useVisualViewportBottomInset();
  const [isNarrow, setIsNarrow] = useState(false);
  const [composerPad, setComposerPad] = useState(68);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = footerRef.current;
    if (!el || !isNarrow) return;
    const ro = new ResizeObserver(() => {
      setComposerPad(Math.ceil(el.getBoundingClientRect().height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isNarrow, conversation?.userId]);
  const hasDenseTimeline = messages.length >= 10;
  const isSparseTimeline = messages.length > 0 && messages.length <= 3;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const id = requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: messages.length > 1 || isTyping ? "smooth" : "auto",
      });
    });

    return () => cancelAnimationFrame(id);
  }, [messages.length, isTyping]);

  if (!conversation) return null;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-black animate-chat-pane-in">
      <ChatHeader
        conversation={conversation}
        isOnline={isOnline}
        onBack={onBack}
        showBackButton={showHeaderBack}
      />

      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth bg-black"
        style={{ paddingBottom: isNarrow ? composerPad : undefined }}
      >
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 animate-chat-fade">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center animate-chat-fade">
            <div className="relative mb-5">
              <Avatar
                src={conversation.avatarUrl}
                alt={conversation.username}
                size="xl"
                className="relative ring-1 ring-white/10"
              />
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              {conversation.displayName || conversation.username}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">@{conversation.username}</p>
            <p className="mt-3 max-w-[280px] text-sm leading-6 text-zinc-500">
              Send the first message and start the thread.
            </p>
            <Link
              to={`/profile/${conversation.username}`}
              className="mt-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-white/[0.1] focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              View Profile
            </Link>
          </div>
        ) : (
          <div
            className="flex min-h-full flex-col justify-end px-1.5 pb-1 sm:px-2.5 md:px-3 md:pb-1.5"
            style={{
              paddingTop: isSparseTimeline
                ? "clamp(28px, 13vh, 120px)"
                : hasDenseTimeline
                  ? "clamp(8px, 2vh, 18px)"
                  : "clamp(18px, 6vh, 64px)",
            }}
          >
            <LiveMessageList
              messages={messages.map((m) => ({
                id: m.id,
                userId: m.senderId,
                username:
                  m.senderId === currentUserId
                    ? user?.username || "You"
                    : conversation.username || "User",
                text: m.text,
                type: m.type as any || "chat",
                postId: m.postId,
                profileId: m.profileId,
                ts: new Date(m.createdAt).getTime(),
                avatarUrl:
                  m.senderId === currentUserId ? user?.avatarUrl : conversation.avatarUrl,
              }))}
              selfId={currentUserId || null}
            />
            {isTyping && (
              <div className="pl-11 pt-0.5 pb-1 md:pl-13 animate-typing-in">
                <TypingIndicator />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={footerRef}
        className={clsx(
          "shrink-0 bg-black px-3 pt-1.5 pb-2",
          isNarrow ? "fixed left-0 right-0 z-50" : "md:px-4 md:py-2.5 md:pb-[max(10px,env(safe-area-inset-bottom))]"
        )}
        style={isNarrow ? { bottom: keyboardInset } : undefined}
      >
        {isRequest ? (
          <div className="flex flex-col gap-2 p-2 pt-0 md:flex-row md:items-center">
            <p className="text-xs text-zinc-500 mb-1 md:mb-0 md:mr-auto">
              Accept message request from {conversation.username}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRejectRequest || onBack}
                className="flex-1 rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1] md:flex-none"
              >
                Reject
              </button>
              <button
                onClick={onAcceptRequest}
                className="flex-1 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand/90 md:flex-none"
              >
                Accept
              </button>
            </div>
          </div>
        ) : (
          <MessageInput compact onSendMessage={onSendMessage} onTyping={onTyping} />
        )}
      </div>
    </div>
  );
};
