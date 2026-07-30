import { useRef } from "react";
import MessageBubble from "./MessageBubble";

type ChatMessage = {
  id: number | string;
  userId?: string;
  username?: string;
  text: string;
  ts: number;
  avatarUrl?: string;
  type?: "chat" | "system" | "post" | "profile";
  postId?: string;
  profileId?: string;
  editedAt?: string | null;
  isForwarded?: boolean;
  canEdit?: boolean;
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
  isLiveChat?: boolean;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCopyMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string) => void;
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
  }).toLowerCase();
}

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatMonthName(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const time = formatTime12h(date);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const isWithinWeek = now.getTime() - date.getTime() < oneWeekMs;

  if (isWithinWeek) {
    return `${formatWeekday(date)} ${time}`;
  }

  const monthDay = `${formatMonthName(date)} ${date.getDate()}`;

  if (date.getFullYear() !== now.getFullYear()) {
    return `${monthDay}, ${date.getFullYear()} ${time}`;
  }

  return `${monthDay} ${time}`;
}

export default function LiveMessageList({ messages, selfId, participants = [], isLiveChat = false, onEditMessage, onDeleteMessage, onCopyMessage, onForwardMessage }: Props) {
  const userMap = useRef<Record<string, RoomUser>>({});

  participants.forEach((p) => {
    userMap.current[p.id] = p;
  });

  return (
    <div className="flex flex-col justify-end min-h-full gap-px animate-chat-fade">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const currDate = new Date(m.ts);
        const prevDate = prev ? new Date(prev.ts) : null;
        const showDateSep = !isLiveChat && (!prevDate || !isSameDay(prevDate, currDate));
        const isSystem = m.type === "system";
        const isFirst =
          !prev || prev.type === "system" || prev.userId !== m.userId || showDateSep;
        const isLast =
          !next ||
          next.type === "system" ||
          next.userId !== m.userId ||
          (next ? (!isLiveChat && !isSameDay(currDate, new Date(next.ts))) : true);
        const latestInfo = m.userId ? userMap.current[m.userId] : null;
        const activeUn = latestInfo?.username || m.username || "User";
        const activeAv = latestInfo?.avatarUrl || m.avatarUrl;
        const timeLabel = isLast ? formatTime12h(currDate) : undefined;

        return (
          <div
            key={m.id}
            className="animate-message-in"
            style={{ animationDelay: `${Math.min(i, 8) * 18}ms` }}
          >
            {!isLiveChat && showDateSep && (
              <div className="flex items-center justify-center py-3 md:py-3.5">
                <span className="rounded-full border border-white/[0.06] bg-white/[0.035] px-3 py-1 text-[11px] font-semibold tracking-wide text-zinc-500">
                  {formatDateSeparator(currDate)}
                </span>
              </div>
            )}

            {isSystem ? (
              <div className="flex justify-center py-2 animate-chat-fade">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600/80">
                  {m.text}
                </span>
              </div>
            ) : (
              <div className={isFirst ? "mt-1.5" : "mt-0.5"}>
                <MessageBubble
                  text={m.text}
                  username={isLiveChat ? activeUn : "User"}
                  isSelf={!!m.userId && m.userId === selfId}
                  avatarUrl={activeAv}
                  isFirstInGroup={isFirst}
                  isLastInGroup={isLast}
                  type={m.type}
                  postId={m.postId}
                  profileId={m.profileId}
                  timeLabel={timeLabel}
                  editedAt={m.editedAt}
                  isForwarded={m.isForwarded}
                  onEdit={!isLiveChat && m.userId === selfId && m.type === "chat" && m.canEdit && onEditMessage ? () => onEditMessage(String(m.id)) : undefined}
                  onDelete={!isLiveChat && m.userId === selfId && onDeleteMessage ? () => onDeleteMessage(String(m.id)) : undefined}
                  onCopy={!isLiveChat && onCopyMessage ? () => onCopyMessage(String(m.id)) : undefined}
                  onForward={!isLiveChat && onForwardMessage ? () => onForwardMessage(String(m.id)) : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
