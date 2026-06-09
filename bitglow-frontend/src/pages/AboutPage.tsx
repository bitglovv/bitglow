import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Shield, MessageCircle, Users, Cpu, Globe } from "lucide-react";
import { navigateBack } from "../utils/navigateBack";

export default function AboutPage() {
    useEffect(() => { document.title = "About BitGlow"; }, []);
    const navigate = useNavigate();

    const features = [
        {
            icon: <MessageCircle className="h-5 w-5" />,
            color: "bg-blue-500/15 text-blue-400",
            title: "Real-time Messaging",
            desc: "Instant direct messages and live group conversations powered by WebSockets.",
        },
        {
            icon: <Users className="h-5 w-5" />,
            color: "bg-purple-500/15 text-purple-400",
            title: "Social Connections",
            desc: "Follow friends, see their posts, and build your network organically.",
        },
        {
            icon: <Globe className="h-5 w-5" />,
            color: "bg-emerald-500/15 text-emerald-400",
            title: "Live Rooms",
            desc: "Join or host live audio/video rooms with friends and the community.",
        },
        {
            icon: <Shield className="h-5 w-5" />,
            color: "bg-orange-500/15 text-orange-400",
            title: "Privacy First",
            desc: "Private account mode, online status control, and account security tools built in.",
        },
        {
            icon: <Cpu className="h-5 w-5" />,
            color: "bg-rose-500/15 text-rose-400",
            title: "Modern Stack",
            desc: "Built with React, TypeScript, Node.js, Fastify, and PostgreSQL for reliability.",
        },
        {
            icon: <Zap className="h-5 w-5" />,
            color: "bg-yellow-500/15 text-yellow-400",
            title: "Lightning Fast",
            desc: "Optimized frontend with Vite and a lean backend on Render for snappy performance.",
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => navigateBack(navigate, "/settings")}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white transition hover:bg-white/[0.10] active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                            <Zap className="h-4 w-4 text-emerald-400" />
                        </div>
                        <h1 className="text-[18px] font-bold tracking-tight">About BitGlow</h1>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6 space-y-5">
                {/* Brand hero */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[80px]" />
                    </div>
                    <div className="relative">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-emerald-500/10">
                            <Zap className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">BitGlow</h2>
                        <p className="mt-3 text-sm leading-7 text-zinc-400">
                            A modern social platform built for real connections — posts, messages, live rooms, and a community that actually glows.
                        </p>
                    </div>
                </div>

                {/* Version badge */}
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                    <span className="text-sm font-semibold text-zinc-400">Version</span>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                        v1.0.0 · Production
                    </span>
                </div>

                {/* Features grid */}
                <div>
                    <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        What's inside
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.color}`}>
                                    {f.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{f.title}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-zinc-500">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tech stack */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Built With</p>
                    <div className="flex flex-wrap gap-2">
                        {["React 18", "TypeScript", "Vite", "Fastify", "Node.js", "PostgreSQL", "WebSockets", "Tailwind CSS", "JWT Auth"].map((tech) => (
                            <span
                                key={tech}
                                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
                    <p className="text-sm text-zinc-500">
                        Made with ♥ · Questions?{" "}
                        <a href="mailto:support@bitglow.app" className="text-white underline underline-offset-4 hover:text-emerald-400 transition">
                            support@bitglow.app
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}
