/**
 * The transition between modules (CLAUDE.md §2): the slick outline animates
 * into the next screen's map, and the source ellipse does the same between
 * screens 2 and 3.
 *
 * Both screens use the same projection code, so the carried shape is simply the
 * same geometry drawn under each module's own projection and tweened between
 * them. Nothing is faked: the shape really is in both places.
 */
import { useLayoutEffect, useMemo, useState } from 'react';
import { bbox, backtracking, detection } from '../data/scenario';
import { buildPatches } from '../lib/generators/patches';
import { makeProjection, nmToUnits } from '../map/projection';
import { color } from '../theme/tokens';
import type { ModuleId } from './store';

const W = 1300;
const H = 918;

const PROJ: Record<ModuleId, ReturnType<typeof makeProjection>> = {
  detection: makeProjection(bbox.detection, W, H),
  backtracking: makeProjection(bbox.backtracking, W, H),
  attribution: makeProjection(bbox.attributionOverview, W, H),
};

export function Transition({ from, to, k }: { from: ModuleId; to: ModuleId; k: number }) {
  const s01 = useMemo(() => buildPatches('expected').byId.get('S01')!, []);

  // Align the carried geometry to the module's map area, not to the whole
  // stage. Measuring is simpler and safer than re-deriving the header, footer
  // and panel sizes here, and it stays correct if the layout ever changes.
  const [box, setBox] = useState<{ left: number; top: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const map = document.querySelector('.screen__map');
    const stage = document.querySelector('.stage');
    if (!map || !stage) return;
    const m = map.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    // The stage is CSS-scaled to fit the window; divide it back out.
    const scale = st.width / (stage as HTMLElement).offsetWidth || 1;
    setBox({
      left: (m.left - st.left) / scale,
      top: (m.top - st.top) / scale,
      w: m.width / scale,
      h: m.height / scale,
    });
  }, [from, to]);
  const a = PROJ[from];
  const b = PROJ[to];

  const mix = (x: number, y: number) => x + (y - x) * k;

  // The slick outline, carried between every pair of screens.
  const rings = (s01.fragments ?? [s01.ring]).map((ring) =>
    ring
      .map(([lat, lon], i) => {
        const p = a.project(lat, lon);
        const q = b.project(lat, lon);
        return `${i === 0 ? 'M' : 'L'}${mix(p.x, q.x).toFixed(1)},${mix(p.y, q.y).toFixed(1)}`;
      })
      .join('') + 'Z',
  );

  // The source ellipse, carried from screen 2 into screen 3.
  const carrySource = from === 'backtracking';
  const src = backtracking.source;
  const sp = a.project(src.lat, src.lon);
  const sq = b.project(src.lat, src.lon);
  const rx = mix(nmToUnits(a, src.ellipse_1sig_nm[0]), nmToUnits(b, src.ellipse_1sig_nm[0]));
  const ry = mix(nmToUnits(a, src.ellipse_1sig_nm[1]), nmToUnits(b, src.ellipse_1sig_nm[1]));

  // Fade through, so neither screen's furniture flashes.
  const veil = Math.sin(Math.PI * k);

  return (
    <div className="transition">
      <div className="transition__veil" style={{ opacity: veil * 0.82 }} />
      <svg
        className="transition__svg"
        viewBox={`0 0 ${W} ${H}`}
        style={
          box
            ? { position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h }
            : undefined
        }
      >
        {rings.map((d, i) => (
          <path key={i} d={d} fill={color.oil} fillOpacity={0.2} stroke={color.oil} strokeWidth={2} />
        ))}
        {carrySource && (
          <ellipse
            cx={mix(sp.x, sq.x)}
            cy={mix(sp.y, sq.y)}
            rx={rx}
            ry={ry}
            transform={`rotate(${-(90 - src.ellipse_axis_deg)} ${mix(sp.x, sq.x)} ${mix(sp.y, sq.y)})`}
            fill={color.oil}
            fillOpacity={0.15}
            stroke={color.oil}
            strokeWidth={2}
          />
        )}
      </svg>
      <div className="transition__label" style={{ opacity: veil }}>
        {from === 'detection' ? 'slick outline → drift team' : 'source ellipse → vessel team'}
      </div>
    </div>
  );
}

/** Explicit for the detection→backtracking case, kept for readability. */
export const TRANSITION_CARRIES = {
  'detection→backtracking': 'slick outline',
  'backtracking→attribution': 'slick outline + source ellipse',
} as const;

export const SLICK_AREA = detection.S01.area_km2;
