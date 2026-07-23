import React from "react";
import { Link } from "react-router-dom";
import { Zap, Shield, FileText, HelpCircle, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SUPPORT_CONFIG } from "../../config/supportConfig";

export const SupportFooter: React.FC = () => {
    return (
        <footer className="mt-12 border-t border-white/[0.06] bg-black/60 pt-10 pb-16 text-xs text-zinc-500">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-8">
                {/* System Status Pill */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm">{SUPPORT_CONFIG.systemStatus.label}</p>
                            <p className="text-zinc-500 text-xs">Uptime {SUPPORT_CONFIG.systemStatus.uptimePercentage} · {SUPPORT_CONFIG.systemStatus.lastIncident}</p>
                        </div>
                    </div>
                    <Link
                        to="/contact"
                        className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
                    >
                        Report Outage
                    </Link>
                </div>

                {/* Grid Links */}
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 pt-2">
                    <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">About & App</p>
                        <ul className="space-y-2 font-medium">
                            <li>
                                <Link to="/about-app" className="hover:text-white transition flex items-center gap-1.5">
                                    <Zap className="h-3.5 w-3.5 text-emerald-400" /> About BitGlow
                                </Link>
                            </li>
                            <li>
                                <span className="text-zinc-600 cursor-not-allowed">Version {SUPPORT_CONFIG.appVersion}</span>
                            </li>
                            <li>
                                <span className="text-zinc-600 cursor-not-allowed">Status Page</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Support Hub</p>
                        <ul className="space-y-2 font-medium">
                            <li>
                                <Link to="/help" className="hover:text-white transition flex items-center gap-1.5">
                                    <HelpCircle className="h-3.5 w-3.5 text-blue-400" /> Knowledge Base
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="hover:text-white transition flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-purple-400" /> Contact Support
                                </Link>
                            </li>
                            <li>
                                <Link to="/report" className="hover:text-white transition flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400" /> Report a Problem
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Legal & Policy</p>
                        <ul className="space-y-2 font-medium">
                            <li>
                                <Link to="/privacy" className="hover:text-white transition flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5 text-emerald-400" /> Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-white transition flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-indigo-400" /> Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Direct Contact</p>
                        <p className="text-zinc-400 leading-relaxed">
                            Need urgent help? Reach out directly to our engineering & safety team.
                        </p>
                        <a
                            href={`mailto:${SUPPORT_CONFIG.contacts.supportEmail}`}
                            className="mt-2 inline-block font-semibold text-emerald-400 hover:underline"
                        >
                            {SUPPORT_CONFIG.contacts.supportEmail}
                        </a>
                    </div>
                </div>

                {/* Bottom Copyright */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/[0.05] pt-6 text-zinc-600 gap-2">
                    <p>© {new Date().getFullYear()} {SUPPORT_CONFIG.appName} Inc. All rights reserved.</p>
                    <p>Designed for privacy, speed, and real connections.</p>
                </div>
            </div>
        </footer>
    );
};
