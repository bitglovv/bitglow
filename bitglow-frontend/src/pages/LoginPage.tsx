import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched({ identifier: true, password: true });
        setError("");

        if (!identifier.trim() || !password || identifierError || passwordError) {
            return;
        }

        setLoading(true);

        try {
            const { token, user } = await api.auth.login(identifier, password);
            login(token, user);
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
        </AuthLayout>
    );
}
