import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Zap, Shield, FileText, HelpCircle, Mail, AlertTriangle } from "lucide-react";
import { navigateBack } from "../../utils/navigateBack";
import { SUPPORT_CONFIG } from "../../config/supportConfig";

interface SupportHeaderProps {
    title: string;
    icon?: React.ReactNode;
    showPills?: boolean;
}

export const SupportHeader: React.FC<SupportHeaderProps> = ({ title, icon, showPills = true }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navPills = [
        { path: "/about-app", label: "About", icon: Zap },
        { path: "/help", label: "Help Center", icon: HelpCircle },
        { path: "/report", label: "Report Issue", icon: AlertTriangle },
        { path: "/contact", label: "Contact", icon: Mail },
        { path: "/privacy", label: "Privacy", icon: Shield },
        { path: "/terms", label: "Terms", icon: FileText },
    ];

    return (
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl transition-all">
            <div className="mx-auto max-w-4xl px-4 py-3.5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigateBack(navigate, "/settings")}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-zinc-300 transition hover:bg-white/[0.12] hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            aria-label="Back to App"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-2.5">
                            {icon || (
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                                    <Zap className="h-4 w-4 text-emerald-400" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-[17px] font-bold tracking-tight text-white leading-none">
                                    {title}
                                </h1>
                                <p className="mt-1 text-[11px] font-semibold text-zinc-500 leading-none">
                                    {SUPPORT_CONFIG.appName} Support Center
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        to="/help"
                        aria-label="BitGlow Knowledge Base"
                        className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white transition"
                    >
                        <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Search Knowledge Base</span>
                    </Link>
                </div>

                {showPills && (
                    <nav className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                        {navPills.map((pill) => {
                            const isActive =
                                location.pathname === pill.path ||
                                (pill.path === "/about-app" && location.pathname === "/about") ||
                                (pill.path === "/help" && location.pathname === "/help-center");
                            const IconComponent = pill.icon;

                            return (
                                <Link
                                    key={pill.path}
                                    to={pill.path}
                                    className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 font-semibold transition ${
                                        isActive
                                            ? "bg-white/10 text-white border border-white/15"
                                            : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <IconComponent className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                                    <span>{pill.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </header>
    );
};
