import React, { useEffect } from "react";
import { Zap, MessageCircle, Users, Video, Shield, Cpu, Sparkles, Code2, Globe, Heart } from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportCard } from "../components/support/SupportCard";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function AboutPage() {
    useEffect(() => {
        document.title = `About ${SUPPORT_CONFIG.appName} · Support Center`;
    }, []);

    const iconMap: Record<string, React.ReactNode> = {
        MessageCircle: <MessageCircle className="h-5 w-5 text-blue-400" />,
        Users: <Users className="h-5 w-5 text-purple-400" />,
        Video: <Video className="h-5 w-5 text-emerald-400" />,
        Shield: <Shield className="h-5 w-5 text-orange-400" />,
        Cpu: <Cpu className="h-5 w-5 text-rose-400" />,
        Zap: <Zap className="h-5 w-5 text-yellow-400" />,
    };

    return (
        <SupportLayout title="About BitGlow">
            {/* Brand Hero */}
            <SupportHero
                badge={`v${SUPPORT_CONFIG.appVersion} · ${SUPPORT_CONFIG.environment}`}
                badgeColor="emerald"
                title="A Community That Glows"
                description="BitGlow is a next-generation social platform designed for real-time connection. Built with modern web technologies, private-first security, and high-performance streaming."
                icon={<Zap className="h-8 w-8 text-emerald-400" />}
            />

            {/* Mission Statement */}
            <SupportCard
                title="Our Mission"
                subtitle="Reinventing digital connection without algorithms that divide."
                icon={<Sparkles className="h-5 w-5 text-emerald-400" />}
            >
                <p className="text-sm leading-relaxed text-zinc-300">
                    We built BitGlow because online social spaces should feel human, instantaneous, and genuine. 
                    Whether you are exchanging direct messages, joining interactive audio/video Live Spaces, 
                    or sharing updates with friends, BitGlow provides a fast, reliable, and secure environment without intrusive tracking or sellable data.
                </p>
            </SupportCard>

            {/* Core Features Grid */}
            <div>
                <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Core Platform Features
                </p>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {SUPPORT_CONFIG.features.map((feature, idx) => (
                        <SupportCard key={idx} headerBorder={false} className="p-1">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10">
                                    {iconMap[feature.iconName] || <Zap className="h-5 w-5 text-emerald-400" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{feature.desc}</p>
                                </div>
                            </div>
                        </SupportCard>
                    ))}
                </div>
            </div>

            {/* Engineering & Technology Matrix */}
            <SupportCard
                title="Architected For Scale"
                subtitle="Production technology stack & standards"
                icon={<Code2 className="h-5 w-5 text-blue-400" />}
            >
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-zinc-300">
                        BitGlow is built with zero compromise on engineering standards. Utilizing a decoupled SPA architecture, 
                        WebSocket full-duplex communication, and a robust Fastify/PostgreSQL backend.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                        {SUPPORT_CONFIG.techStack.map((tech) => (
                            <span
                                key={tech}
                                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </SupportCard>

            {/* Product Roadmap / Coming Soon */}
            <SupportCard
                title="Product Roadmap"
                subtitle="What's coming next to BitGlow"
                icon={<Globe className="h-5 w-5 text-purple-400" />}
            >
                <div className="space-y-3">
                    {SUPPORT_CONFIG.roadmap.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs"
                        >
                            <div>
                                <span className="font-mono text-emerald-400 font-bold mr-2">{item.version}</span>
                                <span className="font-bold text-white">{item.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                                <span>{item.target}</span>
                                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </SupportCard>

            {/* Version & Build Metadata */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-center sm:flex sm:items-center sm:justify-between text-xs">
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                    <Heart className="h-4 w-4 text-rose-400 fill-rose-400/20" />
                    <span>BitGlow v{SUPPORT_CONFIG.appVersion} · Released {SUPPORT_CONFIG.releaseDate}</span>
                </div>
                <div className="mt-2 sm:mt-0 text-zinc-500 font-mono">
                    Build {SUPPORT_CONFIG.buildNumber}
                </div>
            </div>
        </SupportLayout>
    );
}
