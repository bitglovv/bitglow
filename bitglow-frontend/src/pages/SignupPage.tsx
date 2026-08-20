import React, { useEffect, useRef, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, API_URL } from "../services/api";
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
    const [usernameCheckError, setUsernameCheckError] = useState<"rate_limited" | "unavailable" | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    // Tracks which username value the last completed check corresponds to
    // so stale completions from an earlier keypress are ignored.
    const lastCheckedUsernameRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    const navigate = useNavigate();

    // Debounced username availability check.
    // Uses an AbortController so any in-flight check for a stale value is
    // cancelled immediately when the user types again, preventing stale
    // responses from overwriting the result for the current value.
    useEffect(() => {
        const VALID_USERNAME_RE = /^[a-zA-Z0-9_.]+$/;
        const username = form.username.trim();

        // Skip check entirely for empty or invalid-format usernames.
        if (!username || !VALID_USERNAME_RE.test(username) || username.length < 3) {
            setUsernameAvailable(null);
            setUsernameCheckError(null);
            return;
        }

        // Cancel any pending check from a previous keystroke.
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const ac = new AbortController();
        abortControllerRef.current = ac;

        setCheckingUsername(true);
        setUsernameCheckError(null);

        const timer = setTimeout(async () => {
            // Username that triggered this scheduled check (captured at schedule time).
            const checkingFor = username;
            try {
                const result = await api.user.checkUsername(checkingFor, ac.signal);

                // Ignore if user already typed something different while this was in-flight.
                if (checkingFor !== form.username.trim()) return;

                if (result.status === 429) {
                    setUsernameCheckError("rate_limited");
                    setUsernameAvailable(null);
                    return;
                }
                if (result.status === 503 || result.status >= 500) {
                    // Server temporarily unavailable (Render cold start, DB timeout, etc.).
                    // Don't block the user — they can still try to submit.
                    setUsernameCheckError("unavailable");
                    setUsernameAvailable(null);
                    return;
                }
                if (result.status >= 400 && result.status !== 404) {
                    setUsernameAvailable(null);
                    return;
                }
                setUsernameAvailable(result.available);
                lastCheckedUsernameRef.current = checkingFor;
            } catch (err: any) {
                if (err?.name === "AbortError") return; // Intentional cancel — ignore
                setUsernameAvailable(null);
            } finally {
                if (checkingFor === form.username.trim()) {
                    setCheckingUsername(false);
                }
            }
        }, 450);

        return () => {
            clearTimeout(timer);
            // Abort the in-flight request if the effect re-runs before it completes.
            ac.abort();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Don't block submit when check was rate-limited or server unavailable;
        // the server will do a definitive check during POST /signup.
        usernameAvailable !== false &&
        !checkingUsername &&
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

        if (!isFormValid || loading) return;

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
            const msg = err?.message || "";
            if (msg.toLowerCase().includes("too many") || msg.includes("429")) {
                setError("Too many signup attempts. Please wait a few minutes and try again.");
            } else if (msg.toLowerCase().includes("service unavailable") || msg.includes("503")) {
                setError("Service is temporarily unavailable. Please try again in a moment.");
            } else {
                setError(msg || "Signup failed. Please try again.");
            }
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
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col">
                {error ? (
                    <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                ) : null}

                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Input
                            label="Username"
                            name="username"
                            placeholder="Choose a username"
                            value={form.username}
                            onChange={handleChange}
                            onBlur={() => markTouched("username")}
                            error={usernameError}
                            helperText={
                                usernameCheckError === "rate_limited"
                                    ? "Checking too fast — please slow down"
                                    : usernameCheckError === "unavailable"
                                    ? "Can't verify right now — continue signup"
                                    : usernameAvailable === true
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

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                                    className="flex h-full w-full items-center justify-center transition-colors hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
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
                                    className="flex h-full w-full items-center justify-center transition-colors hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            }
                            helperText="Make sure it matches."
                            error={confirmPasswordError}
                            required
                        />
                    </div>
                </div>

                <div className="mt-7">
                    <Button
                        type="submit"
                        isLoading={loading}
                        disabled={!isFormValid || loading}
                        className="h-14 w-full text-base font-bold shadow-brand"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </Button>
                </div>

                <div className="mt-6 text-center">
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
