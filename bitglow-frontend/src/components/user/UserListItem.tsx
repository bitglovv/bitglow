import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { BadgeCheck, Lock } from "lucide-react";

interface UserListItemUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
}

interface UserListItemProps {
  user: UserListItemUser;
  actionSlot?: React.ReactNode;
  /** If provided, the left section (avatar + name) becomes a link to this href. */
  href?: string;
  /** If provided, the entire row fires this onClick (but avatar/name link still works if href is set). */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export const UserListItem = ({ user, actionSlot, href, onClick, className = "" }: UserListItemProps) => {
  const displayName = user.displayName || user.username;
  // When no explicit href is given, automatically link to the user's profile
  const profileHref = href ?? `/profile/${user.username}`;
  const interactive = Boolean(href || onClick);

  const rowClasses = [
    "group flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/[0.04] bg-white/[0.02] px-3 py-3 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.03]",
    interactive ? "hover:cursor-pointer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const leftContent = (
    <>
      <Avatar src={user.avatarUrl} alt={user.username} size="md" />
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1">
          <span className="truncate text-[15px] font-semibold leading-tight text-white">
            @{user.username}
          </span>
          {user.isVerified && (
            <BadgeCheck className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
          )}
          {user.isPrivate && (
            <Lock className="w-3 h-3 text-zinc-500 shrink-0" strokeWidth={2.5} />
          )}
        </div>
        {displayName !== user.username && (
          <span className="truncate text-xs text-zinc-500">{displayName}</span>
        )}
      </div>
    </>
  );

  // Left section — always links to profile (stops click propagation so row onClick doesn't double-fire)
  const mainContent = (
    <Link
      to={profileHref}
      onClick={(event) => event.stopPropagation()}
      className="flex min-w-0 items-center gap-3 overflow-hidden group/link"
    >
      {leftContent}
    </Link>
  );

  return (
    <div className={rowClasses} onClick={onClick}>
      {mainContent}
      {actionSlot && <div className="ml-3 shrink-0">{actionSlot}</div>}
    </div>
  );
};