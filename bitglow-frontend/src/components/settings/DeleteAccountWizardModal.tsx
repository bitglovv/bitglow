import React, { useState } from "react";
import { Button } from "../ui/Button";
import { OtpInput } from "../ui/OtpInput";
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
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

    // Form state
    const [reasonCategory, setReasonCategory] = useState<string>("Privacy concerns");
    const [password, setPassword] = useState<string>("");
    const [otpCode, setOtpCode] = useState<string>("");
    const [confirmText, setConfirmText] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [isResending, setIsResending] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [scheduledDateStr, setScheduledDateStr] = useState<string>("");

    if (!isOpen) return null;

    const handleRequestOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError("");

        if (!password) {
            setError("Current password is required.");
            return;
        }

        setLoading(true);

        try {
            await api.user.requestDeletionOtp(password);
            setStep(4);
        } catch (err: any) {
            setError(err.message || "Failed to send verification code.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsResending(true);
        setError("");

        try {
            await api.user.requestDeletionOtp(password);
        } catch (err: any) {
            setError(err.message || "Failed to resend verification code.");
        } finally {
            setIsResending(false);
        }
    };

    const handleConfirmDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!otpCode || otpCode.trim().length !== 6) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        if (confirmText.trim().toUpperCase() !== "DELETE") {
            setError("Please type 'DELETE' to confirm.");
            return;
        }

        setLoading(true);

        try {
            const res = await api.user.scheduleAccountDeletion({
                password,
                otpCode: otpCode.trim(),
                confirmText: confirmText.trim(),
                reason: reasonCategory,
            });

            const dateStr = new Date(res.scheduledDeletionAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });

            setScheduledDateStr(dateStr);
            setStep(6);
        } catch (err: any) {
            setError(err.message || "Failed to schedule account deletion.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 text-white shadow-xl space-y-4">
                
                {/* Header with Step Indicator */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight">Delete Account</h2>
                        <p className="text-[11px] text-zinc-500">
                            {step < 6 ? `Step ${step} of 5` : "Completed"}
                        </p>
                    </div>
                    {step < 6 && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs text-zinc-500 hover:text-white transition px-2 py-1"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* STEP 1: WARNING */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                            <p className="font-semibold text-white">Deactivation & Grace Period</p>
                            <p>
                                Your account <strong className="text-zinc-200">@{user?.username}</strong> will be deactivated immediately and scheduled for permanent deletion in 30 days.
                            </p>
                            <p>
                                You can restore your account anytime within 30 days by logging back in.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                onClick={() => setStep(2)}
                                className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: REASON */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-white">Why are you leaving?</label>
                            <p className="text-[11px] text-zinc-500">Optional feedback to help us improve.</p>
                        </div>

                        <select
                            value={reasonCategory}
                            onChange={(e) => setReasonCategory(e.target.value)}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                        >
                            <option value="Privacy concerns">Privacy concerns</option>
                            <option value="Taking a break">Taking a break</option>
                            <option value="Creating new account">Creating new account</option>
                            <option value="Other">Other</option>
                        </select>

                        <div className="flex items-center justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                            >
                                Back
                            </button>
                            <Button
                                type="button"
                                onClick={() => setStep(3)}
                                className="py-2 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PASSWORD */}
                {step === 3 && (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-white">Current Password</label>
                            <p className="text-[11px] text-zinc-500">Enter password to request verification code.</p>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Current password"
                                autoComplete="current-password"
                                required
                                autoFocus
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                            >
                                Back
                            </button>
                            <Button
                                type="submit"
                                isLoading={loading}
                                disabled={loading || !password}
                                className="py-2 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                            >
                                Send Code
                            </Button>
                        </div>
                    </form>
                )}

                {/* STEP 4: EMAIL OTP */}
                {step === 4 && (
                    <div className="space-y-4">
                        <OtpInput
                            value={otpCode}
                            onChange={setOtpCode}
                            onResend={handleResendOtp}
                            isResending={isResending}
                            disabled={loading}
                            emailHint={user?.email}
                        />

                        <div className="flex items-center justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                            >
                                Back
                            </button>
                            <Button
                                type="button"
                                disabled={otpCode.length !== 6}
                                onClick={() => setStep(5)}
                                className="py-2 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 5: DELETE CONFIRMATION */}
                {step === 5 && (
                    <form onSubmit={handleConfirmDeletion} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-white">
                                Type <span className="font-mono text-emerald-400">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="DELETE"
                                required
                                autoFocus
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(4)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                            >
                                Back
                            </button>
                            <Button
                                type="submit"
                                isLoading={loading}
                                disabled={loading || confirmText.trim().toUpperCase() !== "DELETE"}
                                className="py-2 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                            >
                                Confirm Deletion
                            </Button>
                        </div>
                    </form>
                )}

                {/* STEP 6: SUCCESS */}
                {step === 6 && (
                    <div className="space-y-4 pt-1">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">Deactivation Scheduled</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Scheduled purge date: <strong className="text-emerald-400">{scheduledDateStr}</strong>.
                                You can restore your account anytime within 30 days by logging back in.
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={handleFinalLogout}
                            className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                        >
                            Log Out
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
