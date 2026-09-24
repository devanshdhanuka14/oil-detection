/**
 * The amber pre-refinement cloud, the refined 1σ/2σ ellipse and the source pin.
 *
 * Spec 2 §11: the source pin is never drawn without the 1σ ellipse visible at
 * the same time, so they are one component.
 */
import { backtracking } from '../../data/scenario';
import { nmToUnits, type Projection } from '../../map/projection';
import { alpha, color } from '../../theme/tokens';

export function CloudLayer({
  hull,
  p,
  opacity = alpha.sourceCloudFill,
  /** 1 = the full 340 km2 cloud; the shrink tweens this toward the 18 km2 area. */
  scale = 1,
}: {
  hull: [number, number][];
  p: Projection;
  opacity?: number;
  scale?: number;
}) {
  // Shrink about the refined source, so the cloud collapses onto the answer.
  const s = backtracking.source;
  const shaped: [number, number][] = hull.map(([lat, lon]) => [
    s.lat + (lat - s.lat) * scale,
    s.lon + (lon - s.lon) * scale,
  ]);
  const d =
    shaped
      .map(([lat, lon], i) => {
        const q = p.project(lat, lon);
        return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join('') + 'Z';
  return <path d={d} fill={color.sourceCloud} fillOpacity={opacity} stroke={color.sourceCloud} strokeOpacity={0.7} strokeWidth={1.5} />;
}

/**
 * The source estimate: 1σ solid, 2σ dashed, pin at the peak.
 * Semi-axes and the axis bearing come from backtracking.source.
 */
export function SourceLayer({ p, showPin = true, sigma = 2 }: { p: Projection; showPin?: boolean; sigma?: 1 | 2 | 3 }) {
  const s = backtracking.source;
  const q = p.project(s.lat, s.lon);
  const rx1 = nmToUnits(p, s.ellipse_1sig_nm[0]);
  const ry1 = nmToUnits(p, s.ellipse_1sig_nm[1]);
  const rx2 = nmToUnits(p, s.ellipse_2sig_nm[0]);
  const ry2 = nmToUnits(p, s.ellipse_2sig_nm[1]);
  // 3σ is the conservative stop on the uncertainty slider; the JSON gives 1σ
  // and 2σ semi-axes, and 3σ scales from the 1σ pair.
  const rx3 = rx1 * 3;
  const ry3 = ry1 * 3;

  // The ellipse is elongated along the drift axis - that is physics, not a guess.
  const rot = 90 - s.ellipse_axis_deg;

  return (
    <g className="source-layer" transform={`translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) rotate(${-rot})`}>
      {sigma >= 3 && (
        <ellipse rx={rx3} ry={ry3} fill="none" stroke={color.oil} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="2 5" />
      )}
      {sigma >= 2 && (
        <ellipse rx={rx2} ry={ry2} fill={color.oil} fillOpacity={0.06} stroke={color.oil} strokeWidth={1.5} strokeDasharray="6 5" />
      )}
      <ellipse rx={rx1} ry={ry1} fill={color.oil} fillOpacity={alpha.sourceEllipseFill} stroke={color.oil} strokeWidth={2} />
      {showPin && (
        <g transform={`rotate(${rot})`}>
          <circle r={4} fill={color.oil} />
          <circle r={9} fill="none" stroke={color.oil} strokeWidth={1.2} strokeOpacity={0.7} />
        </g>
      )}
    </g>
  );
}

/** The drift team's backtrack path: dotted red, T0 → T−27 h. */
export function BacktrackPath({ p, points }: { p: Projection; points: { lat: number; lon: number }[] }) {
  const d = points
    .map((pt, i) => {
      const q = p.project(pt.lat, pt.lon);
      return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join('');
  return <path d={d} fill="none" stroke={color.oil} strokeWidth={1.6} strokeOpacity={0.8} strokeDasharray="2 5" />;
}
