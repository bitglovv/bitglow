import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { BadgeCheck } from "lucide-react";

interface User {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

interface UserListItemProps {
  user: User;
  actionSlot?: React.ReactNode;
}

export const UserListItem = ({ user, actionSlot }: UserListItemProps) => {
  const displayName = user.displayName || user.username;

  return (
    <div className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors duration-200">
      <Link to={`/profile/${user.username}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        <Avatar src={user.avatarUrl} alt={user.username} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-bold text-white truncate">
              {displayName}
            </span>
            {user.isVerified && (
              <BadgeCheck className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
            )}
          </div>
          <div className="text-sm font-medium text-zinc-400 truncate">
            @{user.username}
          </div>
        </div>
      </Link>
      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </div>
  );
};