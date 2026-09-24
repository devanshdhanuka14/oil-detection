/**
 * 600 particle trails on Canvas 2D (CLAUDE.md §3: heavy layers go to canvas).
 * Colours are per age hypothesis: orange 12 h, white 24 h, blue 36 h.
 */
import { useEffect, useRef } from 'react';
import type { ParticleSet } from '../../lib/generators/particles';
import type { Projection } from '../../map/projection';
import { color } from '../../theme/tokens';

const AGE_COLOR: Record<number, string> = {
  12: color.particle12h,
  24: color.particle24h,
  36: color.particle36h,
};

export function ParticleCanvas({
  set,
  p,
  width,
  height,
  /** 0 = at the slick, 1 = fully rewound. Drives the backward animation. */
  progress = 1,
  /** null = all three hypotheses. */
  ageFilter = null,
  trails = true,
}: {
  set: ParticleSet;
  p: Projection;
  width: number;
  height: number;
  progress?: number;
  ageFilter?: 12 | 24 | 36 | null;
  trails?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const shown = ageFilter ? set.byAge[ageFilter] : set.all;
    const k = Math.max(0, Math.min(1, progress));

    for (const q of shown) {
      const n = q.path.length - 1;
      const upTo = Math.max(1, Math.round(n * k));
      const c = AGE_COLOR[q.age];

      if (trails) {
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.10;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i <= upTo; i++) {
          const s = p.project(q.path[i][0], q.path[i][1]);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
      }

      // The head: where this particle has rewound to.
      const h = p.project(q.path[upTo][0], q.path[upTo][1]);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c;
      ctx.fillRect(h.x - 1.3, h.y - 1.3, 2.6, 2.6);
    }
    ctx.globalAlpha = 1;
  }, [set, p, width, height, progress, ageFilter, trails]);

  return <canvas ref={ref} width={width} height={height} className="particle-canvas" />;
}
