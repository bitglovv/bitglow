type DeleteWarningStepProps = {
  username?: string;
};

export default function DeleteWarningStep({ username }: DeleteWarningStepProps) {
  return (
    <section className="space-y-7">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Before you continue</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Your account will be deactivated first.
        </h2>
        <p className="max-w-xl text-base leading-7 text-zinc-400">
          {username ? <span className="font-semibold text-zinc-200">@{username}</span> : "Your account"} will stop appearing as active immediately. Permanent deletion is scheduled after a 30 day grace period.
        </p>
      </div>

      <div className="space-y-4 text-sm leading-6 text-zinc-300">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          You can restore the account during the grace period by signing in again and completing ownership verification.
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          Your profile, posts, conversations, and activity may become unavailable while deletion is scheduled.
        </div>
      </div>
    </section>
  );
}
