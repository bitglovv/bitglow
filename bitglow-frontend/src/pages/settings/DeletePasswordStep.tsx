import { FormEvent, useEffect, useRef } from "react";

type DeletePasswordStepProps = {
  password: string;
  error?: string;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DeletePasswordStep({
  password,
  error,
  onPasswordChange,
  onSubmit,
}: DeletePasswordStepProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form id="delete-password-form" onSubmit={onSubmit} className="space-y-7">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Confirm ownership</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Enter your password.
        </h2>
        <p className="max-w-xl text-base leading-7 text-zinc-400">
          We will send a one-time verification code to your account email after your password is confirmed.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="delete-account-password" className="text-sm font-semibold text-zinc-200">
          Current password
        </label>
        <input
          ref={inputRef}
          id="delete-account-password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="current-password"
          required
          className="min-h-14 w-full rounded-2xl border border-white/[0.1] bg-white/[0.035] px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="Enter current password"
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-brand/20 bg-brand/10 p-3 text-sm font-medium text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
