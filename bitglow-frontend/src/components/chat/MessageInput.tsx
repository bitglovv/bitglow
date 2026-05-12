import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import clsx from 'clsx';

interface MessageInputProps {
  // New DM Props
  onSendMessage?: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  
  // Old Live Chat Props
  onSend?: (text: string) => void;
  onChange?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const MessageInput = ({ 
  onSendMessage, 
  onTyping, 
  placeholder = "Message...",
  onSend,
  onChange,
  disabled,
  compact = false
}: MessageInputProps) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleSendAction = () => {
    if (!text.trim()) return;
    
    const finalMsg = text.trim();
    const textarea = textareaRef.current;
    
    // Call DM send if exists
    if (onSendMessage) onSendMessage(finalMsg);
    
    // Call Live Chat send if exists
    if (onSend) onSend(finalMsg);

    setText('');
    if (textarea) {
      textarea.style.height = '44px';
      textarea.scrollTop = 0;
    }
    
    // Clear typing
    if (onTyping) onTyping(false);
    
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.scrollTop = 0;
      textareaRef.current.focus({ preventScroll: true });
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Call Live Chat change if exists
    if (onChange) onChange(value);

    // DM Typing emit
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  return (
    <div className={clsx(
      "flex min-h-12 items-end gap-2 bg-black transition-all duration-300 ease-out",
      compact
        ? "p-0 bg-transparent border-0"
        : "p-3 bg-black border-0"
    )}>
      <div
        className="relative flex min-h-11 flex-1 items-end rounded-[24px] transition-colors duration-200"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={clsx(
            "box-border w-full resize-none overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.055] px-4 py-[11px] text-[16px] leading-[1.35] text-white placeholder:text-zinc-500 outline-none transition-[height,border-color,background-color] duration-200 ease-out hover:border-white/[0.14] focus:border-white/20 focus:bg-white/[0.07] md:text-[15px]",
            disabled && "opacity-50 cursor-not-allowed"
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
        className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-black transition-all duration-200 ease-out hover:bg-brand-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 active:scale-95 disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-60"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};

export default MessageInput;
