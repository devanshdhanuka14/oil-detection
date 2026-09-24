/**
 * Map overlays for screen 3's "Where AIS couldn't see" toggle (spec 3 §6).
 */
import { attribution, backtracking, geo } from '../../data/scenario';
import { distanceNm, nmToUnits, type Projection } from '../../map/projection';
import { alpha, color } from '../../theme/tokens';

/**
 * Terrestrial AIS reaches about 40 nm offshore here, so the part of the search
 * area beyond that is hatched: a ship there could pass unseen.
 */
export function AisBlindZone({ p }: { p: Projection }) {
  const c = attribution.ais_coverage;
  const s = backtracking.source;
  const centre = p.project(s.lat, s.lon);
  const searchR = nmToUnits(p, backtracking.handoff.search_radius_nm['3sig']);

  // The coast, offset seaward by the terrestrial reach. Everything further out
  // than that line and inside the search circle is beyond reach.
  const coast = geo.coastline_fallback_points as number[][];
  const reachEdge = coast.map(([lat, lon]) => {
    const q = p.project(lat, lon);
    return { x: q.x - nmToUnits(p, c.terrestrial_reach_nm), y: q.y };
  });

  const d =
    `M${reachEdge.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}` +
    `L${(centre.x - searchR - 40).toFixed(1)},${reachEdge[reachEdge.length - 1].y.toFixed(1)}` +
    `L${(centre.x - searchR - 40).toFixed(1)},${reachEdge[0].y.toFixed(1)}Z`;

  return (
    <g className="ais-blind">
      <defs>
        <pattern id="hatch-ais" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={9} stroke={color.blind} strokeWidth={1.3} opacity={0.5} />
        </pattern>
        <clipPath id="clip-search">
          <circle cx={centre.x} cy={centre.y} r={searchR} />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-search)">
        <path d={d} fill="url(#hatch-ais)" stroke={color.blind} strokeOpacity={0.5} strokeWidth={1.2} />
      </g>
      <circle cx={centre.x} cy={centre.y} r={searchR} fill="none" stroke={color.blind} strokeOpacity={0.45} strokeWidth={1.3} strokeDasharray="6 5" />
      <text x={centre.x - searchR} y={centre.y - searchR - 8} fontSize={11.5} fill={color.muted} fontFamily="Inter, sans-serif">
        {c.search_area_beyond_reach_pct}% of the {backtracking.handoff.search_radius_nm['3sig']} nm search area is beyond terrestrial AIS reach
      </text>
    </g>
  );
}

/**
 * MV Saffron Crest's AIS gap, drawn as a reachability ellipse: every place it
 * could have got to in 43 min. The ellipse does not touch the rewound oil at
 * that time — we never draw a straight line through a gap (spec 3 §6).
 */
export function ReachabilityEllipse({ p }: { p: Projection }) {
  const gap = attribution.vessels['V-B'].ais_gaps[0];
  if (!gap) return null;

  const start = gap.start as number[];
  const end = gap.end as number[];
  const a = p.project(start[0], start[1]);
  const b = p.project(end[0], end[1]);

  // Reachable radius = the fastest it could plausibly run for the gap's length.
  const MAX_KN = 16;
  const r = nmToUnits(p, (MAX_KN * gap.minutes) / 60);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const sepNm = distanceNm([start[0], start[1]], [end[0], end[1]]);

  return (
    <g className="reach-ellipse">
      <circle cx={a.x} cy={a.y} r={r} fill={color.searchCircle} fillOpacity={alpha.reachabilityFill} stroke={color.searchCircle} strokeWidth={1.4} strokeDasharray="5 4" />
      {/* The gap itself is dotted, in the track's own colour — never a straight
          line implying a course that was not reported. */}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color.candidate} strokeWidth={1.4} strokeDasharray="2 5" />
      <circle cx={a.x} cy={a.y} r={3} fill={color.candidate} />
      <circle cx={b.x} cy={b.y} r={3} fill={color.candidate} />
      <text x={mid.x + 8} y={mid.y - 6} fontSize={11} fill={color.searchCircle} fontFamily="Inter, sans-serif" fontStyle="italic">
        {gap.minutes} min gap · reachable area · {sepNm.toFixed(1)} nm apart
      </text>
      <text x={mid.x + 8} y={mid.y + 9} fontSize={11} fill={color.muted} fontFamily="Inter, sans-serif" fontStyle="italic">
        we never draw a straight line through a gap
      </text>
    </g>
  );
}
