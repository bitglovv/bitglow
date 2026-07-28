import React, { useState, useEffect } from "react";

interface OtpInputProps {
    value: string;
    onChange: (val: string) => void;
    onResend?: () => void;
    isResending?: boolean;
    disabled?: boolean;
    error?: string;
    emailHint?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
    value,
    onChange,
    onResend,
    isResending = false,
    disabled = false,
    error,
    emailHint,
}) => {
    const [cooldown, setCooldown] = useState<number>(60);
    const [expiry, setExpiry] = useState<number>(600); // 10 minutes (600 seconds)

    useEffect(() => {
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
            setExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleResendClick = () => {
        if (cooldown > 0 || isResending || !onResend) return;
        onResend();
        setCooldown(60);
        setExpiry(600);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="space-y-3">
            {emailHint && (
                <p className="text-xs text-zinc-400 leading-relaxed">
                    Sent to <strong className="text-zinc-200">{emailHint}</strong>.
                </p>
            )}

            <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
                    <span>Verification Code</span>
                    <span className="font-mono text-zinc-500 text-[10px]">
                        {expiry > 0 ? `Expires in ${formatTime(expiry)}` : "Expired"}
                    </span>
                </div>

                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="XXXXXX"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    disabled={disabled}
                    autoFocus
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-center font-mono text-base tracking-[0.35em] text-white placeholder-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition disabled:opacity-50"
                />
            </div>

            {error && (
                <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
                    {error}
                </p>
            )}

            {onResend && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                        type="button"
                        onClick={handleResendClick}
                        disabled={cooldown > 0 || isResending || disabled}
                        className="text-emerald-400 hover:underline disabled:text-zinc-600 disabled:no-underline text-[11px] font-medium transition"
                    >
                        {isResending
                            ? "Sending..."
                            : cooldown > 0
                            ? `Resend code in ${cooldown}s`
                            : "Resend Code"}
                    </button>
                </div>
            )}
        </div>
    );
};
