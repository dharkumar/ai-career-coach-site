export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Iteratively nudge overlapping rectangles apart while keeping them
 * within the given container bounds.  Designed for floating bubble
 * layouts that start from a "random-looking" seed position.
 *
 * Wide bubbles that can't fit side-by-side are always separated
 * vertically so nothing gets clipped off the screen edge.
 */
export function resolveCollisions(
  rects: LayoutRect[],
  containerW: number,
  containerH: number,
  options?: {
    padding?: number;
    iterations?: number;
    minY?: number;
    maxY?: number;
  },
): LayoutRect[] {
  const {
    padding = 8,
    iterations = 12,
    minY = 0,
    maxY = containerH,
  } = options ?? {};

  const out = rects.map((r) => ({ ...r }));

  const clamp = () => {
    for (const r of out) {
      r.x = Math.max(padding, Math.min(r.x, containerW - r.w - padding));
      r.y = Math.max(minY, Math.min(r.y, maxY - r.h - padding));
    }
  };

  clamp();

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];

        const ox =
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + padding;
        const oy =
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + padding;

        if (ox <= 0 || oy <= 0) continue;

        const canFitHorizontally =
          a.w + b.w + padding * 3 <= containerW;

        if (canFitHorizontally && ox < oy) {
          const shift = ox / 2;
          if (a.x + a.w / 2 <= b.x + b.w / 2) {
            a.x -= shift;
            b.x += shift;
          } else {
            a.x += shift;
            b.x -= shift;
          }
        } else {
          const shift = oy / 2;
          if (a.y + a.h / 2 <= b.y + b.h / 2) {
            a.y -= shift;
            b.y += shift;
          } else {
            a.y += shift;
            b.y -= shift;
          }
        }
      }
    }

    clamp();
  }

  return out;
}
