import { ArrowLeft } from "lucide-react";
import { Conversation } from "../../services/api";
import { Avatar } from "../ui/Avatar";

type Props = {
  conversation: Conversation;
  isOnline: boolean;
  onBack: () => void;
};

export const ChatHeader = ({ conversation, isOnline, onBack }: Props) => {
  return (
    <div className="shrink-0 bg-black px-3 py-2.5 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to inbox"
          className="-ml-1 rounded-full p-2 text-white transition-all duration-300 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-white/20 active:scale-95 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative shrink-0">
          <Avatar src={conversation.avatarUrl} alt={conversation.username} size="sm" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]" />
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold text-white">
            {conversation.displayName || conversation.username}
          </span>
          <span className="truncate text-[11px] font-medium text-zinc-500">
            @{conversation.username}
          </span>
        </div>
      </div>
    </div>
  );
};
