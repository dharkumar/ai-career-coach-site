import { useLayoutEffect, useRef, useState, useCallback } from "react";
import {
  resolveCollisions,
  type LayoutRect,
} from "@/utils/resolveCollisions";

interface UseBubbleLayoutOptions {
  labels: string[];
  verticalZone?: { minPct: number; maxPct: number };
  padding?: number;
}

function labelHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h & 0x7fffffff) / 0x7fffffff;
}

/**
 * Arrange bubbles in a Figma-style zigzag: each "row" has up to two
 * bubbles — one hugging the left edge, one hugging the right — with
 * small seeded-random margins so it looks organic, not gridded.
 *
 * When two bubbles are too wide to share a row they stack vertically.
 */
function computeZigzag(
  labels: string[],
  widths: number[],
  heights: number[],
  containerW: number,
  maxY: number,
  padding: number,
): LayoutRect[] {
  const count = labels.length;
  if (count === 0) return [];

  const bubbleH = Math.max(...heights);
  const pairYShift = count > 8 ? 32 : 20;
  const rowGap = count > 8 ? 32 : 24;

  const rects: LayoutRect[] = [];
  let y = 0;
  let i = 0;

  while (i < count) {
    const lSeed = labelHash(labels[i]);
    const lMargin = padding + lSeed * containerW * 0.08;

    rects[i] = { x: lMargin, y, w: widths[i], h: heights[i] };

    if (i + 1 < count) {
      const rSeed = labelHash(labels[i + 1]);
      const rMargin = padding + rSeed * containerW * 0.08;
      const rx = containerW - widths[i + 1] - rMargin;
      const leftRightEdge = lMargin + widths[i] + padding * 2;

      if (rx >= leftRightEdge) {
        rects[i + 1] = {
          x: rx,
          y: y + pairYShift,
          w: widths[i + 1],
          h: heights[i + 1],
        };
        y += bubbleH + pairYShift + rowGap;
        i += 2;
      } else {
        y += bubbleH + rowGap;
        rects[i + 1] = {
          x: containerW - widths[i + 1] - rMargin,
          y,
          w: widths[i + 1],
          h: heights[i + 1],
        };
        y += bubbleH + rowGap;
        i += 2;
      }
    } else {
      y += bubbleH + rowGap;
      i++;
    }
  }

  const totalH = y - rowGap;
  const offsetY = Math.max(0, maxY - totalH - padding);

  for (const r of rects) r.y += offsetY;

  return rects;
}

/**
 * Measures rendered bubble elements, then arranges them in a
 * Figma-faithful zigzag so every bubble stays visible, non-overlapping,
 * and inside the container.
 *
 * Returns **pixel** positions [leftPx, topPx] so the components can
 * set `left` and `top` directly — no percentage conversion, no
 * translateX(-50%).
 *
 * Uses a callback ref for the container so measurement re-runs even
 * when the container mounts after the hook (e.g. gated by `ready`).
 */
export function useBubbleLayout({
  labels,
  verticalZone = { minPct: 55, maxPct: 88 },
  padding = 8,
}: UseBubbleLayoutOptions) {
  const containerEl = useRef<HTMLDivElement | null>(null);
  const bubbleEls = useRef(new Map<string, HTMLElement>());
  const [resolved, setResolved] = useState<[number, number][] | null>(null);
  const [mounted, setMounted] = useState(false);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    const prev = containerEl.current;
    containerEl.current = el;
    if (el && !prev) setMounted(true);
    else if (!el && prev) setMounted(false);
  }, []);

  const setBubbleRef = useCallback(
    (label: string, el: HTMLElement | null) => {
      if (el) bubbleEls.current.set(label, el);
      else bubbleEls.current.delete(label);
    },
    [],
  );

  const labelsKey = labels.join("\0");

  useLayoutEffect(() => {
    const container = containerEl.current;
    if (!container || labels.length === 0) {
      setResolved(null);
      return;
    }

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    if (cw === 0 || ch === 0) return;

    const minY = (verticalZone.minPct / 100) * ch;
    const maxY = (verticalZone.maxPct / 100) * ch;

    const widths = labels.map(
      (l) => bubbleEls.current.get(l)?.offsetWidth ?? 140,
    );
    const heights = labels.map(
      (l) => bubbleEls.current.get(l)?.offsetHeight ?? 48,
    );

    const rects = computeZigzag(
      labels,
      widths,
      heights,
      cw,
      maxY,
      padding,
    );

    const safe = resolveCollisions(rects, cw, ch, {
      padding: labels.length > 8 ? 12 : padding,
      iterations: labels.length > 8 ? 12 : 6,
      minY,
      maxY,
    });

    setResolved(safe.map((r) => [r.x, r.y]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsKey, padding, verticalZone.minPct, verticalZone.maxPct, mounted]);

  const fallback: [number, number][] = labels.map(() => [0, 0]);

  return {
    containerRef,
    setBubbleRef,
    positions: resolved ?? fallback,
    ready: resolved !== null,
  };
}
