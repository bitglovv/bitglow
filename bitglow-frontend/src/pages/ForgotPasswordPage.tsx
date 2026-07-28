import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { api } from "../services/api";

export default function ForgotPasswordPage() {
    useEffect(() => { document.title = "Forgot Password - BitGlow"; }, []);
    
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email.trim()) {
            setError("Email is required.");
            return;
        }

        setLoading(true);

        try {
            const res = await api.auth.forgotPassword(email);
            setSuccess(res.message || "If an account exists, a reset link has been sent.");
        } catch (err: any) {
            setError(err.message || "Failed to process request.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Reset Password">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4 text-center text-sm font-medium text-brand-light animate-in fade-in slide-in-from-top-1">
                        {success}
                    </div>
                )}

                {!success && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400 text-center">
                            Enter the email address associated with your account and we'll send you a link to reset your password.
                        </p>

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            isLoading={loading}
                            disabled={!email || loading}
                            className="w-full py-4 text-base shadow-brand"
                        >
                            Send Reset Link
                        </Button>
                    </div>
                )}

                <div className="text-center">
                    <p className="text-sm text-zinc-500">
                        Remember your password?{" "}
                        <Link to="/login" className="font-bold text-zinc-100 transition-colors hover:text-brand">
                            Log in
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
