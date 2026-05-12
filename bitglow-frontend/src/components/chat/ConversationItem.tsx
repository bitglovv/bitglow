import clsx from "clsx";
import { Conversation } from "../../services/api";
import { Avatar } from "../ui/Avatar";

type Props = {
  conversation: Conversation;
  isActive: boolean;
  isOnline: boolean;
  onSelect: (userId: string) => void;
};

export const ConversationItem = ({ conversation, onSelect }: Props) => {
  const isUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <button
      onClick={() => onSelect(conversation.userId)}
      className={clsx(
        "group relative w-full overflow-hidden rounded-[16px] border border-transparent py-2 pl-2.5 pr-8 text-left transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-white/15",
        isUnread ? "bg-white/[0.045]" : "bg-transparent"
      )}
    >
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar src={conversation.avatarUrl} alt={conversation.username} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={clsx(
                "truncate text-[14px] leading-5 transition-colors duration-300",
                isUnread ? "font-black text-white" : "font-bold text-zinc-100"
              )}
            >
              {conversation.displayName || conversation.username}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <p
              className={clsx(
                "min-w-0 truncate text-[13px] leading-5 transition-colors duration-300",
                isUnread ? "font-bold text-white" : "font-normal text-zinc-500"
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
          className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_14px_rgba(16,185,129,0.9)]"
        />
      )}
    </button>
  );
};
