import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/common/Header";
import { Button } from "../components/ui/Button";
import { OtpInput } from "../components/ui/OtpInput";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { navigateBack } from "../utils/navigateBack";

type RestoreStep = 1 | 2 | 3;

type PersistedRestoreState = {
  identifier: string;
  password: string;
  scheduledDeletionAt: string;
  username: string;
  email: string;
  step: RestoreStep;
  otpCode: string;
};

const STORAGE_KEY = "bitglow:restore-account-flow:v1";

function coerceStep(value: number | null | undefined): RestoreStep {
  if (value === 1 || value === 2 || value === 3) return value;
  return 1;
}

function readPersistedState(): PersistedRestoreState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedRestoreState>;
    if (!parsed.identifier || !parsed.password) return null;
    return {
      identifier: String(parsed.identifier),
      password: String(parsed.password),
      scheduledDeletionAt: String(parsed.scheduledDeletionAt || ""),
      username: String(parsed.username || ""),
      email: String(parsed.email || ""),
      step: coerceStep(parsed.step),
      otpCode: typeof parsed.otpCode === "string" ? parsed.otpCode.replace(/\D/g, "").slice(0, 6) : "",
    };
  } catch {
    return null;
  }
}

export default function RestoreAccountPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const persisted = useMemo(() => readPersistedState(), []);

  // Redirect to login if no active restoration session
  useEffect(() => {
    if (!persisted) {
      navigate("/login", { replace: true });
    }
  }, [persisted, navigate]);

  const [step, setStep] = useState<RestoreStep>(persisted?.step ?? 1);
  const [otpCode, setOtpCode] = useState(persisted?.otpCode ?? "");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Restore Account | BitGlow";
  }, []);

  // Sync state to sessionStorage for refresh & back button persistence
  useEffect(() => {
    if (!persisted) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...persisted,
        step,
        otpCode,
      })
    );
  }, [persisted, step, otpCode]);

  if (!persisted) {
    return null;
  }

  const { identifier, password, scheduledDeletionAt, username, email } = persisted;

  const formattedDate = scheduledDeletionAt
    ? new Date(scheduledDeletionAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "scheduled date";

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setError("");
    setOtpSentMessage("");

    try {
      const res = await api.auth.sendRestorationOtp(identifier, password);
      setOtpSentMessage(res.message || "Verification code sent to your email!");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRestoreAccount = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setRestoring(true);
    setError("");

    try {
      const { token, user } = await api.auth.restoreAccount(identifier, password, otpCode.trim());
      sessionStorage.removeItem(STORAGE_KEY);
      login(token, user);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to restore account.");
    } finally {
      setRestoring(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setError("");
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    navigateBack(navigate, "/login");
  };

  const handleFinish = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate("/home", { replace: true });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white selection:bg-brand/30">
      <Header showTop={false} hideBottomNav />

      {/* Standard Header */}
      <header className="shrink-0 border-b border-white/[0.07] bg-black px-4 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 pb-4">
          {step < 3 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">@{username}</p>
            <h1 className="truncate text-xl font-bold tracking-tight text-white">
              {step === 3 ? "Account Restored" : "Restore Account"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 custom-scrollbar sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-lg flex-col space-y-5">

          {/* STEP 1: DELETION NOTICE & REQUEST OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                <p className="text-sm font-bold text-white">Account Scheduled for Deletion</p>
                <p>
                  Your account is currently scheduled for permanent deletion on{" "}
                  <strong className="text-emerald-400">{formattedDate}</strong>.
                </p>
                <p>
                  To restore your account, click below to receive a 6-digit verification code at{" "}
                  <strong className="text-zinc-200">{email}</strong>.
                </p>
              </div>

              {error && (
                <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <Button
                type="button"
                isLoading={sendingOtp}
                disabled={sendingOtp}
                onClick={handleSendOtp}
                className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
              >
                Send Verification Code
              </Button>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleRestoreAccount} className="space-y-4">
              {otpSentMessage && (
                <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg text-center font-medium">
                  {otpSentMessage}
                </p>
              )}

              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onResend={handleSendOtp}
                isResending={sendingOtp}
                disabled={restoring}
                error={error}
                emailHint={email}
              />

              <Button
                type="submit"
                isLoading={restoring}
                disabled={restoring || otpCode.trim().length !== 6}
                className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
              >
                Verify & Restore Account
              </Button>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white">Account Restored Successfully</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your deletion request has been cancelled. Your profile and content are fully active.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleFinish}
                className="w-full py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black border-none"
              >
                Go to Home
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
