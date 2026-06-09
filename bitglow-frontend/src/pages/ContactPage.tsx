import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, CheckCircle2, AlertCircle, MessageCircle, Mail } from "lucide-react";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { navigateBack } from "../utils/navigateBack";

export default function ContactPage() {
    useEffect(() => { document.title = "Contact & Support · BitGlow"; }, []);
    const navigate = useNavigate();

    const [type, setType] = useState("general");
    const [reason, setReason] = useState("");
    const [reportedUserId, setReportedUserId] = useState("");
    const [postId, setPostId] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            await api.settings.reportProblem(type, reason, reportedUserId, postId);
            setSuccess(true);
            setReason("");
            setReportedUserId("");
            setPostId("");
        } catch (err: any) {
            setError(err.message || "Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const typeOptions = [
        { value: "general", label: "General Support", emoji: "💬" },
        { value: "account", label: "Report an Account", emoji: "🚨" },
        { value: "post", label: "Report a Post", emoji: "📝" },
        { value: "bug", label: "Report a Bug", emoji: "🐛" },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => navigateBack(navigate, "/settings")}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white transition hover:bg-white/[0.10] active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15">
                            <Flag className="h-4 w-4 text-orange-400" />
                        </div>
                        <h1 className="text-[18px] font-bold tracking-tight">Contact & Support</h1>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6 space-y-5">
                {/* Direct contact cards */}
                <div className="grid grid-cols-2 gap-3">
                    <a
                        href="mailto:support@bitglow.app"
                        className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 transition hover:bg-white/[0.06] active:scale-[0.98]"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                            <Mail className="h-4.5 w-4.5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Email Us</p>
                            <p className="mt-0.5 text-xs text-zinc-500">support@bitglow.app</p>
                        </div>
                    </a>
                    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15">
                            <MessageCircle className="h-4.5 w-4.5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Response Time</p>
                            <p className="mt-0.5 text-xs text-zinc-500">Within 2–5 business days</p>
                        </div>
                    </div>
                </div>

                {/* Report form */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
                    <div className="border-b border-white/[0.06] px-5 py-4">
                        <h2 className="text-[15px] font-bold text-white">Submit a Report</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">Fill out the form below and our team will look into it.</p>
                    </div>

                    <div className="p-5">
                        {success ? (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">Report Submitted!</p>
                                    <p className="mt-1 text-sm text-zinc-400">We've received your message and will review it shortly.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSuccess(false)}
                                    className="mt-2 text-sm font-semibold text-zinc-400 underline underline-offset-4 hover:text-white transition"
                                >
                                    Submit another
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Type selector */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                                        Category
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {typeOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setType(opt.value)}
                                                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                                                    type === opt.value
                                                        ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                                                        : "border-white/[0.07] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"
                                                }`}
                                            >
                                                <span>{opt.emoji}</span>
                                                <span className="text-xs">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Conditional fields */}
                                {type === "account" && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                                            Username to Report
                                        </label>
                                        <input
                                            value={reportedUserId}
                                            onChange={(e) => setReportedUserId(e.target.value)}
                                            required
                                            placeholder="@username"
                                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.07]"
                                        />
                                    </div>
                                )}

                                {type === "post" && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                                            Post ID
                                        </label>
                                        <input
                                            value={postId}
                                            onChange={(e) => setPostId(e.target.value)}
                                            required
                                            placeholder="Paste the post ID here"
                                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.07]"
                                        />
                                    </div>
                                )}

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                                        Description
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                        rows={4}
                                        placeholder="Please describe the issue in detail..."
                                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.07]"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <Button type="submit" isLoading={loading} disabled={loading} className="w-full">
                                    Submit Report
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
