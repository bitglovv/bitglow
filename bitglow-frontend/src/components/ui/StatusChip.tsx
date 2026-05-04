import clsx from "clsx";

type Variant = "live" | "online" | "unread" | "danger" | "default";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
};

export default function StatusChip({ children, variant = "default", className = "" }: Props) {
  const styles: Record<Variant, string> = {
    live: "bg-emerald-500/12 text-emerald-300 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.18)]",
    online: "bg-cyan-500/12 text-cyan-300 border-cyan-500/20",
    unread: "bg-fuchsia-500/12 text-fuchsia-300 border-fuchsia-500/20",
    danger: "bg-rose-500/12 text-rose-300 border-rose-500/20",
    default: "bg-white/[0.04] text-zinc-300 border-white/10",
  };

  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", styles[variant], className)}>
      {children}
    </span>
  );
}
