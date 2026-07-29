import { ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export type ActionSheetItem =
  | { type: "separator" }
  | {
      label: string;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
      icon?: ReactNode;
    };

type ActionSheetProps = {
  open: boolean;
  title: string;
  items: ActionSheetItem[];
  onClose: () => void;
};

export default function ActionSheet({ open, title, items, onClose }: ActionSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => cancelRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-0 text-white sm:items-center sm:p-5" role="presentation">
      <button
        type="button"
        aria-label="Close action sheet"
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-h-[88vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-zinc-950 shadow-2xl animate-in slide-in-from-bottom-full duration-300 sm:max-w-sm sm:rounded-3xl sm:border sm:slide-in-from-bottom-4 sm:zoom-in-95"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4">
          <h2 id={titleId} className="text-[15px] font-black tracking-tight text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 hidden h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">
            {items.map((item, index) => {
              if (item.type === "separator") {
                return <div key={`sep-${index}`} className="h-px bg-white/[0.08]" role="separator" />;
              }

              return (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    onClose();
                    item.onClick();
                  }}
                  className={[
                    "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-bold transition focus:outline-none focus:ring-1 focus:ring-inset focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-45",
                    item.danger ? "text-rose-400 hover:bg-rose-500/10" : "text-zinc-100 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {item.icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span> : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="mt-3 min-h-12 w-full rounded-2xl border border-white/[0.07] bg-white/[0.06] px-4 py-3 text-center text-[15px] font-black text-white transition hover:bg-white/[0.1] focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
