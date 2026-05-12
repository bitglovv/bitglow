import { useEffect, useRef } from 'react';
import { DMMessage } from '../../services/api';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: DMMessage[];
  currentUserId: string;
  isTyping?: boolean;
}

export const MessageList = ({ messages, currentUserId, isTyping }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col custom-scrollbar">
      {messages.length === 0 ? (
        <div className="mt-auto mb-auto text-center">
          <p className="text-zinc-600 text-sm">No messages yet. Send a wave! 👋</p>
        </div>
      ) : (
        messages.map((msg, i) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={msg.senderId === currentUserId} 
          />
        ))
      )}
      {isTyping && (
        <div className="mt-2">
          <TypingIndicator />
        </div>
      )}
      <div ref={bottomRef} className="h-4 shrink-0" />
    </div>
  );
};
