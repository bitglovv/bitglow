import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ShieldAlert, Trash2, X, Lock, HelpCircle } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

interface DeleteAccountWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeleteAccountWizardModal: React.FC<DeleteAccountWizardModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { logout, user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Form inputs
    const [reasonCategory, setReasonCategory] = useState<string>("privacy");
    const [reasonText, setReasonText] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmText, setConfirmText] = useState<string>("");
    const [twoFactorCode, setTwoFactorCode] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [scheduledDateStr, setScheduledDateStr] = useState<string>("");

    if (!isOpen) return null;

    const reasonOptions = [
        { id: "privacy", label: "Privacy or data security concerns" },
        { id: "break", label: "Taking a break / Too distracting" },
        { id: "duplicate", label: "Created a duplicate account" },
        { id: "bugs", label: "Technical issues or app bugs" },
        { id: "other", label: "Other reason" },
    ];

    const handleConfirmDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("Current password is required.");
            return;
        }

        if (confirmText.trim().toUpperCase() !== "DELETE") {
            setError("Please type 'DELETE' in all caps to confirm.");
            return;
        }

        setLoading(true);

        try {
            const combinedReason = `[${reasonCategory}] ${reasonText}`.trim();
            const res = await api.user.scheduleAccountDeletion({
                password,
                confirmText,
                reason: combinedReason,
                twoFactorCode,
            });

            const dateStr = new Date(res.scheduledDeletionAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            setScheduledDateStr(dateStr);
            setStep(4);
        } catch (err: any) {
            setError(err.message || "Failed to schedule account deletion. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-white shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
                    <div className="flex items-center gap-3">
                        {step > 1 && step < 4 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white transition"
                                aria-label="Back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/20">
                                <Trash2 className="h-4 w-4 text-rose-400" />
                            </div>
                            <h2 className="text-base font-bold text-white">Delete Account</h2>
                        </div>
                    </div>

                    {step < 4 && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white transition"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Progress Indicators */}
                {step < 4 && (
                    <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        <span className={step === 1 ? "text-rose-400" : ""}>1. Warnings</span>
                        <span className={step === 2 ? "text-rose-400" : ""}>2. Reason</span>
                        <span className={step === 3 ? "text-rose-400" : ""}>3. Re-Authenticate</span>
                    </div>
                )}

                <div className="p-6">
                    {/* STEP 1: WARNINGS & IMPACTS */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-rose-200">
                                            Deactivation & 30-Day Grace Period
                                        </h3>
                                        <p className="mt-1 text-xs leading-relaxed text-rose-200/80">
                                            Your account @{user?.username} will be <strong>deactivated and hidden immediately</strong>. 
                                            You will have 30 days to log back in if you change your mind before all data is permanently purged.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    What will happen when you confirm:
                                </p>
                                <ul className="space-y-2 text-xs text-zinc-300">
                                    <li className="flex items-start gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>Your profile, posts, and comments will be hidden from all users immediately.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>All active sessions on all devices will be automatically logged out.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>A confirmation email with restoration instructions will be sent to {user?.email}.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>After 30 days, your data will be permanently purged in accordance with our data retention policy.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={onClose}>
                                    Keep My Account
                                </Button>
                                <Button type="button" variant="danger" onClick={() => setStep(2)}>
                                    Continue to Reason
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: REASON & FEEDBACK */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-sm font-bold text-white">Why are you deleting your account?</h3>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Please let us know how we can improve BitGlow (optional).
                                </p>
                            </div>

                            <div className="space-y-2">
                                {reasonOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setReasonCategory(opt.id)}
                                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition ${
                                            reasonCategory === opt.id
                                                ? "border-rose-500/50 bg-rose-500/10 text-white"
                                                : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {reasonCategory === opt.id && <Check className="h-4 w-4 text-rose-400" />}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Additional Feedback (Optional)
                                </label>
                                <textarea
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    placeholder="Tell us more about your experience..."
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs text-white placeholder-zinc-600 outline-none transition focus:border-rose-500/50"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                                    Back
                                </Button>
                                <Button type="button" variant="danger" onClick={() => setStep(3)}>
                                    Continue to Confirmation
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RE-AUTHENTICATION & CONFIRMATION */}
                    {step === 3 && (
                        <form onSubmit={handleConfirmDeletion} className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-1">
                                <p className="font-bold text-white">Re-authentication Required</p>
                                <p className="text-zinc-400">
                                    For security, enter your current password and type <strong className="text-rose-400">DELETE</strong> in all caps below.
                                </p>
                            </div>

                            <Input
                                label="Current Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Type <span className="text-rose-400 font-mono">DELETE</span> to Confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    required
                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white font-mono tracking-widest placeholder-zinc-600 outline-none transition focus:border-rose-500/50"
                                />
                            </div>

                            {/* 2FA Code Placeholder UI */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                        2FA Verification Code (Optional)
                                    </label>
                                    <span className="text-[10px] text-zinc-600">If enabled</span>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value)}
                                        placeholder="6-digit code e.g. 123456"
                                        maxLength={6}
                                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition focus:border-rose-500/50"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    variant="danger"
                                    isLoading={loading}
                                    disabled={loading || confirmText.trim().toUpperCase() !== "DELETE"}
                                >
                                    Schedule Account Deletion
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* STEP 4: SUCCESS & LOGOUT */}
                    {step === 4 && (
                        <div className="flex flex-col items-center text-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-500/15 border border-rose-500/20 text-rose-400">
                                <Trash2 className="h-7 w-7" />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white">Account Deactivation Scheduled</h3>
                                <p className="mt-1.5 text-xs text-zinc-400 max-w-sm leading-relaxed">
                                    Your account has been deactivated. Permanent deletion will occur on{" "}
                                    <strong className="text-rose-400">{scheduledDateStr}</strong>.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-zinc-300 max-w-sm space-y-2">
                                <div className="flex items-center gap-2 font-bold text-emerald-400">
                                    <HelpCircle className="h-4 w-4" />
                                    <span>How to Restore Your Account</span>
                                </div>
                                <p className="text-left text-[11px] text-zinc-400 leading-relaxed">
                                    Simply log back in anytime within the 30-day grace period to cancel deletion and restore your account immediately.
                                </p>
                            </div>

                            <Button type="button" variant="primary" onClick={handleFinalLogout} className="w-full mt-2">
                                Complete Deactivation & Log Out
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
