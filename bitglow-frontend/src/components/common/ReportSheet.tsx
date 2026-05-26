import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";

type ReportSheetProps = {
  isOpen: boolean;
  title: string;
  prompt: string;
  options: string[];
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

export function ReportSheet({
  isOpen,
  title,
  prompt,
  options,
  onClose,
  onSubmit,
}: ReportSheetProps) {
  const [customReason, setCustomReason] = useState("");

  const submitReason = (reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setCustomReason("");
  };

  const closeSheet = () => {
    setCustomReason("");
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={title}>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm font-semibold leading-5">{prompt}</p>
        </div>

        <div className="space-y-2">
          {options.map((reason) => (
            <button
              key={reason}
              type="button"
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              onClick={() => submitReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
            Other
          </label>
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Tell us what happened..."
            className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-brand/40 focus:bg-white/[0.07]"
          />
          <Button
            className="w-full"
            disabled={!customReason.trim()}
            onClick={() => submitReason(customReason)}
          >
            Submit Report
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
