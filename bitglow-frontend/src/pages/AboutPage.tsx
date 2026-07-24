import { useEffect } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function AboutPage() {
    useEffect(() => {
        document.title = `About · ${SUPPORT_CONFIG.appName}`;
    }, []);

    return (
        <SupportLayout title="About BitGlow">
            <p className="text-sm leading-relaxed text-zinc-300">
                BitGlow is a social platform for real-time connection — messaging, Live Spaces, and sharing
                updates with friends in a fast, private environment.
            </p>

            <section className="space-y-2">
                <h2 className="text-sm font-bold text-white">Our Mission</h2>
                <p className="text-sm leading-relaxed text-zinc-300">
                    We built BitGlow because online social spaces should feel human and genuine. Whether you
                    are exchanging direct messages, joining audio/video Live Spaces, or sharing updates,
                    BitGlow provides a reliable environment without intrusive tracking or sellable data.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-bold text-white">Features</h2>
                <ul className="space-y-2 text-sm text-zinc-300">
                    {SUPPORT_CONFIG.features.map((feature) => (
                        <li key={feature.title}>
                            <span className="font-semibold text-white">{feature.title}</span>
                            {" — "}
                            {feature.desc}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-bold text-white">Technology</h2>
                <p className="text-sm leading-relaxed text-zinc-300">
                    BitGlow uses a decoupled SPA architecture, WebSocket communication, and a Fastify/PostgreSQL
                    backend.
                </p>
                <div className="flex flex-wrap gap-2">
                    {SUPPORT_CONFIG.techStack.map((tech) => (
                        <span
                            key={tech}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300"
                        >
                            {tech}
                        </span>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-bold text-white">Roadmap</h2>
                <ul className="space-y-2 text-sm text-zinc-300">
                    {SUPPORT_CONFIG.roadmap.map((item) => (
                        <li key={item.version}>
                            <span className="font-semibold text-white">{item.version}</span>
                            {" · "}
                            {item.title}
                            {" · "}
                            {item.target}
                            {" · "}
                            {item.status}
                        </li>
                    ))}
                </ul>
            </section>

            <p className="text-xs text-zinc-500">
                BitGlow v{SUPPORT_CONFIG.appVersion} · Released {SUPPORT_CONFIG.releaseDate} · Build{" "}
                {SUPPORT_CONFIG.buildNumber}
            </p>
        </SupportLayout>
    );
}
