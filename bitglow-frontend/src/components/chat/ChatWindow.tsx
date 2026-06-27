import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { Conversation, DMMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../ui/Avatar";
import { ChatHeader } from "./ChatHeader";
import LiveMessageList from "./LiveMessageList";
import { MessageComposer } from "./MessageComposer";
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
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
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
  onEditMessage,
  onDeleteMessage,
  isOnline,
  isLoadingMessages = false,
  isRequest = false,
  onAcceptRequest,
  onRejectRequest,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [editingMessage, setEditingMessage] = useState<DMMessage | null>(null);

  const hasDenseTimeline = messages.length >= 10;
  const isSparseTimeline = messages.length > 0 && messages.length <= 3;

  // Track if user scroll is at the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Reset scroll state when conversation changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [conversation?.userId]);

  // Keep scroll at bottom on container resize (e.g. keyboard viewport adjustments)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll to bottom on new messages
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const latestMessage = messages[messages.length - 1];
    const latestIsMine = latestMessage && latestMessage.senderId === currentUserId;

    if (isAtBottomRef.current || latestIsMine) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, currentUserId]);

  // Scroll to bottom on typing state changes
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isAtBottomRef.current && isTyping) {
      el.scrollTop = el.scrollHeight;
    }
  }, [isTyping]);

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
        onScroll={handleScroll}
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain bg-black"
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
                type: m.type === "text" || !m.type ? "chat" : m.type,
                postId: m.postId,
                profileId: m.profileId,
                editedAt: m.editedAt,
                ts: new Date(m.createdAt).getTime(),
                avatarUrl:
                  m.senderId === currentUserId ? user?.avatarUrl : conversation.avatarUrl,
              }))}
              selfId={currentUserId || null}
              onEditMessage={(messageId) => {
                const message = messages.find((item) => item.id === messageId);
                if (message?.senderId === currentUserId && (message.type || "text") === "text") {
                  setEditingMessage(message);
                }
              }}
              onDeleteMessage={async (messageId) => {
                const message = messages.find((item) => item.id === messageId);
                if (message?.senderId !== currentUserId) return;
                if (!window.confirm("Delete this message? This will remove it for both people.")) return;
                if (editingMessage?.id === messageId) setEditingMessage(null);
                await onDeleteMessage(messageId);
              }}
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
        className="shrink-0 bg-black px-3 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] md:px-4 md:py-2.5 md:pb-[max(10px,env(safe-area-inset-bottom))]"
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
          <MessageComposer
            compact
            editValue={editingMessage?.text ?? null}
            onCancelEdit={() => setEditingMessage(null)}
            onSendMessage={async (text) => {
              if (editingMessage) {
                await onEditMessage(editingMessage.id, text);
              } else {
                onSendMessage(text);
              }
            }}
            onTyping={onTyping}
          />
        )}
      </div>
    </div>
  );
};
