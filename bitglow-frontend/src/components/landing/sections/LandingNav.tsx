import { Link } from "react-router-dom";

export function LandingNav() {
    return (
        <header className="relative z-10">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div className="absolute inset-x-4 top-2 -z-10 h-12 rounded-full bg-white/[0.02] backdrop-blur-xl sm:inset-x-6 lg:inset-x-8" />
                <Link to="/" className="group flex items-center gap-3">
                    <span className="text-brand-gradient text-lg font-semibold tracking-[-0.075em] [text-shadow:0_0_24px_rgba(200,255,216,0.12)] transition duration-300 group-hover:brightness-110 sm:text-xl">
                        BitGlow
                    </span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        to="/login"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.02] px-4 text-sm font-medium text-zinc-300 shadow-[0_10px_24px_-22px_rgba(255,255,255,0.4)] transition duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
                    >
                        Log in
                    </Link>

                    <Link
                        to="/signup"
                        className="relative inline-flex h-10 items-center justify-center overflow-hidden rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(126,231,168,0.42)] transition duration-200 hover:-translate-y-[2px] hover:scale-[1.01] hover:brightness-110 active:translate-y-[1px] sm:px-5"
                    >
                        <span className="pointer-events-none absolute inset-x-4 top-1.5 h-4 rounded-full bg-white/18 blur-sm" />
                        <span className="relative z-10">Sign up</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
