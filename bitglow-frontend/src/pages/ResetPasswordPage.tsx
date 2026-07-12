import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { api } from "../services/api";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
    useEffect(() => { document.title = "Choose New Password - BitGlow"; }, []);
    
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // If no token is provided in the URL
    useEffect(() => {
        if (!token) {
            setError("Invalid or missing password reset token.");
        }
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid token.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await api.auth.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <AuthLayout title="Password Reset Complete">
                <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
                        <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <p className="text-zinc-400">
                            Your password has been successfully updated. You have been logged out of all active sessions.
                        </p>
                        <p className="text-sm text-zinc-500">
                            Redirecting to login...
                        </p>
                    </div>
                    <Button onClick={() => navigate("/login")} className="w-full">
                        Return to Login
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Choose New Password">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                <div className="space-y-3.5">
                    <Input
                        label="New Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={!token}
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
                    />

                    <Input
                        label="Confirm New Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={!token}
                    />
                </div>

                <Button
                    type="submit"
                    isLoading={loading}
                    disabled={!token || !password || !confirmPassword || loading}
                    className="w-full py-4 text-base shadow-brand"
                >
                    Reset Password
                </Button>

                <div className="text-center">
                    <p className="text-sm text-zinc-500">
                        <Link to="/login" className="font-bold text-zinc-100 transition-colors hover:text-brand">
                            Return to Login
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
