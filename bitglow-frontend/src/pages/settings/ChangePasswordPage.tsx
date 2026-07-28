import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../../components/common/Header";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { navigateBack } from "../../utils/navigateBack";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    document.title = "Change Password - BitGlow";
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await api.settings.changePassword(currentPassword, newPassword);
      setSuccess("Password updated successfully. You will be redirected to sign in.");
      logout();
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err.message || "Unable to update password.");
    } finally {
      setIsLoading(false);
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
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Account Security</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Change Password</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Use your current password to confirm your identity and choose a stronger password. All active sessions will be revoked after this change.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                  Update Password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigateBack(navigate, "/settings")}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
