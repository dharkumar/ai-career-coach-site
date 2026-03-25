'use client';

import { useSpotlight } from "@/hooks/useSpotlight";

const PADDING = 0;
const RADIUS = 16;

/**
 * Tutorial highlight system — three visual layers:
 *
 * 1. **Overlay** (z-45) — full-screen dark tint with a rounded SVG mask
 *    cutout so the spotlight area is not darkened.
 * 2. **Spotlight shape** (z-50) — box-shadow glow that sits in the cutout,
 *    blending softly into the surrounding overlay.
 * 3. The **active section** itself (z-60, set by `sectionGlow` in
 *    ProfileSheet) renders crisp on top of both.
 *
 * Both layers derive position from the same `rect` and jump together
 * — no CSS transitions on position so they stay in sync.
 */
export function SpotlightOverlay({ activeId }: { activeId: string | null }) {
  const rect = useSpotlight(activeId);

  const w = rect ? rect.width + PADDING * 2 : 0;
  const h = rect ? rect.height + PADDING * 2 : 0;
  const x = rect ? rect.left - PADDING : 0;
  const y = rect ? rect.top - PADDING : 0;

  const svgMask = rect
    ? `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
          `<rect width='100%' height='100%' rx='${RADIUS}' ry='${RADIUS}' fill='black'/>` +
          `</svg>`,
      )}")`
    : "";

  const maskStyle: React.CSSProperties = rect
    ? {
        WebkitMaskImage: `linear-gradient(black, black), ${svgMask}`,
        maskImage: `linear-gradient(black, black), ${svgMask}`,
        WebkitMaskPosition: `0 0, ${x}px ${y}px`,
        maskPosition: `0 0, ${x}px ${y}px`,
        WebkitMaskSize: `100% 100%, ${w}px ${h}px`,
        maskSize: `100% 100%, ${w}px ${h}px`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskComposite: "destination-out",
        maskComposite: "exclude",
      }
    : {};

  return (
    <>
      {/* Dark overlay with cutout */}
      <div
        data-testid="spotlight-overlay"
        className="fixed inset-0 z-[45] transition-opacity duration-500 pointer-events-none"
        style={{
          backgroundColor: "var(--background-overlay)",
          opacity: activeId ? 1 : 0,
          ...maskStyle,
        }}
      />
      {/* Spotlight glow — visible in the cutout */}
      {rect && activeId && (
        <div
          data-testid="spotlight-shape"
          className="fixed z-[50] rounded-2xl pointer-events-none"
          style={{
            top: y,
            left: x,
            width: w,
            height: h,
            boxShadow: "0px 0px 18px 15px var(--spotlight-fill)",
          }}
        />
      )}
    </>
  );
}
