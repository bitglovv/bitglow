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
    useEffect(() => { document.title = "BitGlow"; }, []);
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
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!form.username.trim() || !/^[a-zA-Z0-9_.]+$/.test(form.username)) {
            setUsernameAvailable(null);
            return;
        }
        
        setCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const res = await api.user.checkUsername(form.username);
                setUsernameAvailable(res.available);
            } catch {
                setUsernameAvailable(null);
            } finally {
                setCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.username]);

    const usernameError = useMemo(() => {
        if (!touched.username) return "";
        if (!form.username.trim()) return "Username is required.";
        if (!/^[a-zA-Z0-9_.]+$/.test(form.username)) {
            return "Use letters, numbers, underscores, or periods only.";
        }
        if (usernameAvailable === false) {
            return "Username is already taken.";
        }
        return "";
    }, [form.username, touched.username, usernameAvailable]);

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
        if (form.password.length < 8) return "Password must be at least 8 characters.";
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
        if (form.password.length < 8) return "Weak";
        if (form.password.length < 12) return "Medium";
        return "Strong";
    }, [form.password]);

    const isFormValid =
        !usernameError &&
        !displayNameError &&
        !emailError &&
        !passwordError &&
        !confirmPasswordError &&
        usernameAvailable !== false &&
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
            await api.auth.signup({
                username: form.username,
                displayName: form.displayName,
                email: form.email,
                password: form.password,
            });
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "Signup failed.");
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "username" || name === "email") {
            setForm({ ...form, [name]: value.trim() });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const markTouched = (field: keyof SignupTouched) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    if (isSuccess) {
        return (
            <AuthLayout title="Check your email">
                <div className="space-y-6 text-center animate-in fade-in">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
                        <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Check your email to verify your account.</h3>
                        <p className="text-zinc-400">
                            We've sent a verification link to {form.email}.
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
                            placeholder="Choose a username"
                            value={form.username}
                            onChange={handleChange}
                            onBlur={() => markTouched("username")}
                            error={usernameError}
                            helperText={
                                usernameAvailable === true
                                    ? "Username is available!"
                                    : checkingUsername
                                    ? "Checking availability..."
                                    : "Letters, numbers, underscores, periods"
                            }
                            autoFocus
                            required
                        />
                        <Input
                            label="Display Name"
                            name="displayName"
                            placeholder="Your display name"
                            value={form.displayName}
                            onChange={handleChange}
                            onBlur={() => markTouched("displayName")}
                            error={displayNameError}
                            helperText="This is how you appear to others."
                            required
                        />
                    </div>

                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={() => markTouched("email")}
                        error={emailError}
                        helperText="We'll send verification here."
                        required
                    />

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Create a password"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={() => markTouched("password")}
                            error={passwordError}
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
                            helperText={
                                form.password
                                    ? `Strength: ${passwordStrength}`
                                    : "Use at least 8 characters."
                            }
                            required
                        />
                        <Input
                            label="Confirm Password"
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Confirm your password"
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
                            helperText="Make sure it matches."
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
                        {loading ? "Creating account..." : "Create Account"}
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
