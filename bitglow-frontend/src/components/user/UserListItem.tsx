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
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export const UserListItem = ({ user, actionSlot, href, onClick, className = "" }: UserListItemProps) => {
  const displayName = user.displayName || user.username;
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
          {user.isPrivate && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-300">
              <Lock className="w-3 h-3" />
              <span className="font-semibold">Private</span>
            </span>
          )}
          {user.isVerified && (
            <BadgeCheck className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
          )}
        </div>
        <span className="truncate text-xs text-zinc-500">{displayName}</span>
      </div>
    </>
  );

  const mainContent = href ? (
    <Link
      to={href}
      onClick={(event) => event.stopPropagation()}
      className="flex min-w-0 items-center gap-3 overflow-hidden"
    >
      {leftContent}
    </Link>
  ) : (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      {leftContent}
    </div>
  );

  return (
    <div className={rowClasses} onClick={onClick}>
      {mainContent}
      {actionSlot && <div className="ml-3 shrink-0">{actionSlot}</div>}
    </div>
  );
};