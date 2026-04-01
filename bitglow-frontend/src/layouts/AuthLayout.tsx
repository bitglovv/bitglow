import React from "react";
import { Zap } from "lucide-react";
import { Card } from "../components/ui/Card";

type Props = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans overflow-x-hidden relative selection:bg-brand/30">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -left-1/4 -top-1/4 w-1/2 h-1/2 rounded-full bg-brand/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute -right-1/4 -bottom-1/4 w-1/2 h-1/2 rounded-full bg-brand/5 blur-[100px] animate-pulse-slow delay-1000" />
                <div className="absolute inset-0 bg-mesh opacity-[0.02]" />
            </div>

            <div className="relative z-10 w-full max-w-lg mx-4">
                <Card variant="glass" padding="lg" className="border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col items-center mb-10">
                        {/* Logo */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full group-hover:bg-brand/30 transition-all duration-500" />
                            <div className="relative w-16 h-16 rounded-[22px] bg-brand/10 border border-brand/20 flex items-center justify-center backdrop-blur-md">
                                <Zap className="w-8 h-8 text-brand fill-brand/20 animate-glow" />
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <h1 className="text-3xl font-bold tracking-tight mb-2">
                                {title || "BitGlow"}
                            </h1>
                            {subtitle && (
                                <p className="text-zinc-500 text-sm font-medium">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {children}

                    <div className="mt-10 text-center">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-700 font-bold">
                            BitGlow vNext • Secure Chat Interface
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

