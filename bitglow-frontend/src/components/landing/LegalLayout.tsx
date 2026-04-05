import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

type LegalLayoutProps = {
    title: string;
    description: string;
    children: ReactNode;
};

export function LegalLayout({ title, description, children }: LegalLayoutProps) {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-emerald-300/8 blur-[150px]" />
                <div className="absolute inset-0 bg-mesh opacity-[0.02]" />
            </div>

            <div className="relative z-10">
                <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                    <Link to="/" className="group flex items-center gap-3">
                        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
                            <div className="absolute inset-0 bg-brand-gradient opacity-55" />
                            <div className="absolute inset-[1px] rounded-[15px] bg-zinc-950" />
                            <Zap className="relative z-10 h-4.5 w-4.5 text-white" />
                        </div>
                        <span className="text-sm font-semibold tracking-[0.02em] text-white sm:text-base">
                            BitGlow
                        </span>
                    </Link>

                    <Link
                        to="/"
                        className="text-sm font-medium text-zinc-400 transition hover:text-white"
                    >
                        Back
                    </Link>
                </header>

                <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
                    <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-6 sm:p-8">
                        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                            {title}
                        </h1>
                        <p className="mt-4 text-base leading-7 text-zinc-400">
                            {description}
                        </p>
                        <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-300">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
