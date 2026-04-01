import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff, User, AtSign, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function SignupPage() {
    const [form, setForm] = useState({
        username: "",
        displayName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!/^[a-zA-Z0-9_.]+$/.test(form.username)) {
            setError("Username can only contain letters, numbers, and underscores.");
            return;
        }

        setLoading(true);

        try {
            const { token, user } = await api.auth.signup({
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                password: form.password
            });
            login(token, user);
            navigate("/home");
        } catch (err: any) {
            setError(err.message || "Signup failed.");
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <AuthLayout
            title="Create account"
            subtitle="Join the next generation of real-time chat"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Username"
                            name="username"
                            placeholder="johndoe"
                            value={form.username}
                            onChange={handleChange}
                            leftIcon={<AtSign className="w-4 h-4" />}
                            required
                        />
                        <Input
                            label="Display Name"
                            name="displayName"
                            placeholder="John Doe"
                            value={form.displayName}
                            onChange={handleChange}
                            leftIcon={<User className="w-4 h-4" />}
                            required
                        />
                    </div>

                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        value={form.email}
                        onChange={handleChange}
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            leftIcon={<Lock className="w-4 h-4" />}
                            required
                        />
                        <Input
                            label="Confirm"
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={handleChange}
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
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full py-4 text-base"
                    >
                        Create Account
                    </Button>
                </div>

                <div className="text-center">
                    <p className="text-zinc-500 text-sm font-medium">
                        Already have an account?{" "}
                        <Link to="/login" className="text-white hover:text-brand font-bold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}

