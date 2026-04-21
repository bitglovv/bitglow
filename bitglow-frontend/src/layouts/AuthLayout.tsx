import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate("/");
    };

    return (
        <div className="relative h-[100svh] overflow-hidden bg-[#050505] font-sans text-white selection:bg-brand/30">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-[10%] h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-[#102C26]/40 blur-[160px]" />
                <div className="absolute inset-0 bg-mesh opacity-[0.01]" />
            </div>

            <div className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white transition duration-200 hover:-translate-y-[1px] hover:bg-white/[0.04] active:translate-y-[1px]"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-12 w-12" />
            </div>

            <div className="relative z-10 flex h-[calc(100svh-5rem)] items-center justify-center px-4 pb-6 pt-2">
                <div className="w-full max-w-md">
                    <div className="text-center">
                        {title ? (
                            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {title}
                            </h1>
                        ) : null}
                        {subtitle ? (
                            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-6">{children}</div>
                </div>
            </div>
        </div>
    );
}
