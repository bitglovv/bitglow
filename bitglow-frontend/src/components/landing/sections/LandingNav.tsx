import { Link } from "react-router-dom";

export function LandingNav() {
    return (
        <header className="relative z-10">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                <Link to="/" className="group flex items-center">
                    <span className="text-brand-gradient text-lg font-semibold tracking-[-0.09em] [text-shadow:0_0_18px_rgba(200,255,216,0.08)] transition duration-300 group-hover:brightness-110 sm:text-[1.35rem]">
                        BitGlow
                    </span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        to="/login"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-brand/40 px-4 text-sm font-medium text-brand transition duration-200 hover:bg-brand/10 hover:border-brand/60"
                    >
                        Log in
                    </Link>

                    <Link
                        to="/signup"
                        className="hidden sm:inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-black shadow-lg shadow-brand/20 transition duration-200 hover:-translate-y-[1px] hover:brightness-[1.03] active:translate-y-[1px] sm:px-5"
                    >
                        Sign up
                    </Link>
                </div>
            </div>
        </header>
    );
}
