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
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[#102C26] px-4 text-sm font-medium text-[#F7E7CE] transition duration-200 hover:bg-[#102C26]/28 hover:text-[#F7E7CE]"
                    >
                        Log in
                    </Link>

                    <Link
                        to="/signup"
                        className="inline-flex h-10 items-center justify-center rounded-full bg-[#F7E7CE] px-4 text-sm font-semibold text-[#102C26] shadow-[0_16px_36px_-26px_rgba(247,231,206,0.45)] transition duration-200 hover:-translate-y-[1px] hover:brightness-[1.03] active:translate-y-[1px] sm:px-5"
                    >
                        Sign up
                    </Link>
                </div>
            </div>
        </header>
    );
}
