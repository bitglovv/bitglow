import { Search, SquarePen } from "lucide-react";
import clsx from "clsx";
import { Conversation, Friend } from "../../services/api";
import { ConversationList } from "./ConversationList";
import { ConversationSkeleton } from "../ui/Skeleton";
import { Avatar } from "../ui/Avatar";

type Props = {
  conversations: Conversation[];
  friends: Friend[];
  activeConversationId: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  activeTab: "chats" | "requests";
  onTabChange: (tab: "chats" | "requests") => void;
  onSelectConversation: (userId: string) => void;
  onSelectFriend: (friend: Friend) => void;
  isLoading: boolean;
  onlineUsers: Set<string>;
};

export const InboxSidebar = ({
  conversations,
  friends,
  activeConversationId,
  searchTerm,
  onSearchTermChange,
  activeTab,
  onTabChange,
  onSelectConversation,
  onSelectFriend,
  isLoading,
  onlineUsers,
}: Props) => {
  const q = searchTerm.trim().toLowerCase();
  const filteredFriends = q
    ? friends.filter((f) => {
        const name = (f.displayName || "").toLowerCase();
        return f.username.toLowerCase().includes(q) || name.includes(q);
      })
    : [];
  const conversationsByUserId = new Map(conversations.map((conv) => [conv.userId, conv]));

  return (
    <aside className="flex flex-1 min-h-0 flex-col border-r border-white/[0.06] bg-[#050505]">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Messages</h1>
          <button
            aria-label="New message"
            className="rounded-full p-2 text-zinc-400 transition-all duration-300 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-brand/25 active:scale-95"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search friends"
            className="w-full rounded-full border border-white/[0.07] bg-white/[0.055] py-2.5 pl-9 pr-3 text-[16px] text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-brand/40 focus:bg-white/[0.075] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] md:text-sm"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/[0.035] p-1.5 border border-white/[0.05]">
          <button
            onClick={() => onTabChange("chats")}
            className={clsx(
              "rounded-full py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none flex items-center justify-center whitespace-nowrap",
              activeTab === "chats" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Chats
          </button>
          <button
            onClick={() => onTabChange("requests")}
            className={clsx(
              "rounded-full py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none flex items-center justify-center whitespace-nowrap",
              activeTab === "requests" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Requests
          </button>
        </div>
      </div>

      {q.length > 0 ? (
        <div className="custom-scrollbar flex-1 min-h-0 space-y-1 overflow-y-auto overscroll-contain px-2 py-2">
          {filteredFriends.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500 animate-chat-fade">
              No matching friends
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const existingConversation = conversationsByUserId.get(friend.id);
              const latestMessage = existingConversation?.lastMessage || "Start a conversation";
              const isUnread = (existingConversation?.unreadCount ?? 0) > 0;

              return (
                <button
                  key={friend.id}
                  onClick={() => onSelectFriend(friend)}
                  className={clsx(
                    "relative flex w-full items-center gap-3 rounded-[16px] border border-transparent bg-transparent py-2.5 pl-2.5 pr-7 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-white/15"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar src={friend.avatarUrl} alt={friend.username} size="md" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold text-white">
                      {friend.displayName || friend.username}
                    </p>
                    <p
                      className={clsx(
                        "truncate text-xs leading-5 transition-colors",
                        isUnread ? "font-bold text-zinc-200" : "font-normal text-zinc-500"
                      )}
                    >
                      {latestMessage}
                    </p>
                  </div>
                  {isUnread && (
                    <span
                      aria-label={`${existingConversation?.unreadCount} unread message${existingConversation?.unreadCount === 1 ? "" : "s"}`}
                      className="pointer-events-none absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand ring-[1.5px] ring-[#050505] shadow-[0_0_6px_rgba(16,185,129,0.45)]"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <>
          {activeTab === "chats" ? (
            isLoading ? (
              <div className="flex-1 min-h-0 px-2 py-2 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <ConversationSkeleton key={i} />
                ))}
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
                onlineUsers={onlineUsers}
              />
            )
          ) : (
            <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto p-6 text-center text-zinc-500 animate-chat-fade">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full border border-white/[0.08] bg-white/[0.04] shadow-[0_0_32px_rgba(16,185,129,0.1)]" />
              <p className="font-semibold text-zinc-400">No message requests</p>
              <p className="text-sm mt-1">New requests will appear here when people reach out.</p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};
