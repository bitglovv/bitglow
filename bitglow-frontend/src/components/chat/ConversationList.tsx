import { Conversation } from '../../services/api';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (userId: string) => void;
  onlineUsers: Set<string>;
}

export const ConversationList = ({ conversations, activeId, onSelect, onlineUsers }: ConversationListProps) => {
  return (
    <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-2">
      {conversations.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-chat-fade">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.035] shadow-[0_0_44px_rgba(16,185,129,0.12)]">
            <div className="absolute inset-[-10px] rounded-full bg-brand/10 blur-2xl animate-pulse-slow" />
            <div className="relative h-2 w-2 rounded-full bg-brand shadow-[0_0_18px_rgba(16,185,129,0.75)]" />
          </div>
          <p className="text-sm font-semibold text-zinc-400">No conversations yet</p>
          <p className="mt-1 max-w-[220px] text-xs leading-5 text-zinc-600">
            Search for a friend and start your first private message.
          </p>
        </div>
      ) : (
        conversations.map((conv) => (
          <ConversationItem
            key={conv.userId}
            conversation={conv}
            isActive={activeId === conv.userId}
            isOnline={onlineUsers.has(conv.userId)}
            onSelect={onSelect}
          />
        ))
      )}
      </div>
  );
};
