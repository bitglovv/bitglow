import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";

export interface MessageComposerProps {
  onSendMessage?: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  onSend?: (text: string) => void;
  onChange?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
  variant?: "default" | "live";
  editValue?: string | null;
  onCancelEdit?: () => void;
}

const MAX_TEXTAREA_HEIGHT = 140; // Max height for 5-6 lines

export const MessageComposer = ({
  onSendMessage,
  onTyping,
  placeholder = "Message...",
  onSend,
  onChange,
  disabled,
  compact = false,
  variant = "default",
  editValue = null,
  onCancelEdit,
}: MessageComposerProps) => {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(Math.max(ta.scrollHeight, 44), MAX_TEXTAREA_HEIGHT);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [text]);

  useEffect(() => {
    const onResize = () => {
      if (textareaRef.current) syncTextareaHeight();
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (editValue === null) return;
    setText(editValue);
    requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
      textareaRef.current?.setSelectionRange(editValue.length, editValue.length);
    });
  }, [editValue]);

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
    if (editValue !== null) onCancelEdit?.();

    requestAnimationFrame(() => {
      syncTextareaHeight();
      textareaRef.current?.focus({ preventScroll: true });
    });
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

  const isLive = variant === "live";

  return (
    <div className="w-full">
      {editValue !== null && (
        <div className="mb-1.5 flex items-center justify-between px-2 text-xs text-zinc-400">
          <span>Editing message</span>
          <button type="button" onClick={() => { setText(""); onCancelEdit?.(); }} className="font-semibold text-brand">
            Cancel
          </button>
        </div>
      )}
    <div
      className={clsx(
        "flex w-full max-w-full items-end transition-colors duration-200 ease-out",
        isLive
          ? "gap-2.5 rounded-[28px] border border-white/[0.05] bg-[#080808] p-2"
          : "gap-2 bg-black",
        !isLive && (compact ? "p-0 py-0" : "p-3 bg-black")
      )}
    >
      <div className="relative min-h-11 min-w-0 flex-1 rounded-[22px]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={clsx(
            "box-border min-h-[44px] w-full max-w-full resize-none rounded-[22px] border-0 px-4 py-2.5 text-[16px] leading-[1.4] text-white placeholder:text-zinc-500 outline-none ring-0 transition-[background-color] duration-200 ease-out focus:ring-0 md:text-[15px]",
            isLive
              ? "bg-white/[0.07] hover:bg-white/[0.085] focus:bg-white/[0.095]"
              : "bg-white/[0.055] hover:bg-white/[0.07] focus:bg-white/[0.08]",
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
        className={clsx(
          "mb-0.5 flex shrink-0 self-end items-center justify-center rounded-full bg-brand text-black transition-all duration-200 ease-out hover:bg-brand-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 active:scale-95 disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-60",
          isLive ? "h-11 w-11" : "h-10 w-10"
        )}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
    </div>
  );
};

export default MessageComposer;
