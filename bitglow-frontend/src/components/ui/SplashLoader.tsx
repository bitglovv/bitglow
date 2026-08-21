import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import bitglowLogo from "../../assets/icons/bitglow.png";

// ─── Constants ──────────────────────────────────────────────────────────────

const SPLASH_KEY = "bitglow_splash_shown";

/** Minimum time the splash stays visible for smooth branding. */
const MIN_VISIBLE_MS = 750;

/** Duration of the CSS fade-out transition (must match globals.css). */
const FADE_OUT_MS = 400;

/** Absolute safety net — splash never stays longer than this regardless. */
const MAX_VISIBLE_MS = 4_000;

// ─── Session-storage gate (called once per module evaluation) ────────────────

/**
 * Returns true if the splash should be shown on this page load.
 * Sets the sessionStorage key so subsequent calls (refresh, SPA navigation)
 * return false. The key is cleared when the tab closes, so a new tab always
 * shows the splash once.
 */
function consumeSplashToken(): boolean {
    try {
        if (sessionStorage.getItem(SPLASH_KEY)) return false;
        sessionStorage.setItem(SPLASH_KEY, "true");
        return true;
    } catch {
        // Private-browsing / storage blocked — skip splash silently.
        return false;
    }
}

// ─── Pure visual overlay ─────────────────────────────────────────────────────

interface SplashLoaderProps {
    /**
     * Controls visibility. When false the overlay fades out and calls
     * onExited after FADE_OUT_MS to give the parent time to unmount it.
     */
    visible: boolean;
    onExited: () => void;
}

/**
 * A pure visual component — owns no timing or auth logic.
 * Renders the BitGlow logo and three sequentially blinking dots.
 * Fades in on mount; fades out when `visible` becomes false.
 */
export function SplashLoader({ visible, onExited }: SplashLoaderProps) {
    // Always keep the latest onExited in a ref so the timeout closure stays fresh.
    const onExitedRef = useRef(onExited);
    onExitedRef.current = onExited;

    useEffect(() => {
        if (visible) return;
        // Use a guaranteed setTimeout rather than onTransitionEnd which can be
        // unreliable (suppressed by hidden iframes, reduced-motion, etc.).
        const t = setTimeout(() => onExitedRef.current(), FADE_OUT_MS + 50);
        return () => clearTimeout(t);
    }, [visible]);

    return (
        <div className="splash-overlay" data-visible={visible} role="status" aria-label="Loading BitGlow">
            <div className="splash-inner">
                <img
                    src={bitglowLogo}
                    alt="BitGlow"
                    className="splash-logo"
                    draggable={false}
                />

                <div className="splash-dots" aria-hidden="true">
                    {([0, 1, 2] as const).map((i) => (
                        <span
                            key={i}
                            className="splash-dot"
                            style={{ animationDelay: `${i * 267}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Controller ──────────────────────────────────────────────────────────────

type Phase =
    | "splash"   // splash is fully visible, waiting for conditions
    | "fading"   // fade-out in progress
    | "done";    // splash unmounted, router renders normally

/**
 * Shows <SplashLoader> exactly once per browser-tab session.
 *
 * MUST be rendered inside <AuthProvider> so it can read isAuthLoading.
 *
 * Dismissal logic:
 *   - waits until BOTH: auth initialization completes + MIN_VISIBLE_MS has elapsed
 *   - then starts the fade-out (phase → "fading")
 *   - after FADE_OUT_MS the overlay is unmounted (phase → "done") and children render
 *   - a MAX_VISIBLE_MS safety net prevents the splash from ever getting stuck
 */
export function SplashScreen({ children }: { children: React.ReactNode }) {
    const { isAuthLoading } = useAuth();

    // Evaluated once in the useState initializer — never re-evaluated on re-render.
    const [needsSplash] = useState<boolean>(() => consumeSplashToken());

    const [phase, setPhase] = useState<Phase>(needsSplash ? "splash" : "done");

    // Mutable refs track conditions without causing extra renders or stale closures.
    const minTimerDone = useRef(false);
    const authDone = useRef(!isAuthLoading);
    const dismissed = useRef(false);

    /**
     * Attempts to dismiss the splash. Safe to call multiple times;
     * the dismissed ref makes it idempotent.
     */
    const tryDismissRef = useRef<() => void>(() => { /* no-op until defined */ });
    const tryDismiss = (): void => {
        if (dismissed.current) return;
        if (!minTimerDone.current || !authDone.current) return;
        dismissed.current = true;
        setPhase("fading");
    };
    // Always keep ref up to date so timer callbacks see latest closure.
    tryDismissRef.current = tryDismiss;

    // ── Minimum display timer ──────────────────────────────────────────────
    useEffect(() => {
        if (!needsSplash) return;
        const t = setTimeout(() => {
            minTimerDone.current = true;
            tryDismissRef.current();
        }, MIN_VISIBLE_MS);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Auth ready watcher ────────────────────────────────────────────────
    useEffect(() => {
        if (!needsSplash) return;
        if (!isAuthLoading) {
            authDone.current = true;
            tryDismissRef.current();
        }
    }, [isAuthLoading, needsSplash]);

    // ── Absolute safety net (prevents any stuck state) ────────────────────
    useEffect(() => {
        if (!needsSplash) return;
        const t = setTimeout(() => {
            minTimerDone.current = true;
            authDone.current = true;
            tryDismissRef.current();
        }, MAX_VISIBLE_MS);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <>
            {children}
            {phase !== "done" && (
                <SplashLoader
                    visible={phase === "splash"}
                    onExited={() => setPhase("done")}
                />
            )}
        </>
    );
}
