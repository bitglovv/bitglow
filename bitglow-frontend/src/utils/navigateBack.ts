import type { NavigateFunction } from "react-router-dom";

type Fallback = string | (() => void);

function canGoBackOneStep(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;
  return window.history.length > 1;
}

/**
 * Prefer the real browser history entry (where the user came from).
 * Use `fallback` when there is no prior entry (e.g. first page in tab).
 */
export function navigateBack(navigate: NavigateFunction, fallback: Fallback) {
  if (canGoBackOneStep()) {
    navigate(-1);
    return;
  }
  if (typeof fallback === "function") {
    fallback();
    return;
  }
  navigate(fallback);
}
