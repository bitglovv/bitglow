import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Header from "../common/Header";
import DeleteProgress from "./DeleteProgress";

type DeleteLayoutProps = {
  step: number;
  totalSteps: number;
  children: ReactNode;
  footer: ReactNode;
  onBack: () => void;
  isComplete?: boolean;
};

export default function DeleteLayout({
  step,
  totalSteps,
  children,
  footer,
  onBack,
  isComplete = false,
}: DeleteLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white selection:bg-brand/30">
      <Header showTop={false} hideBottomNav />

      <header className="shrink-0 border-b border-white/[0.07] bg-black px-4 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 pb-4">
          {!isComplete ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight">
              {isComplete ? "Account Scheduled" : "Delete Account"}
            </h1>
          </div>
        </div>
        {!isComplete ? (
          <div className="mx-auto w-full max-w-2xl pb-4">
            <DeleteProgress step={step} totalSteps={totalSteps} />
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 custom-scrollbar sm:px-6 sm:py-10">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center">
          {children}
        </div>
      </main>

      {footer}
    </div>
  );
}
