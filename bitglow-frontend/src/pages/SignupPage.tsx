import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type SignupForm = {
    username: string;
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
};

type SignupTouched = Record<keyof SignupForm, boolean>;

export default function SignupPage() {
    useEffect(() => { document.title = "BitGlow \u2022 Sign Up"; }, []);
    const [form, setForm] = useState<SignupForm>({
        username: "",
        displayName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState<SignupTouched>({
        username: false,
        displayName: false,
        email: false,
        password: false,
        confirmPassword: false,
    });
    const { login } = useAuth();
    const navigate = useNavigate();

    const usernameError = useMemo(() => {
        if (!touched.username) return "";
        if (!form.username.trim()) return "Username is required.";
        if (!/^[a-zA-Z0-9_.]+$/.test(form.username)) {
            return "Use letters, numbers, underscores, or periods only.";
        }
        return "";
    }, [form.username, touched.username]);

    const displayNameError = useMemo(() => {
        if (!touched.displayName) return "";
        if (!form.displayName.trim()) return "Display name is required.";
        return "";
    }, [form.displayName, touched.displayName]);

    const emailError = useMemo(() => {
        if (!touched.email) return "";
        if (!form.email.trim()) return "Email is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
        return "";
    }, [form.email, touched.email]);

    const passwordError = useMemo(() => {
        if (!touched.password) return "";
        if (!form.password) return "Password is required.";
        if (form.password.length < 6) return "Password must be at least 6 characters.";
        return "";
    }, [form.password, touched.password]);

    const confirmPasswordError = useMemo(() => {
        if (!touched.confirmPassword) return "";
        if (!form.confirmPassword) return "Please confirm your password.";
        if (form.password !== form.confirmPassword) return "Passwords do not match.";
        return "";
    }, [form.confirmPassword, form.password, touched.confirmPassword]);

    const passwordStrength = useMemo(() => {
        if (!form.password) return "";
        if (form.password.length < 6) return "Weak";
        if (form.password.length < 10) return "Medium";
        return "Strong";
    }, [form.password]);

    const isFormValid =
        !usernameError &&
        !displayNameError &&
        !emailError &&
        !passwordError &&
        !confirmPasswordError &&
        form.username.trim() &&
        form.displayName.trim() &&
        form.email.trim() &&
        form.password &&
        form.confirmPassword;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched({
            username: true,
            displayName: true,
            email: true,
            password: true,
            confirmPassword: true,
        });
        setError("");

        if (!isFormValid) return;

        setLoading(true);

        try {
            const { token, user } = await api.auth.signup({
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                password: form.password,
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

    const markTouched = (field: keyof SignupTouched) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    return (
        <AuthLayout
            title="Create account"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                ) : null}

                <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Input
                            label="Username"
                            name="username"
                            placeholder="johndoe"
                            value={form.username}
                            onChange={handleChange}
                            onBlur={() => markTouched("username")}
                            error={usernameError}
                            required
                        />
                        <Input
                            label="Display Name"
                            name="displayName"
                            placeholder="John Doe"
                            value={form.displayName}
                            onChange={handleChange}
                            onBlur={() => markTouched("displayName")}
                            error={displayNameError}
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
                        onBlur={() => markTouched("email")}
                        error={emailError}
                        required
                    />

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={() => markTouched("password")}
                            error={passwordError}
                            helperText={
                                form.password
                                    ? `Strength: ${passwordStrength}`
                                    : "Use at least 6 characters."
                            }
                            required
                        />
                        <Input
                            label="Confirm Password"
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            onBlur={() => markTouched("confirmPassword")}
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
                            error={confirmPasswordError}
                            required
                        />
                    </div>
                </div>

                <div className="pt-1">
                    <Button
                        type="submit"
                        isLoading={loading}
                        disabled={!isFormValid || loading}
                        className="w-full py-4 text-base shadow-brand"
                    >
                        Create Account
                    </Button>
                </div>

                <div className="text-center">
                    <p className="text-sm font-medium text-zinc-500">
                        Already have an account?{" "}
                        <Link to="/login" className="font-bold text-zinc-100 transition-colors hover:text-brand">
                            Sign in
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
