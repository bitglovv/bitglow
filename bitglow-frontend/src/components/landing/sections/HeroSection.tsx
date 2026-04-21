import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
                <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(11,14,13,0.98)_0%,rgba(6,7,7,0.72)_42%,rgba(5,5,5,0)_78%)]" />
                <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,44,38,0.34)_0%,rgba(16,44,38,0.18)_30%,rgba(16,44,38,0.08)_54%,transparent_74%)] blur-[98px]" />
                <div
                    className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(247,231,206,0.12)_0%,rgba(247,231,206,0.05)_34%,transparent_72%)] blur-[42px] transition-transform duration-300 ease-out animate-glow"
                    style={orbStyle}
                />
                <div
                    className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(247,231,206,0.06)_0%,rgba(16,44,38,0.10)_38%,transparent_72%)] blur-[34px] transition-all duration-300 ease-out"
                    style={cursorLightStyle}
                />
            </div>

            <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <div
                    className="relative w-full max-w-xl text-center transition-transform duration-300 ease-out"
                    style={contentStyle}
                >
                    <div className="mx-auto h-px w-14 bg-gradient-to-r from-transparent via-[#F7E7CE]/18 to-transparent" />

                    <div className="mt-9">
                        <div className="text-brand-gradient animate-float text-6xl font-semibold tracking-[-0.095em] [text-shadow:0_0_30px_rgba(200,255,216,0.09)] sm:text-7xl md:text-[5.2rem]">
                            BitGlow
                        </div>
                    </div>

                    <p className="mt-6 text-lg font-medium tracking-[-0.025em] text-[#F7E7CE] sm:text-[1.35rem]">
                        Where every Bit Glows.
                    </p>

                    <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[rgba(247,231,206,0.6)] sm:text-base">
                        Premium realtime social infrastructure for modern apps.
                    </p>

                    <div
                        className="mt-12 flex flex-col items-center gap-3 transition-transform duration-300 ease-out sm:flex-row sm:justify-center"
                        style={buttonRowStyle}
                    >
                        <Link
                            to="/signup"
                            className="relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-[#F7E7CE] px-6 text-sm font-semibold text-[#102C26] shadow-[0_22px_48px_-24px_rgba(247,231,206,0.34)] transition duration-200 hover:-translate-y-[3px] hover:scale-[1.02] hover:brightness-[1.03] active:translate-y-[1px] sm:w-auto sm:min-w-[10rem]"
                        >
                            <span className="pointer-events-none absolute inset-x-6 top-2 h-5 rounded-full bg-white/35 blur-md" />
                            <span className="relative z-10">Sign up</span>
                        </Link>

                        <Link
                            to="/login"
                            className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#102C26] bg-transparent px-6 text-sm font-medium text-[#F7E7CE] shadow-[0_16px_34px_-24px_rgba(0,0,0,0.26)] transition duration-200 hover:-translate-y-[2px] hover:border-[#1b463c] hover:bg-[#102C26]/28 hover:shadow-[0_18px_38px_-24px_rgba(16,44,38,0.3)] active:translate-y-[1px] sm:w-auto sm:min-w-[10rem]"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
