import { Link } from "react-router-dom";

export function LandingFooter() {
    return (
        <footer className="relative z-10">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 pb-6 pt-4 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link to="/privacy" className="transition duration-200 hover:text-zinc-300">
                        Privacy
                    </Link>
                    <span className="text-zinc-700">&bull;</span>
                    <Link to="/terms" className="transition duration-200 hover:text-zinc-300">
                        Terms
                    </Link>
                    <span className="text-zinc-700">&bull;</span>
                    <Link to="/contact" className="transition duration-200 hover:text-zinc-300">
                        Contact
                    </Link>
                </div>
                <div>&copy; 2026 BitGlow</div>
            </div>
        </footer>
    );
}
