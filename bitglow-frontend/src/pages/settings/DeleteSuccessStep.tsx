type DeleteSuccessStepProps = {
  scheduledDate: string;
};

export default function DeleteSuccessStep({ scheduledDate }: DeleteSuccessStepProps) {
  return (
    <section className="space-y-6 text-center sm:text-left">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-black text-black sm:mx-0">
        ✓
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Account scheduled for deletion
        </h2>
        <p className="text-base leading-7 text-zinc-400">
          Your account is deactivated and scheduled for permanent deletion on{" "}
          <strong className="text-brand">{scheduledDate}</strong>.
        </p>
        <p className="text-sm leading-6 text-zinc-500">
          You can restore your account within the grace period by signing in and completing ownership verification.
        </p>
      </div>
    </section>
  );
}
