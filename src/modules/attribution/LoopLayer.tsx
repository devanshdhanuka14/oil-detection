/**
 * The rewind loop's map furniture: the drift team's backtrack path, the cyan
 * dashed search circle at the playhead, and the radar bright targets.
 */
import { attribution, backtrackAt, backtrackPoints, detection } from '../../data/scenario';
import { nmToUnits, offsetNm, type Projection } from '../../map/projection';
import { alpha, color } from '../../theme/tokens';

export function BacktrackDots({ p, upToH }: { p: Projection; upToH: number }) {
  return (
    <g>
      <path
        d={backtrackPoints
          .map((pt, i) => {
            const q = p.project(pt.lat, pt.lon);
            return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
          })
          .join('')}
        fill="none"
        stroke={color.oil}
        strokeWidth={1.5}
        strokeOpacity={0.7}
        strokeDasharray="2 5"
      />
      {backtrackPoints
        .filter((pt) => pt.hours_before_image <= upToH)
        .map((pt) => {
          const q = p.project(pt.lat, pt.lon);
          return <circle key={pt.hours_before_image} cx={q.x} cy={q.y} r={1.8} fill={color.oil} fillOpacity={0.9} />;
        })}
    </g>
  );
}

/** The search circle: cyan, dashed, sized by the point's own 2σ radius. */
export function SearchCircle({ p, h }: { p: Projection; h: number }) {
  const q = backtrackAt(h);
  const c = p.project(q.lat, q.lon);
  const r = nmToUnits(p, q.radius_2sig_nm);
  return (
    <g>
      <circle
        cx={c.x}
        cy={c.y}
        r={r}
        fill={color.searchCircle}
        fillOpacity={alpha.searchCircleFill}
        stroke={color.searchCircle}
        strokeWidth={1.8}
        strokeDasharray="7 5"
      />
      <circle cx={c.x} cy={c.y} r={3} fill={color.searchCircle} />
    </g>
  );
}

/** Radar bright targets from the detection team: blue triangles, never "vessel". */
export function BrightTargets({ p, dark }: { p: Projection; dark?: boolean }) {
  return (
    <g>
      {detection.bright_targets.map((t) => {
        const q = p.project(t.lat, t.lon);
        const isDark = t.ais_match === null;
        return (
          <g key={t.id} transform={`translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`}>
            <path
              d="M0,-7 L6,5 L-6,5 Z"
              fill={color.brightTarget}
              fillOpacity={isDark && dark ? 1 : 0.85}
              stroke={color.brightTarget}
              strokeWidth={isDark && dark ? 2 : 1}
            />
            <text x={9} y={5} fontSize={11} fill={color.brightTarget} fontFamily="JetBrains Mono, monospace">
              {t.id}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * The fixed-source check: a purple square for the one charted wreck.
 * The JSON gives its bearing and range in words ("31 nm SE"), not coordinates,
 * so the position is derived from those; no derived number is displayed.
 */
export function FixedSource({ p }: { p: Projection }) {
  const m = /(\d+)\s*nm\s*SE/.exec(attribution.fixed.note);
  if (!m) return null;
  const s = backtrackPoints[0];
  const [lat, lon] = offsetNm(s.lat, s.lon, 135, Number(m[1]));
  const q = p.project(lat, lon);
  return (
    <g transform={`translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`}>
      <rect x={-5} y={-5} width={10} height={10} fill={color.fixedSource} fillOpacity={0.6} stroke={color.fixedSource} strokeWidth={1.5} />
      <text x={9} y={4} fontSize={11} fill={color.fixedSource} fontFamily="Inter, sans-serif">
        charted wreck (synthetic)
      </text>
    </g>
  );
}
