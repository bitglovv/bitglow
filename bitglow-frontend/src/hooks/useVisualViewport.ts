import { useEffect, useState } from "react";

interface ViewportState {
  height: number;
  offsetTop: number;
}

/**
 * Tracks the window.visualViewport height and offsetTop.
 * Essential for keeping fixed elements flush with the virtual keyboard on mobile browsers.
 */
export function useVisualViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;

    const update = () => {
      if (vv) {
        setViewport({
          height: vv.height,
          offsetTop: vv.offsetTop,
        });
      } else {
        setViewport({
          height: window.innerHeight,
          offsetTop: 0,
        });
      }
    };

    update();

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }
    window.addEventListener("resize", update);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  return viewport;
}
