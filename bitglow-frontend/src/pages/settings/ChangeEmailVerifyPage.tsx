import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../../components/common/Header";
import { Button } from "../../components/ui/Button";
import { OtpInput } from "../../components/ui/OtpInput";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { navigateBack } from "../../utils/navigateBack";

export default function ChangeEmailVerifyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.title = "Verify New Email - BitGlow";
  }, []);

  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!otpCode || otpCode.length !== 6) {
      setError("Enter the 6-digit verification code sent to your new email.");
      return;
    }

    setIsLoading(true);
    try {
      await api.settings.confirmEmailChange(otpCode.trim());
      setSuccess("Your email was updated successfully. You will be redirected to sign in.");
      logout();
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to verify the code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setIsResending(true);
    try {
      await api.settings.resendChangeEmailOtp();
      setSuccess("A new verification code has been sent to your new email address.");
    } catch (err: any) {
      setError(err.message || "Unable to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <Header
        leftContent={
          <button
            type="button"
            onClick={() => navigateBack(navigate, "/settings")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Back to settings"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      <main className="mx-auto h-[calc(100dvh-64px)] w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <div className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Email Verification</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Verify Your New Email</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Enter the code sent to your new address. Once verified, your current account email will be updated and you will be signed out from all sessions.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                error={error}
                emailHint={user?.email || "your new email"}
                onResend={handleResend}
                isResending={isResending}
              />

              {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

              <Button type="submit" isLoading={isLoading} className="w-full">
                Verify Email
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => navigateBack(navigate, "/settings")}
                className="w-full"
              >
                Back to Settings
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
