import React from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  loading = false,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 rounded-2xl border border-white/10 p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="mt-3 text-sm text-zinc-400">{message}</div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => void onConfirm()}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
