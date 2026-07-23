import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Search, Copy, Check } from "lucide-react";
import { Ticket } from "../../types/support";
import { SUPPORT_CONFIG } from "../../config/supportConfig";

export const SupportLoadingState: React.FC<{ message?: string }> = ({
    message = "Loading Support Content...",
}) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-zinc-400">{message}</p>
    </div>
);

export const SupportEmptyState: React.FC<{
    title?: string;
    description?: string;
    onReset?: () => void;
}> = ({
    title = "No Articles Found",
    description = "We couldn't find anything matching your query. Try different keywords or browse categories.",
    onReset,
}) => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center my-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-500 mb-3">
            <Search className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm leading-relaxed">{description}</p>
        {onReset && (
            <button
                type="button"
                onClick={onReset}
                className="mt-4 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
                Clear Search & Reset
            </button>
        )}
    </div>
);

export const SupportErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
    message = "An error occurred while loading content.",
    onRetry,
}) => (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 my-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
            <p className="font-semibold">{message}</p>
        </div>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-bold hover:bg-rose-500/30 transition"
            >
                Retry
            </button>
        )}
    </div>
);

export const SupportSuccessTicketScreen: React.FC<{
    ticket: Ticket;
    onReset: () => void;
}> = ({ ticket, onReset }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(ticket.referenceId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col items-center text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>

            <div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    Ticket Received
                </span>
                <h3 className="mt-3 text-2xl font-black text-white">Report Submitted Successfully</h3>
                <p className="mt-1.5 text-xs text-zinc-400 max-w-md leading-relaxed">
                    Our team has received your ticket. We'll inspect the issue and follow up with you.
                </p>
            </div>

            {/* Reference Ticket ID Badge */}
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Ticket Reference ID</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                        {ticket.referenceId}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white transition"
                        title="Copy Ticket ID"
                    >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                    Expected Response: {SUPPORT_CONFIG.sla.generalResponseTime}
                </p>
            </div>

            <div className="pt-2">
                <button
                    type="button"
                    onClick={onReset}
                    className="rounded-full bg-white/[0.08] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition"
                >
                    Submit Another Inquiry
                </button>
            </div>
        </div>
    );
};
