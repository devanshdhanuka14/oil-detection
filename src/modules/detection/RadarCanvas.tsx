/**
 * The radar image. Canvas 2D because the scene is per-pixel work
 * (CLAUDE.md §3); it is rendered once and cached, so there is no loading state.
 */
import { useEffect, useRef } from 'react';
import { renderRadar } from '../../lib/generators/radar';
import type { Patch } from '../../lib/generators/patches';
import type { Projection } from '../../map/projection';

export function RadarCanvas({
  patches,
  blindRing,
  p,
  width,
  height,
}: {
  patches: Patch[];
  blindRing: [number, number][];
  p: Projection;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(renderRadar(width, height, patches, blindRing, p), 0, 0);
  }, [patches, blindRing, p, width, height]);

  return <canvas ref={ref} width={width} height={height} className="radar-canvas" />;
}
