import clsx from "clsx";
import { Avatar } from "../ui/Avatar";

interface DMBubbleProps {
  message: { id: string; text: string; createdAt: string; senderId: string };
  isMe: boolean;
}

interface LiveBubbleProps {
  text: string;
  username: string;
  isSelf: boolean;
  avatarUrl?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

type MessageBubbleProps = DMBubbleProps | LiveBubbleProps;

export function MessageBubble(props: MessageBubbleProps) {
  if ("message" in props) {
    const { message, isMe } = props;

    return (
      <div
        className={clsx(
          "flex w-full animate-message-in px-3",
          isMe ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={clsx(
            "max-w-[82%] rounded-[20px] px-3.5 py-2 text-[14px] leading-[1.42] shadow-sm transition-all duration-200 md:max-w-[58%] xl:max-w-[52%]",
            isMe
              ? "rounded-tr-md bg-brand text-black shadow-[0_8px_24px_rgba(16,185,129,0.16)]"
              : "rounded-tl-md border border-white/[0.06] bg-white/[0.075] text-white"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    );
  }

  const { text, username, isSelf, avatarUrl, isFirstInGroup, isLastInGroup } = props;

  return (
    <div
      className={clsx(
          "group flex w-full px-1 transition-all duration-200 ease-out sm:px-2 md:px-3",
        isSelf ? "justify-end" : "justify-start",
          isFirstInGroup ? "mt-1.5" : "mt-px",
          isLastInGroup ? "mb-0.5" : "mb-0"
      )}
    >
      {!isSelf && isFirstInGroup ? (
        <div className="mr-2 shrink-0 pt-0.5">
          <Avatar src={avatarUrl} alt={username} size="xs" />
        </div>
      ) : !isSelf ? (
        <div className="mr-2 w-7 shrink-0" />
      ) : null}

      <div className={clsx("flex max-w-[84%] flex-col md:max-w-[62%] xl:max-w-[56%] 2xl:max-w-[50%]", isSelf ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "px-3 py-1.5 text-[13.5px] leading-[1.36] shadow-sm transition-all duration-200 ease-out will-change-transform hover:-translate-y-px hover:brightness-110",
            isSelf
              ? "bg-brand text-black shadow-[0_10px_28px_rgba(16,185,129,0.13)]"
              : "border border-white/[0.055] bg-zinc-900/95 text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
            isSelf && isFirstInGroup && "rounded-tl-[20px] rounded-bl-[20px] rounded-br-[20px] rounded-tr-md",
            isSelf && !isFirstInGroup && !isLastInGroup && "rounded-l-[20px] rounded-r-md",
            isSelf && isLastInGroup && "rounded-tl-[20px] rounded-bl-[20px] rounded-br-md rounded-tr-md",
            !isSelf && isFirstInGroup && "rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] rounded-tl-md",
            !isSelf && !isFirstInGroup && !isLastInGroup && "rounded-r-[20px] rounded-l-md",
            !isSelf && isLastInGroup && "rounded-tr-[20px] rounded-br-md rounded-bl-[20px] rounded-tl-md"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>

      </div>
    </div>
  );
}

export default MessageBubble;
