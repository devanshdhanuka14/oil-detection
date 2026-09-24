/**
 * Scripted camera. A move is a tween of the SVG viewBox and nothing else:
 * there is no pan or zoom handler anywhere in the app (CLAUDE.md §1.5).
 */
import type { Projection } from './projection';

export type ViewBox = { x: number; y: number; w: number; h: number };

export const fullView = (p: Projection): ViewBox => ({ x: 0, y: 0, w: p.size.w, h: p.size.h });

/** A view centred on a lat/lon, `spanKm` wide, clamped inside the scene. */
export function viewOn(p: Projection, lat: number, lon: number, spanKm: number): ViewBox {
  const c = p.project(lat, lon);
  const w = spanKm * p.unitsPerKm;
  const h = (w * p.size.h) / p.size.w;
  return {
    x: Math.max(0, Math.min(p.size.w - w, c.x - w / 2)),
    y: Math.max(0, Math.min(p.size.h - h, c.y - h / 2)),
    w,
    h,
  };
}

/** Linear blend between two views; `k` is the tweened value. */
export function lerpView(a: ViewBox, b: ViewBox, k: number): ViewBox {
  const m = (x: number, y: number) => x + (y - x) * k;
  return { x: m(a.x, b.x), y: m(a.y, b.y), w: m(a.w, b.w), h: m(a.h, b.h) };
}

export const vb = (v: ViewBox) => `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`;
