import React from "react";

type Props = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white selection:bg-brand/30">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-[18%] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-emerald-300/6 blur-[180px]" />
                <div className="absolute inset-0 bg-mesh opacity-[0.015]" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    <div className="text-center">
                        {title ? (
                            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                                {title}
                            </h1>
                        ) : null}
                        {subtitle ? (
                            <p className="mt-3 text-sm leading-6 text-zinc-500 sm:text-base">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
