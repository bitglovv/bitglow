import React, { KeyboardEvent, useState, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import clsx from "clsx";

type Props = {
    onSend: (text: string) => void;
    onChange?: () => void;
    disabled?: boolean;
};

export default function MessageInput({ onSend, onChange, disabled }: Props) {
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setText("");
        // Instantly re-focus to prevent keyboard dismissal flicker
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
        if (onChange) onChange();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 bg-[#111] rounded-full px-2 py-1.5 border border-white/5 transition-all focus-within:ring-1 focus-within:ring-white/10 group"
        >
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                autoFocus
                disabled={disabled}
                className="flex-1 bg-transparent text-[15px] text-white outline-none px-3 py-1 disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={disabled || !text.trim()}
                className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full text-white transition-all active:scale-90",
                    "bg-gradient-to-r from-emerald-500 to-blue-600",
                    "disabled:grayscale disabled:opacity-30 ripple"
                )}
            >
                <SendHorizontal className="h-4.5 w-4.5" />
            </button>
        </form>
    );
}
