import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface SupportAccordionItem {
    id: string;
    title: string;
    content: React.ReactNode;
    badge?: string;
    defaultOpen?: boolean;
}

interface SupportAccordionProps {
    items: SupportAccordionItem[];
    allowMultiple?: boolean;
    className?: string;
}

export const SupportAccordion: React.FC<SupportAccordionProps> = ({
    items,
    allowMultiple = false,
    className = "",
}) => {
    const [openIds, setOpenIds] = useState<string[]>(() =>
        items.filter((i) => i.defaultOpen).map((i) => i.id)
    );

    const toggleItem = (id: string) => {
        if (allowMultiple) {
            setOpenIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
            );
        } else {
            setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {items.map((item) => {
                const isOpen = openIds.includes(item.id);

                return (
                    <div
                        key={item.id}
                        id={item.id}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden transition hover:border-white/15"
                    >
                        <button
                            type="button"
                            onClick={() => toggleItem(item.id)}
                            aria-expanded={isOpen}
                            aria-controls={`accordion-content-${item.id}`}
                            className="flex w-full items-center justify-between gap-4 p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[15px] font-bold text-white">{item.title}</span>
                                {item.badge && (
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                                        {item.badge}
                                    </span>
                                )}
                            </div>

                            <ChevronDown
                                className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                                    isOpen ? "rotate-180 text-emerald-400" : ""
                                }`}
                            />
                        </button>

                        {isOpen && (
                            <div
                                id={`accordion-content-${item.id}`}
                                role="region"
                                className="border-t border-white/[0.05] px-5 py-4 text-sm leading-relaxed text-zinc-400 animate-in fade-in duration-150"
                            >
                                {item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
