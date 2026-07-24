const reasons = [
  "Privacy concerns",
  "Taking a break",
  "Creating new account",
  "Not useful anymore",
  "Other",
];

type DeleteReasonStepProps = {
  reason: string;
  onReasonChange: (reason: string) => void;
};

export default function DeleteReasonStep({ reason, onReasonChange }: DeleteReasonStepProps) {
  return (
    <section className="space-y-7">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Optional feedback</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Why are you leaving?
        </h2>
        <p className="max-w-xl text-base leading-7 text-zinc-400">
          This does not affect your ability to delete the account. It only helps BitGlow improve.
        </p>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Deletion reason">
        {reasons.map((item) => {
          const selected = reason === item;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onReasonChange(item)}
              className={`flex min-h-14 w-full items-center justify-between rounded-2xl border px-4 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                selected
                  ? "border-brand bg-brand/10 text-white"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.055]"
              }`}
            >
              <span>{item}</span>
              <span className={`h-3 w-3 rounded-full ${selected ? "bg-brand" : "bg-white/15"}`} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
