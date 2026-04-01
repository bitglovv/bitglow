import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { token, user } = await api.auth.login(email, password);
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
            title="BitGlow"
            subtitle="Welcome back, please enter your details."
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                            required
                        />
                        <div className="flex justify-end px-1">
                            <a href="#" className="text-xs text-brand font-semibold hover:text-brand-light transition-colors">
                                Forgot password?
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-1">
                    <input
                        type="checkbox"
                        id="remember"
                        className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-brand focus:ring-brand/20 transition-all cursor-pointer accent-brand"
                    />
                    <label htmlFor="remember" className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors font-medium">
                        Remember me
                    </label>
                </div>

                <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full py-4 text-base"
                >
                    Sign In
                </Button>

                <div className="text-center pt-2">
                    <p className="text-zinc-500 text-sm">
                        New to BitGlow?{" "}
                        <Link to="/signup" className="text-white hover:text-brand font-bold transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}

