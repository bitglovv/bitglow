import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  isOnline: boolean;
  isLoadingMessages?: boolean;
}

export const ChatWindow = ({
  conversation,
  messages,
  currentUserId,
  isTyping,
  onBack,
  onSendMessage,
  onTyping,
  isOnline,
  isLoadingMessages = false,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-black animate-chat-pane-in">
      <ChatHeader conversation={conversation} isOnline={isOnline} onBack={onBack} />

      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth bg-black"
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
                ts: new Date(m.createdAt).getTime(),
                avatarUrl:
                  m.senderId === currentUserId ? user?.avatarUrl : conversation.avatarUrl,
                type: "chat" as const,
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

      <div className="shrink-0 bg-black px-3 py-2 md:px-4 md:py-2.5">
        <MessageInput compact onSendMessage={onSendMessage} onTyping={onTyping} />
      </div>
    </div>
  );
};
