import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Conversation } from "../../services/api";
import { Avatar } from "../ui/Avatar";
import MoreMenu from "../common/MoreMenu";

type Props = {
  conversation: Conversation;
  isOnline: boolean;
  onBack: () => void;
  /** When false, back is hidden (e.g. split inbox + chat on wide screens). */
  showBackButton?: boolean;
  onViewProfile?: () => void;
  onMuteUser?: () => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
};

export const ChatHeader = ({ conversation, isOnline, onBack, showBackButton = true, onViewProfile, onMuteUser, onBlockUser, onReportUser }: Props) => {
  return (
    <div className="relative z-20 shrink-0 bg-black px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-4 md:pt-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to inbox"
          className={[
            "-ml-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2 text-white transition-all duration-300 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-white/20 active:scale-95 touch-manipulation",
            showBackButton ? "" : "hidden",
          ].join(" ")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Link to={`/profile/${conversation.username}`} className="relative shrink-0 transition-transform hover:scale-105">
          <Avatar src={conversation.avatarUrl} alt={conversation.username} size="sm" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]" />
          )}
        </Link>

        <Link to={`/profile/${conversation.username}`} className="flex min-w-0 flex-1 flex-col hover:opacity-80 transition-opacity">
          <span className="truncate text-[15px] font-bold text-white">
            {conversation.displayName || conversation.username}
          </span>
          <span className="truncate text-[11px] font-medium text-zinc-500">
            @{conversation.username}
          </span>
        </Link>

        <MoreMenu
          items={[
            { label: "View Profile", onClick: onViewProfile || (() => {}) },
            { label: "Mute User", onClick: onMuteUser || (() => {}) },
            { label: "Block User", onClick: onBlockUser || (() => {}), danger: true },
            { label: "Report User", onClick: onReportUser || (() => {}) },
          ]}
        />
      </div>
    </div>
  );
};
