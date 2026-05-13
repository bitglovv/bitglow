import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";

interface MessageInputProps {
  onSendMessage?: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  onSend?: (text: string) => void;
  onChange?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

function textareaMaxHeightPx() {
  if (typeof window === "undefined") return 200;
  return Math.min(Math.round(window.innerHeight * 0.36), 220);
}

export const MessageInput = ({
  onSendMessage,
  onTyping,
  placeholder = "Message...",
  onSend,
  onChange,
  disabled,
  compact = false,
}: MessageInputProps) => {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const maxH = textareaMaxHeightPx();
    ta.style.height = "0px";
    const next = Math.min(Math.max(ta.scrollHeight, 44), maxH);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [text]);

  useEffect(() => {
    const onResize = () => {
      if (textareaRef.current) syncTextareaHeight();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleSendAction = () => {
    if (!text.trim()) return;

    const finalMsg = text.trim();
    const textarea = textareaRef.current;

    if (onSendMessage) onSendMessage(finalMsg);
    if (onSend) onSend(finalMsg);

    setText("");
    if (textarea) {
      textarea.style.height = "44px";
      textarea.style.overflowY = "hidden";
      textarea.scrollTop = 0;
    }

    if (onTyping) onTyping(false);

    requestAnimationFrame(() => {
      syncTextareaHeight();
      textareaRef.current?.focus({ preventScroll: true });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAction();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    if (onChange) onChange(value);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  return (
    <div
      className={clsx(
        "flex w-full max-w-full items-end gap-2 bg-black transition-colors duration-200 ease-out",
        compact ? "p-0 py-0" : "p-3 bg-black"
      )}
    >
      <div className="relative min-h-11 min-w-0 flex-1 rounded-[22px]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={clsx(
            "box-border min-h-[44px] w-full max-w-full resize-none rounded-[22px] border-0 bg-white/[0.055] px-4 py-2.5 text-[16px] leading-[1.4] text-white placeholder:text-zinc-500 outline-none ring-0 transition-[background-color] duration-200 ease-out hover:bg-white/[0.07] focus:bg-white/[0.08] focus:ring-0 md:text-[15px]",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.preventDefault()}
        onClick={handleSendAction}
        disabled={!text.trim() || disabled}
        aria-label="Send message"
        className="mb-0.5 flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-full bg-brand text-black transition-all duration-200 ease-out hover:bg-brand-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 active:scale-95 disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-60"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};

export default MessageInput;
