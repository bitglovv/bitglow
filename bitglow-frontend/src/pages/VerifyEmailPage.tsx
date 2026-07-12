import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";

export default function VerifyEmailPage() {
    useEffect(() => { document.title = "Verify Email - BitGlow"; }, []);
    
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState("");
    const hasAttempted = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError("Invalid or missing verification token.");
            return;
        }

        if (hasAttempted.current) return;
        hasAttempted.current = true;

        const verifyToken = async () => {
            try {
                await api.settings.verifyEmail(token);
                setStatus('success');
            } catch (err: any) {
                setStatus('error');
                setError(err.message || "Failed to verify email. The link may have expired.");
            }
        };

        verifyToken();
    }, [token]);

    return (
        <AuthLayout title="Email Verification">
            <div className="space-y-6 text-center animate-in fade-in">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-zinc-800">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                        </div>
                        <p className="text-zinc-400">Verifying your email address...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 slide-in-from-bottom-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
                            <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Email Verified!</h3>
                            <p className="text-zinc-400">
                                Your email address has been successfully updated.
                            </p>
                        </div>
                        <Button as={Link} to="/home" className="w-full">
                            Continue to BitGlow
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6 slide-in-from-bottom-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Verification Failed</h3>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                        <Button as={Link} to="/settings" className="w-full">
                            Return to Settings
                        </Button>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}
