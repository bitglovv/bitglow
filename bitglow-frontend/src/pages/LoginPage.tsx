import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { OtpInput } from "../components/ui/OtpInput";

type LoginTouched = {
    identifier: boolean;
    password: boolean;
};

export default function LoginPage() {
    useEffect(() => { document.title = "BitGlow"; }, []);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState<LoginTouched>({
        identifier: false,
        password: false,
    });
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isVerified = searchParams.get("verified") === "true";

    const identifierError = useMemo(() => {
        if (!touched.identifier) return "";
        if (!identifier.trim()) return "Email or username is required.";
        return "";
    }, [identifier, touched.identifier]);

    const passwordError = useMemo(() => {
        if (!touched.password) return "";
        if (!password) return "Password is required.";
        return "";
    }, [password, touched.password]);

    const isFormValid = !identifierError && !passwordError && identifier.trim() && password;

    const [restorationInfo, setRestorationInfo] = useState<{
        scheduledDeletionAt: string;
        username: string;
        email: string;
    } | null>(null);
    const [restorationStep, setRestorationStep] = useState<1 | 2>(1);
    const [otpCode, setOtpCode] = useState("");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSentMessage, setOtpSentMessage] = useState("");
    const [restoring, setRestoring] = useState(false);
    const [restorationError, setRestorationError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched({ identifier: true, password: true });
        setError("");

        if (!identifier.trim() || !password || identifierError || passwordError) {
            return;
        }

        setLoading(true);

        try {
            const res = await api.auth.login(identifier, password) as any;
            if (res.requiresRestoration) {
                setRestorationInfo({
                    scheduledDeletionAt: res.scheduledDeletionAt,
                    username: res.username,
                    email: res.email,
                });
                setRestorationStep(1);
                setRestorationError("");
                setOtpCode("");
                setOtpSentMessage("");
                return;
            }

            login(res.token, res.user);
            navigate("/home");
        } catch (err: any) {
            setError(err.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSendRestorationOtp() {
        setSendingOtp(true);
        setRestorationError("");
        setOtpSentMessage("");
        try {
            const res = await api.auth.sendRestorationOtp(identifier, password);
            setOtpSentMessage(res.message || "Verification code sent to your email!");
            setRestorationStep(2);
        } catch (err: any) {
            setRestorationError(err.message || "Failed to send verification code.");
        } finally {
            setSendingOtp(false);
        }
    }

    async function handleRestoreAccount(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!otpCode || otpCode.trim().length !== 6) {
            setRestorationError("Please enter the 6-digit verification code sent to your email.");
            return;
        }

        setRestoring(true);
        setRestorationError("");
        try {
            const { token, user } = await api.auth.restoreAccount(identifier, password, otpCode.trim());
            login(token, user);
            navigate("/home");
        } catch (err: any) {
            setRestorationError(err.message || "Failed to restore account.");
        } finally {
            setRestoring(false);
        }
    }

    async function handleResend() {
        if (!identifier.trim() || resendLoading) return;
        setResendLoading(true);
        setResendSuccess(false);
        try {
            await api.auth.resendVerification(identifier);
            setResendSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to resend verification email.");
        } finally {
            setResendLoading(false);
        }
    }

    const isUnverifiedError = error.includes("Please verify your email before signing in");

    return (
        <AuthLayout
            title="Log in"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {isVerified ? (
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center text-sm font-medium text-green-300 animate-in fade-in slide-in-from-top-1">
                        Email verified successfully. You can now sign in.
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1 flex flex-col items-center gap-2">
                        <span>{error}</span>
                        {isUnverifiedError && (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendLoading}
                                className="text-brand hover:text-white underline font-semibold transition-colors disabled:opacity-50"
                            >
                                {resendLoading ? "Resending..." : "Resend verification email"}
                            </button>
                        )}
                    </div>
                ) : null}

                {resendSuccess ? (
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4 text-center text-sm font-medium text-brand animate-in fade-in slide-in-from-top-1">
                        Verification email sent! Check your inbox.
                    </div>
                ) : null}

                <div className="space-y-3.5">
                    <Input
                        label="Email or Username"
                        type="text"
                        placeholder="Enter your email or username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.trim())}
                        onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
                        error={identifierError}
                        helperText="Use the email or username you signed up with."
                        autoFocus
                        required
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="transition-colors hover:text-white"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            }
                            helperText="Your password is case sensitive."
                            error={passwordError}
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    isLoading={loading}
                    disabled={!isFormValid || loading}
                    className="w-full py-4 text-base shadow-brand"
                >
                    {loading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="text-center space-y-2">
                    <p className="text-sm text-zinc-500">
                        <Link to="/forgot-password" className="font-medium text-zinc-300 hover:text-white transition-colors">
                            Forgot your password?
                        </Link>
                    </p>
                    <p className="text-sm text-zinc-500">
                        New to BitGlow?{" "}
                        <Link to="/signup" className="font-bold text-zinc-100 transition-colors hover:text-brand">
                            Create an account
                        </Link>
                    </p>
                </div>
            </form>

            {/* Account Restoration Modal */}
            {restorationInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 text-white shadow-xl space-y-4 text-left">
                        
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight">Restore Account</h3>
                                <p className="text-xs text-zinc-500">@{restorationInfo.username}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRestorationInfo(null)}
                                className="text-xs text-zinc-500 hover:text-white transition px-2 py-1"
                            >
                                Cancel
                            </button>
                        </div>

                        {restorationStep === 1 && (
                            <div className="space-y-4">
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Account scheduled for deletion on{" "}
                                    <strong className="text-emerald-400">
                                        {new Date(restorationInfo.scheduledDeletionAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </strong>. A verification code will be sent to <strong className="text-zinc-200">{restorationInfo.email}</strong>.
                                </p>

                                {restorationError && (
                                    <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
                                        {restorationError}
                                    </p>
                                )}

                                <Button
                                    type="button"
                                    isLoading={sendingOtp}
                                    disabled={sendingOtp}
                                    onClick={handleSendRestorationOtp}
                                    className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                                >
                                    Send Verification Code
                                </Button>
                            </div>
                        )}

                        {restorationStep === 2 && (
                            <form onSubmit={handleRestoreAccount} className="space-y-3.5">
                                {otpSentMessage && (
                                    <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2 rounded-lg text-center font-medium">
                                        {otpSentMessage}
                                    </p>
                                )}

                                <OtpInput
                                    value={otpCode}
                                    onChange={setOtpCode}
                                    onResend={handleSendRestorationOtp}
                                    isResending={sendingOtp}
                                    disabled={restoring}
                                    error={restorationError}
                                    emailHint={restorationInfo.email}
                                />

                                <div className="flex flex-col gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        isLoading={restoring}
                                        disabled={restoring || otpCode.trim().length !== 6}
                                        className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                                    >
                                        Verify & Restore Account
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setRestorationInfo(null)}
                                        className="text-xs text-zinc-500 hover:text-zinc-300 py-1 text-center"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AuthLayout>
    );
}
