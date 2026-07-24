type DeleteProgressProps = {
  step: number;
  totalSteps: number;
};

export default function DeleteProgress({ step, totalSteps }: DeleteProgressProps) {
  const boundedStep = Math.min(Math.max(step, 1), totalSteps);
  const progress = (boundedStep / totalSteps) * 100;

  return (
    <div className="space-y-2" aria-label={`Step ${boundedStep} of ${totalSteps}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <span>Step {boundedStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
