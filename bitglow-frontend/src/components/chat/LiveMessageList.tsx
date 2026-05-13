import { useRef } from "react";
import MessageBubble from "./MessageBubble";

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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime12h(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Month like "May", day, optional year — 12h time (e.g. "May 8 · 3:45 PM"). */
function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = formatTime12h(date);

  if (msgDay.getTime() === today.getTime()) {
    return `Today · ${time}`;
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return `Yesterday · ${time}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${monthDay} · ${time}`;
  }

  const monthDayYear = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${monthDayYear} · ${time}`;
}

export default function LiveMessageList({ messages, selfId, participants = [] }: Props) {
  const userMap = useRef<Record<string, RoomUser>>({});

  participants.forEach((p) => {
    userMap.current[p.id] = p;
  });

  return (
    <div className="flex flex-col gap-px animate-chat-fade">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const currDate = new Date(m.ts);
        const prevDate = prev ? new Date(prev.ts) : null;
        const showDateSep = !prevDate || !isSameDay(prevDate, currDate);
        const isSystem = m.type === "system";
        const isFirst =
          !prev || prev.type === "system" || prev.userId !== m.userId || showDateSep;
        const isLast =
          !next ||
          next.type === "system" ||
          next.userId !== m.userId ||
          (next ? !isSameDay(currDate, new Date(next.ts)) : true);
        const latestInfo = m.userId ? userMap.current[m.userId] : null;
        const activeUn = latestInfo?.username || m.username || "User";
        const activeAv = latestInfo?.avatarUrl || m.avatarUrl;

        return (
          <div
            key={m.id}
            className="animate-message-in"
            style={{ animationDelay: `${Math.min(i, 8) * 18}ms` }}
          >
            {showDateSep && (
              <div className="flex items-center justify-center py-2.5 md:py-2">
                <span className="text-[11px] font-medium tracking-wide text-zinc-500">
                  {formatDateSeparator(currDate)}
                </span>
              </div>
            )}

            {isSystem ? (
              <div className="flex justify-center py-1.5 animate-chat-fade">
                <span className="rounded-full border border-white/5 bg-zinc-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {m.text}
                </span>
              </div>
            ) : (
              <div className={isFirst ? "mt-0.5" : "mt-0"}>
                <MessageBubble
                  text={m.text}
                  username={activeUn}
                  isSelf={!!m.userId && m.userId === selfId}
                  avatarUrl={activeAv}
                  isFirstInGroup={isFirst}
                  isLastInGroup={isLast}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
