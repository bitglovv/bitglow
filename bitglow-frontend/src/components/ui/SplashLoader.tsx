import { useEffect, useState } from "react";
import bitglowLogo from "../../assets/icons/bitglow.png";

const SPLASH_KEY = "bitglow_splash_shown";

/**
 * Returns true if the splash should be shown on this page load.
 * Uses sessionStorage so it fires only once per browser tab/window.
 * sessionStorage is cleared when the tab is closed, so re-opening
 * BitGlow in a fresh tab will always trigger the splash.
 */
function shouldShowSplash(): boolean {
    try {
        if (sessionStorage.getItem(SPLASH_KEY)) return false;
        sessionStorage.setItem(SPLASH_KEY, "true");
        return true;
    } catch {
        // Privacy mode / storage blocked — skip splash silently
        return false;
    }
}

interface SplashLoaderProps {
    /** Called once the exit animation completes so the parent can unmount */
    onDone: () => void;
}

export function SplashLoader({ onDone }: SplashLoaderProps) {
    const [phase, setPhase] = useState<"in" | "out">("in");

    useEffect(() => {
        // Fade in 400 ms → hold 1 100 ms → fade out 500 ms (total ≈ 2 s)
        const holdTimer = setTimeout(() => setPhase("out"), 1_500);
        return () => clearTimeout(holdTimer);
    }, []);

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        // Only trigger on the opacity transition of the root element
        if (phase === "out" && e.propertyName === "opacity") {
            onDone();
        }
    };

    return (
        <div
            className="splash-loader"
            data-phase={phase}
            onTransitionEnd={handleTransitionEnd}
            aria-label="BitGlow loading"
            role="status"
        >
            <div className="splash-content">
                {/* Logo */}
                <img
                    src={bitglowLogo}
                    alt="BitGlow logo"
                    className="splash-logo"
                    draggable={false}
                />

                {/* Brand name */}
                <p className="splash-brand-name">BitGlow</p>

                {/* Sequential animated dots */}
                <div className="splash-dots" aria-hidden="true">
                    <span className="splash-dot" style={{ animationDelay: "0ms" }} />
                    <span className="splash-dot" style={{ animationDelay: "200ms" }} />
                    <span className="splash-dot" style={{ animationDelay: "400ms" }} />
                </div>
            </div>
        </div>
    );
}

/**
 * Wraps the app and shows <SplashLoader> exactly once per browser-tab session.
 * After the splash exit animation completes the children become fully visible.
 * Auth and routing initialise silently in the background during the splash.
 */
export function SplashScreen({ children }: { children: React.ReactNode }) {
    const [showSplash, setShowSplash] = useState<boolean>(() => shouldShowSplash());

    if (!showSplash) return <>{children}</>;

    return (
        <>
            <SplashLoader onDone={() => setShowSplash(false)} />
            {/*
             * Mount children behind the splash so auth + routing initialise
             * silently in the background — zero extra delay once splash exits.
             */}
            <div
                aria-hidden="true"
                style={{ visibility: "hidden", position: "fixed", inset: 0, pointerEvents: "none" }}
            >
                {children}
            </div>
        </>
    );
}
