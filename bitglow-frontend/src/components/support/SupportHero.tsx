import React from "react";

interface SupportHeroProps {
    badge?: string;
    badgeColor?: "emerald" | "blue" | "purple" | "orange" | "yellow" | "indigo";
    title: string;
    description: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

export const SupportHero: React.FC<SupportHeroProps> = ({
    badge,
    badgeColor = "emerald",
    title,
    description,
    icon,
    children,
}) => {
    const badgeColorMap = {
        emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
        orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
        yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
        indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    };

    const glowColorMap = {
        emerald: "bg-emerald-400/10",
        blue: "bg-blue-400/10",
        purple: "bg-purple-400/10",
        orange: "bg-orange-400/10",
        yellow: "bg-yellow-400/10",
        indigo: "bg-indigo-400/10",
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 text-center shadow-2xl">
            {/* Background Glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className={`absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full blur-[80px] ${glowColorMap[badgeColor]}`} />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {icon && (
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/40">
                        {icon}
                    </div>
                )}

                {badge && (
                    <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badgeColorMap[badgeColor]}`}>
                        {badge}
                    </span>
                )}

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{title}</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">{description}</p>

                {children && <div className="mt-6 w-full max-w-xl">{children}</div>}
            </div>
        </div>
    );
};
