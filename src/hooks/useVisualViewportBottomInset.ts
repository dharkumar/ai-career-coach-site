import { useEffect } from "react";

/** CSS var on :root — overlap between layout viewport bottom and visual viewport (e.g. iOS Chrome toolbar). */
export const VV_BOTTOM_INSET_VAR = "--vv-bottom-inset";

/**
 * Pushes fixed bottom UI above browser chrome (tab bar, etc.) that `100svh` and
 * `safe-area-inset-bottom` do not always account for.
 */
export function useVisualViewportBottomInset(): void {
  useEffect(() => {
    const root = document.documentElement;
    const narrow = () => window.matchMedia("(max-width: 768px)").matches;

    const update = () => {
      const vv = window.visualViewport;
      const isNarrow = narrow();
      /** When visualViewport under-reports, a modest floor on phones — avoid stacking with safe-area in BaseLayout. */
      const minChrome = isNarrow ? 10 : 0;

      if (vv) {
        const layoutH = document.documentElement.clientHeight;
        const overlap = layoutH - vv.offsetTop - vv.height;
        let px = Math.max(0, Math.round(overlap));
        if (isNarrow && px < minChrome) px = minChrome;
        root.style.setProperty(VV_BOTTOM_INSET_VAR, `${px}px`);
        return;
      }

      root.style.setProperty(VV_BOTTOM_INSET_VAR, isNarrow ? `${minChrome}px` : "0px");
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty(VV_BOTTOM_INSET_VAR);
    };
  }, []);
}
