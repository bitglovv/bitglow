import { Button } from "../ui/Button";

type DeleteFooterProps = {
  backLabel?: string;
  nextLabel: string;
  onBack?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function DeleteFooter({
  backLabel = "Back",
  nextLabel,
  onBack,
  onNext,
  disabled,
  loading,
}: DeleteFooterProps) {
  return (
    <div className="shrink-0 border-t border-white/[0.07] bg-black px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-0">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="min-h-12 flex-1 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {backLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onNext}
          isLoading={loading}
          disabled={disabled || loading}
          className="min-h-12 flex-[1.4] rounded-2xl bg-brand text-black shadow-none hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
