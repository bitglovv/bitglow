import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type ParallaxState = {
    x: number;
    y: number;
};

const INITIAL_PARALLAX: ParallaxState = { x: 0, y: 0 };

export function HeroSection() {
    const [isDesktopMotion, setIsDesktopMotion] = useState(false);
    const [parallax, setParallax] = useState<ParallaxState>(INITIAL_PARALLAX);

    useEffect(() => {
        const media = window.matchMedia("(hover: hover) and (pointer: fine)");
        const update = () => setIsDesktopMotion(media.matches);

        update();
        media.addEventListener("change", update);

        return () => media.removeEventListener("change", update);
    }, []);

    const handlePointerMove = (event: React.MouseEvent<HTMLElement>) => {
        if (!isDesktopMotion) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        setParallax({ x, y });
    };

    const resetParallax = () => setParallax(INITIAL_PARALLAX);

    const backgroundStyle = isDesktopMotion
        ? {
              transform: `translate(${parallax.x * -4}px, ${parallax.y * -4}px)`,
          }
        : undefined;

    const orbStyle = isDesktopMotion
        ? {
              transform: `translate(${parallax.x * -7}px, ${parallax.y * -7}px)`,
          }
        : undefined;

    const contentStyle = isDesktopMotion
        ? {
              transform: `translate(${parallax.x * -8}px, ${parallax.y * -8}px)`,
          }
        : undefined;

    const buttonRowStyle = isDesktopMotion
        ? {
              transform: `translate(${parallax.x * -10}px, ${parallax.y * -10}px)`,
          }
        : undefined;

    const cursorLightStyle = isDesktopMotion
        ? {
              transform: `translate(calc(-50% + ${parallax.x * 22}px), calc(-50% + ${parallax.y * 22}px))`,
              opacity: 0.45,
          }
        : { opacity: 0 };

    return (
        <section
            className="relative flex flex-1 items-center overflow-hidden"
            onMouseMove={handlePointerMove}
            onMouseLeave={resetParallax}
        >
            <div
                className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
                style={backgroundStyle}
            >
                <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(17,24,21,0.95)_0%,rgba(15,19,17,0.72)_34%,rgba(5,5,5,0)_78%)]" />
                <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,255,216,0.14)_0%,rgba(126,231,168,0.11)_24%,rgba(39,67,58,0.10)_48%,transparent_74%)] blur-[92px]" />
                <div
                    className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,rgba(200,255,216,0.10)_34%,transparent_70%)] blur-[42px] transition-transform duration-300 ease-out animate-glow"
                    style={orbStyle}
                />
                <div
                    className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.10)_0%,rgba(126,231,168,0.04)_40%,transparent_72%)] blur-[34px] transition-all duration-300 ease-out"
                    style={cursorLightStyle}
                />
            </div>

            <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div
                    className="relative w-full max-w-md text-center transition-transform duration-300 ease-out"
                    style={contentStyle}
                >
                    <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                    <div className="mt-8">
                        <div className="text-brand-gradient animate-float text-6xl font-semibold tracking-[-0.08em] [text-shadow:0_0_30px_rgba(200,255,216,0.10)] sm:text-7xl">
                            BitGlow
                        </div>
                    </div>

                    <p className="mt-5 text-lg font-medium tracking-[-0.02em] text-zinc-300/92 sm:text-xl">
                        Where every Bit Glows.
                    </p>

                    <p className="mt-4 text-sm leading-6 text-zinc-500 sm:text-base">
                        Realtime infrastructure for modern apps.
                    </p>

                    <div
                        className="mt-10 flex flex-col gap-3 transition-transform duration-300 ease-out"
                        style={buttonRowStyle}
                    >
                        <Link
                            to="/signup"
                            className="relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white shadow-[0_22px_48px_-24px_rgba(126,231,168,0.44)] transition duration-200 hover:-translate-y-[3px] hover:scale-[1.02] hover:brightness-110 active:translate-y-[1px]"
                        >
                            <span className="pointer-events-none absolute inset-x-6 top-2 h-5 rounded-full bg-white/18 blur-md" />
                            <span className="relative z-10">Sign up</span>
                            <ArrowRight className="relative z-10 h-4 w-4" />
                        </Link>

                        <Link
                            to="/login"
                            className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-6 text-sm font-medium text-white shadow-[0_16px_34px_-24px_rgba(255,255,255,0.18)] transition duration-200 hover:-translate-y-[2px] hover:border-emerald-200/16 hover:bg-white/[0.06] hover:shadow-[0_18px_38px_-24px_rgba(200,255,216,0.24)] active:translate-y-[1px]"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
