import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

export default function MoreMenu({ items, align = "right" }: { items: Array<{ label: string; onClick: () => void; danger?: boolean }>; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="p-2 rounded-full hover:bg-white/[0.04]">
        <MoreVertical className="w-5 h-5 text-zinc-300" />
      </button>

      {open && (
        <div className={`absolute mt-2 w-44 z-[100] ${align === "right" ? "right-0" : "left-0"} rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl`}> 
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg ${it.danger ? "text-rose-400 hover:bg-rose-500/10" : "text-zinc-200 hover:bg-white/[0.02]"}`}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
