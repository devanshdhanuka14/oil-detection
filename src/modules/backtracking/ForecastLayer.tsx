/**
 * Map overlays for screen 2's toggles (spec 2 §6), so each toggle changes the
 * map and not only the panel.
 */
import { backtracking, detection, geo } from '../../data/scenario';
import { kmToUnits, nmToUnits, type Projection } from '../../map/projection';
import { color } from '../../theme/tokens';

/**
 * The 72 h forward forecast: orange gradient contours at the forecast points
 * scenario.backtracking.forecast_from_source gives, growing with lead time
 * because the uncertainty does.
 */
export function ForecastLayer({ p }: { p: Projection }) {
  const pts = backtracking.forecast_from_source.filter(
    (f): f is { h: number; lat: number; lon: number } => 'lat' in f && f.lat != null,
  );
  const risk = backtracking.coast_risk_72h as Record<string, number>;

  return (
    <g className="forecast-layer">
      <defs>
        <radialGradient id="fc-grad">
          <stop offset="0%" stopColor={color.sourceCloud} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color.sourceCloud} stopOpacity={0.05} />
        </radialGradient>
      </defs>

      {/* The drift line the oil follows forward from the source. */}
      <path
        d={pts
          .map((f, i) => {
            const q = p.project(f.lat, f.lon);
            return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
          })
          .join('')}
        fill="none"
        stroke={color.sourceCloud}
        strokeWidth={1.6}
        strokeDasharray="6 4"
        strokeOpacity={0.8}
      />

      {pts.map((f) => {
        const q = p.project(f.lat, f.lon);
        // The 50% contour widens with lead time.
        const r = kmToUnits(p, 3 + f.h * 0.28);
        return (
          <g key={f.h}>
            <circle cx={q.x} cy={q.y} r={r} fill="url(#fc-grad)" stroke={color.sourceCloud} strokeOpacity={0.55} strokeWidth={1.2} />
            <text x={q.x + r + 5} y={q.y + 4} fontSize={11} fill={color.sourceCloud} fontFamily="JetBrains Mono, monospace">
              {f.h} h
            </text>
          </g>
        );
      })}

      {/* Coast impact probability, never "the oil will reach the coast". */}
      {Object.entries(risk).map(([place, pr]) => {
        const key = place.split(' – ')[0];
        const coord = (geo.places as Record<string, number[]>)[key] ?? (geo.places as Record<string, number[]>)[place];
        if (!coord) return null;
        const q = p.project(coord[0], coord[1]);
        return (
          <g key={place}>
            <circle cx={q.x} cy={q.y} r={5 + pr * 16} fill={color.oil} fillOpacity={0.18} stroke={color.oil} strokeOpacity={0.6} strokeWidth={1.2} />
            <text x={q.x + 10} y={q.y - 8} fontSize={11} fill={color.oil} fontFamily="JetBrains Mono, monospace">
              {Math.round(pr * 100)}% by 72 h
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Where the physics could not see: grey hatching over the source region. */
export function DataLimitOverlay({ p }: { p: Projection }) {
  const s = backtracking.source;
  const q = p.project(s.lat, s.lon);
  // HYCOM resolution is 1/12 degree (~8 km); that is the cell the source sits in.
  const cell = kmToUnits(p, 8);
  return (
    <g className="limits-layer">
      <defs>
        <pattern id="hatch-limits" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke={color.blind} strokeWidth={1.3} opacity={0.5} />
        </pattern>
      </defs>
      <rect
        x={q.x - cell * 1.5}
        y={q.y - cell * 1.5}
        width={cell * 3}
        height={cell * 3}
        fill="url(#hatch-limits)"
        stroke={color.blind}
        strokeOpacity={0.5}
        strokeWidth={1.2}
      />
      <text x={q.x - cell * 1.5} y={q.y - cell * 1.5 - 7} fontSize={11} fill={color.muted} fontFamily="Inter, sans-serif">
        HYCOM 1/12° (~8 km) · sub-mesoscale eddies not captured
      </text>
      <circle cx={q.x} cy={q.y} r={nmToUnits(p, backtracking.data_limits.eddy_shift_nm)} fill="none" stroke={color.blind} strokeDasharray="3 3" strokeWidth={1.2} strokeOpacity={0.8} />
    </g>
  );
}

/**
 * The single upwind arrow the spec asks for: "typical approach: one line, no
 * uncertainty", shown briefly and then replaced by the particle cloud.
 */
export function SingleArrow({ p, opacity }: { p: Projection; opacity: number }) {
  const s = backtracking.source;
  const from = p.project(detection.S01.centre[0], detection.S01.centre[1]);
  const to = p.project(s.lat, s.lon);
  return (
    <g opacity={opacity}>
      <defs>
        <marker id="arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#E6EDF7" />
        </marker>
      </defs>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#E6EDF7"
        strokeWidth={2.4}
        markerEnd="url(#arrowhead)"
      />
      <text
        x={(from.x + to.x) / 2}
        y={(from.y + to.y) / 2 - 10}
        fontSize={12}
        fill="#E6EDF7"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontStyle="italic"
      >
        typical approach: one line, no uncertainty
      </text>
    </g>
  );
}
