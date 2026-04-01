import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

// Must match backend MESSAGE_TTL
const MESSAGE_TTL = 5 * 60 * 1_000; // 5 minutes

type ChatMessage = {
    id: number | string;
    userId?: string;
    username?: string;
    text: string;
    ts: number;
    avatarUrl?: string;
    type?: "chat" | "system";
};

type RoomUser = {
    id: string;
    username: string;
    avatarUrl?: string;
};

type Props = {
    messages: ChatMessage[];
    selfId: string | null;
    participants?: RoomUser[];
};

export default function LiveMessageList({ messages, selfId, participants = [] }: Props) {
    // Sync lookup: always use the latest known avatar/username for a user ID
    const userMap = useRef<Record<string, RoomUser>>({});
    
    // Update map with fresh presence data
    participants.forEach(p => {
        userMap.current[p.id] = p;
    });

    return (
        <div className="flex flex-col gap-0.5 mt-2">
            {messages.map((m, i) => {
                const isSystem = m.type === "system";

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center my-4 animate-in fade-in duration-700">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                        {m.text}
                      </span>
                    </div>
                  );
                }

                const prev = messages[i - 1];
                const next = messages[i + 1];

                const isFirst = !prev || prev.type === "system" || prev.userId !== m.userId;
                const isLast = !next || next.type === "system" || next.userId !== m.userId;

                // Pick LATEST known info, falling back to message-time info
                const latestInfo = m.userId ? userMap.current[m.userId] : null;
                const activeUn = latestInfo?.username || m.username || "User";
                const activeAv = latestInfo?.avatarUrl || m.avatarUrl;

                return (
                    <div key={m.id} className={`relative ${isFirst ? 'mt-3' : 'mt-0'}`}>
                        <MessageBubble
                            text={m.text}
                            username={activeUn}
                            isSelf={!!m.userId && m.userId === selfId}
                            avatarUrl={activeAv}
                            timestamp={new Date(m.ts).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                            })}
                            isFirstInGroup={isFirst}
                            isLastInGroup={isLast}
                        />
                    </div>
                );
            })}
        </div>
    );
}
