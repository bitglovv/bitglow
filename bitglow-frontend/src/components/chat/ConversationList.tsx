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
    <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-2 pb-24 md:pb-2">
      {conversations.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-chat-fade">
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