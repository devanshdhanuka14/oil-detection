/**
 * Static basemap: sea fill, the Natural Earth coastline clipped at build time,
 * and place labels from scenario.geo.places.
 *
 * SVG over a flat fill - no map library, no tile server (CLAUDE.md §3, §1.6).
 */
import coastline from '../data/coastline.geojson?raw';
import { geo } from '../data/scenario';
import { color } from '../theme/tokens';
import type { Projection } from './projection';

type Poly = { type: 'Feature'; geometry: { type: 'Polygon'; coordinates: [number, number][][] } };
const LAND = (JSON.parse(coastline) as { features: Poly[] }).features;

export function Basemap({ p, labels = true }: { p: Projection; labels?: boolean }) {
  const paths = LAND.map((f, i) => {
    const d = f.geometry.coordinates
      .map((ring) => {
        const pts = ring.map(([lon, lat]) => {
          const q = p.project(lat, lon);
          return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
        });
        return `M${pts.join('L')}Z`;
      })
      .join('');
    return <path key={i} d={d} fill="#16233A" stroke="#26374F" strokeWidth={1} />;
  });

  return (
    <g className="basemap">
      <rect x={0} y={0} width={p.size.w} height={p.size.h} fill={color.bg} />
      {paths}
      {labels &&
        Object.entries(geo.places).map(([name, [lat, lon]]) => {
          const q = p.project(lat as number, lon as number);
          if (q.x < 0 || q.x > p.size.w || q.y < 0 || q.y > p.size.h) return null;
          return (
            <g key={name} transform={`translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`}>
              <circle r={2.5} fill={color.muted} />
              <text x={7} y={4} fill={color.muted} fontSize={13} fontFamily="Inter, sans-serif">
                {name}
              </text>
            </g>
          );
        })}
    </g>
  );
}
