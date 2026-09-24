/**
 * 612 AIS tracks on Canvas 2D (CLAUDE.md §3).
 *
 * Colours per spec 3 §9: grey at 35% for a normal track, dimming to 10% once
 * eliminated; teal for a candidate; magenta and thicker for the leader.
 */
import { useEffect, useRef } from 'react';
import type { AisSet, TrackGroup } from '../../lib/generators/aisTracks';
import type { Projection } from '../../map/projection';
import { alpha, color } from '../../theme/tokens';

export function AisCanvas({
  set,
  p,
  width,
  height,
  /** Groups eliminated so far; their tracks dim to 10%. */
  eliminated,
  /** Track ids currently inside the search circle. */
  inCircle,
  leaderId,
  highlightId,
  showCandidates,
  reveal = 1,
}: {
  set: AisSet;
  p: Projection;
  width: number;
  height: number;
  eliminated: Set<TrackGroup>;
  inCircle?: Set<string>;
  leaderId?: string | null;
  highlightId?: string | null;
  showCandidates: boolean;
  /** 0-1: how much of the fleet has drawn on. */
  reveal?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // Draw eliminated first, candidates over them, leader last.
    const order = [...set.all].sort((a, b) => rank(a.group) - rank(b.group));
    const shownCount = Math.ceil(order.length * Math.max(0, Math.min(1, reveal)));

    for (const t of order.slice(0, shownCount)) {
      const isLeader = t.id === leaderId;
      const isCand = t.group === 'cand' && showCandidates;
      const dim = eliminated.has(t.group);
      const glow = inCircle?.has(t.id);

      let stroke: string = color.aisTrack;
      let a: number = alpha.aisTrack;
      let w = 1;

      if (dim) a = alpha.aisTrackEliminated;
      if (isCand) {
        // All 38 candidates pass within a couple of nm of the same short path,
        // so drawing them all at full strength is an unreadable starburst.
        // They stay teal but quiet; being *in the circle now* is what burns.
        stroke = color.candidate;
        a = 0.4;
        w = 1;
      }
      if (glow) {
        stroke = color.candidate;
        a = 1;
        w = 2;
      }
      if (isLeader) {
        stroke = color.leader;
        a = 1;
        w = 2.6;
      }
      if (t.id === highlightId) {
        a = 1;
        w = Math.max(w, 2.4);
      }

      ctx.strokeStyle = stroke;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      t.samples.forEach(([, lat, lon], i) => {
        const q = p.project(lat, lon);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [set, p, width, height, eliminated, inCircle, leaderId, highlightId, showCandidates, reveal]);

  return <canvas ref={ref} width={width} height={height} className="ais-canvas" />;
}

const rank = (g: TrackGroup) => (g === 'cand' ? 2 : 1);

/** Hit-test a click to the nearest track, so any track opens its card. */
export function pickTrack(set: AisSet, p: Projection, x: number, y: number, maxPx = 12): string | null {
  let best: string | null = null;
  let bestD = maxPx;
  for (const t of set.all) {
    for (const [, lat, lon] of t.samples) {
      const q = p.project(lat, lon);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bestD) {
        bestD = d;
        best = t.id;
      }
    }
  }
  return best;
}
