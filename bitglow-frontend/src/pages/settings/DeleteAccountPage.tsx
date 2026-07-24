import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DeleteLayout from "../../components/delete-account/DeleteLayout";
import DeleteFooter from "../../components/delete-account/DeleteFooter";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { navigateBack } from "../../utils/navigateBack";
import DeleteWarningStep from "./DeleteWarningStep";
import DeleteReasonStep from "./DeleteReasonStep";
import DeletePasswordStep from "./DeletePasswordStep";
import DeleteOtpStep from "./DeleteOtpStep";
import DeleteSuccessStep from "./DeleteSuccessStep";

type DeleteStep = 1 | 2 | 3 | 4 | 5;

type PersistedDeleteState = {
  step: DeleteStep;
  reason: string;
  otpCode: string;
  scheduledDateStr: string;
};

const TOTAL_STEPS = 5;
const STORAGE_KEY = "bitglow:delete-account-flow:v1";
const DEFAULT_REASON = "Privacy concerns";

function coerceStep(value: string | null): DeleteStep | null {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_STEPS) {
    return parsed as DeleteStep;
  }
  return null;
}

function readPersistedState(): PersistedDeleteState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedDeleteState>;
    const step = coerceStep(String(parsed.step ?? ""));
    if (!step) return null;
    return {
      step,
      reason: typeof parsed.reason === "string" ? parsed.reason : DEFAULT_REASON,
      otpCode: typeof parsed.otpCode === "string" ? parsed.otpCode.replace(/\D/g, "").slice(0, 6) : "",
      scheduledDateStr: typeof parsed.scheduledDateStr === "string" ? parsed.scheduledDateStr : "",
    };
  } catch {
    return null;
  }
}

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const initialState = useMemo(() => readPersistedState(), []);
  const queryStep = coerceStep(new URLSearchParams(location.search).get("step"));
  const [step, setStep] = useState<DeleteStep>(queryStep ?? initialState?.step ?? 1);
  const [reason, setReason] = useState(initialState?.reason ?? DEFAULT_REASON);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState(initialState?.otpCode ?? "");
  const [scheduledDateStr, setScheduledDateStr] = useState(initialState?.scheduledDateStr ?? "");
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Delete Account | BitGlow";
  }, []);

  useEffect(() => {
    const nextStep = coerceStep(new URLSearchParams(location.search).get("step"));
    if (nextStep && nextStep !== step) {
      setStep(nextStep);
      setError("");
    }
  }, [location.search, step]);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step, reason, otpCode, scheduledDateStr })
    );
  }, [step, reason, otpCode, scheduledDateStr]);

  useEffect(() => {
    const currentStep = coerceStep(new URLSearchParams(location.search).get("step"));
    if (!currentStep) {
      navigate(`/settings/delete-account?step=${step}`, { replace: true });
    }
  }, [location.search, navigate, step]);

  const goToStep = (nextStep: DeleteStep) => {
    setError("");
    setStep(nextStep);
    navigate(`/settings/delete-account?step=${nextStep}`);
  };

  const handleBack = () => {
    if (step > 1 && step < 5) {
      const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
      if (typeof historyIndex === "number" && historyIndex > 0) {
        navigate(-1);
      } else {
        goToStep((step - 1) as DeleteStep);
      }
      return;
    }
    navigateBack(navigate, "/settings");
  };

  const handleRequestOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!password) {
      setError("Current password is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.user.requestDeletionOtp(password);
      goToStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError("");

    try {
      await api.user.requestDeletionOtp(password);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmDeletion = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!password) {
      setError("Please go back and confirm your password again.");
      return;
    }

    if (otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.user.scheduleAccountDeletion({
        password,
        otpCode: otpCode.trim(),
        confirmText: "DELETE",
        reason,
      });

      const dateStr = new Date(res.scheduledDeletionAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      setScheduledDateStr(dateStr);
      goToStep(5);
    } catch (err: any) {
      setError(err.message || "Failed to schedule account deletion.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    logout();
  };

  const isComplete = step === 5;

  return (
    <DeleteLayout
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      isComplete={isComplete}
      footer={
        step === 1 ? (
          <DeleteFooter nextLabel="Continue" onNext={() => goToStep(2)} />
        ) : step === 2 ? (
          <DeleteFooter nextLabel="Continue" onBack={handleBack} onNext={() => goToStep(3)} />
        ) : step === 3 ? (
          <DeleteFooter
            nextLabel="Send Code"
            onBack={handleBack}
            disabled={!password}
            loading={loading}
            onNext={() => void handleRequestOtp()}
          />
        ) : step === 4 ? (
          <DeleteFooter
            nextLabel="Schedule Deletion"
            onBack={handleBack}
            disabled={otpCode.length !== 6}
            loading={loading}
            onNext={() => void handleConfirmDeletion()}
          />
        ) : (
          <DeleteFooter nextLabel="Log Out" onNext={handleFinalLogout} />
        )
      }
    >
      {step === 1 ? (
        <DeleteWarningStep username={user?.username} />
      ) : step === 2 ? (
        <DeleteReasonStep reason={reason} onReasonChange={setReason} />
      ) : step === 3 ? (
        <DeletePasswordStep
          password={password}
          error={error}
          onPasswordChange={setPassword}
          onSubmit={handleRequestOtp}
        />
      ) : step === 4 ? (
        <DeleteOtpStep
          otpCode={otpCode}
          emailHint={user?.email}
          error={error}
          loading={loading}
          isResending={isResending}
          onOtpChange={setOtpCode}
          onResend={handleResendOtp}
          onSubmit={handleConfirmDeletion}
        />
      ) : (
        <DeleteSuccessStep scheduledDate={scheduledDateStr || "the scheduled deletion date"} />
      )}
    </DeleteLayout>
  );
}
