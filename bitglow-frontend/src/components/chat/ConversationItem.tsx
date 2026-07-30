import clsx from "clsx";
import { Conversation } from "../../services/api";
import { Avatar } from "../ui/Avatar";

type Props = {
  conversation: Conversation;
  isActive: boolean;
  isOnline: boolean;
  onSelect: (userId: string) => void;
};

export const ConversationItem = ({ conversation, isActive, isOnline: _isOnline, onSelect }: Props) => {
  const isUnread = (conversation.unreadCount ?? 0) > 0;

  const isMasked = (conversation as any).isMasked === true || conversation.displayName === 'BitGlow User';
  const displayName = isMasked ? 'BitGlow User' : (conversation.displayName || conversation.username);
  const avatarSrc = isMasked ? undefined : conversation.avatarUrl;

  return (
    <button
          onClick={() => onSelect(conversation.userId)}
          className={clsx(
        "group relative w-full overflow-hidden rounded-[16px] border border-transparent py-2 pl-2.5 text-left transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-white/15", // compact layout: no action menu reserved on the right (inbox is minimal)
        isActive ? "border-white/[0.08] bg-white/[0.05]" : "bg-transparent"
      )}
    >
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar src={avatarSrc} alt={displayName} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-bold leading-5 text-zinc-100 transition-colors duration-300">
              {displayName}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <p
              className={clsx(
                "min-w-0 truncate text-[13px] leading-5 transition-colors duration-300",
                isUnread ? "font-bold text-zinc-200" : "font-normal text-zinc-500"
              )}
            >
              {conversation.lastMessage || "Start a conversation"}
            </p>
          </div>
        </div>
      </div>

      {isUnread && (
        <span
          aria-label={`${conversation.unreadCount} unread message${conversation.unreadCount === 1 ? "" : "s"}`}
          className="pointer-events-none absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand ring-[1.5px] ring-black shadow-[0_0_6px_rgba(16,185,129,0.45)]"
        />
      )}
    </button>
  );
};
