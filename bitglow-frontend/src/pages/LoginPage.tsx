import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState<LoginTouched>({
        identifier: false,
        password: false,
    });
    const { login } = useAuth();
    const navigate = useNavigate();

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

    return (
        <AuthLayout
            title="Log in"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                ) : null}

                <div className="space-y-3.5">
                    <Input
                        label="Email or Username"
                        type="text"
                        placeholder="name@example.com or bitglow"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
                        error={identifierError}
                        required
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
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
                    Sign In
                </Button>

                <div className="text-center">
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
