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

        if (!identifier.trim() || !password || identifierError || passwordError || loading) {
            return;
        }

        setLoading(true);

        try {
            const res = await api.auth.login(identifier, password) as any;
            if (res.requiresRestoration) {
                sessionStorage.setItem(
                    "bitglow:restore-account-flow:v1",
                    JSON.stringify({
                        identifier,
                        password,
                        scheduledDeletionAt: res.scheduledDeletionAt,
                        username: res.username,
                        email: res.email,
                        step: 1,
                        otpCode: "",
                    })
                );
                navigate("/restore-account");
                return;
            }

            login(res.token, res.user, res.refreshToken);
            navigate("/home");
        } catch (err: any) {
            setError(err.message || "Invalid credentials.");
        } finally {
            setLoading(false);
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

    return (
        <AuthLayout
            title="Log in to BitGlow"
            subtitle="Welcome back! Enter your credentials to access your account."
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {isVerified && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold text-center">
                        Email verified successfully! You can now log in.
                    </div>
                )}
                
                {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold text-center space-y-2">
                        <div>{error}</div>
                        {error.toLowerCase().includes("verify your email") && (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendLoading || resendSuccess}
                                className="underline font-bold hover:text-white transition disabled:opacity-50"
                            >
                                {resendLoading
                                    ? "Sending email..."
                                    : resendSuccess
                                    ? "Verification email sent!"
                                    : "Resend verification email"}
                            </button>
                        )}
                    </div>
                )}

                <Input
                    label="Email or Username"
                    type="text"
                    placeholder="Username,Enter your email address"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
                    error={identifierError}
                    required
                />

                <div className="relative">
                    <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        error={passwordError}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[38px] text-zinc-400 hover:text-white transition"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                <Button
                    type="submit"
                    isLoading={loading}
                    disabled={loading || !isFormValid}
                    className="w-full py-3 text-sm font-bold"
                >
                    Log In
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
        </AuthLayout>
    );
}
