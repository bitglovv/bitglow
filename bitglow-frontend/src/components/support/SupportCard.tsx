import React from "react";

interface SupportCardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    action?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    headerBorder?: boolean;
}

export const SupportCard: React.FC<SupportCardProps> = ({
    title,
    subtitle,
    icon,
    badge,
    badgeColor = "bg-white/10 text-zinc-300 border-white/10",
    action,
    children,
    className = "",
    headerBorder = true,
}) => {
    return (
        <div className={`rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden transition hover:border-white/15 ${className}`}>
            {(title || subtitle || icon || action) && (
                <div className={`px-5 py-4 ${headerBorder ? "border-b border-white/[0.06]" : ""} flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                        {icon && <div className="shrink-0">{icon}</div>}
                        <div>
                            {title && <h3 className="text-[15px] font-bold text-white leading-snug">{title}</h3>}
                            {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {badge && (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeColor}`}>
                                {badge}
                            </span>
                        )}
                        {action}
                    </div>
                </div>
            )}

            {children && <div className="p-5">{children}</div>}
        </div>
    );
};
