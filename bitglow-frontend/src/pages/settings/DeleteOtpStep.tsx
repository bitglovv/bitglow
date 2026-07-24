import { FormEvent } from "react";
import { OtpInput } from "../../components/ui/OtpInput";

type DeleteOtpStepProps = {
  otpCode: string;
  emailHint?: string;
  error?: string;
  loading?: boolean;
  isResending?: boolean;
  onOtpChange: (otpCode: string) => void;
  onResend: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DeleteOtpStep({
  otpCode,
  emailHint,
  error,
  loading,
  isResending,
  onOtpChange,
  onResend,
  onSubmit,
}: DeleteOtpStepProps) {
  return (
    <form id="delete-otp-form" onSubmit={onSubmit} className="space-y-7">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Email verification</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Enter the 6-digit code.
        </h2>
        <p className="max-w-xl text-base leading-7 text-zinc-400">
          Keep this page open while checking your email. Returning from Gmail or another app will keep you here.
        </p>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <OtpInput
          value={otpCode}
          onChange={onOtpChange}
          onResend={onResend}
          isResending={isResending}
          disabled={loading}
          error={error}
          emailHint={emailHint}
        />
      </div>
    </form>
  );
}
