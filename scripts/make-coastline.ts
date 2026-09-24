/**
 * Build src/data/coastline.geojson from Natural Earth 10 m land.
 *
 * Run once, at setup. The result is committed, so the app never touches the
 * network: CLAUDE.md §3 (works fully offline, no runtime fetch).
 *
 *   npx tsx scripts/make-coastline.ts <path-to-ne_10m_land.json>
 *
 * Clip window is CLAUDE.md §3: lat 8.4–10.8, lon 74.7–77.0 — a margin around
 * every bbox in scenario.geo.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CLIP = { lat: [8.4, 10.8], lon: [74.7, 77.0] } as const;

type Ring = [number, number][]; // [lon, lat], GeoJSON order

/** Sutherland–Hodgman clip of one ring against one half-plane. */
function clipEdge(ring: Ring, inside: (p: [number, number]) => boolean, intersect: (a: [number, number], b: [number, number]) => [number, number]): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const cur = ring[i];
    const prev = ring[(i + ring.length - 1) % ring.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

function clipRing(ring: Ring): Ring {
  const [lonMin, lonMax] = CLIP.lon;
  const [latMin, latMax] = CLIP.lat;
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  let r = ring;
  r = clipEdge(r, (p) => p[0] >= lonMin, (a, b) => lerp(a, b, (lonMin - a[0]) / (b[0] - a[0])));
  r = clipEdge(r, (p) => p[0] <= lonMax, (a, b) => lerp(a, b, (lonMax - a[0]) / (b[0] - a[0])));
  r = clipEdge(r, (p) => p[1] >= latMin, (a, b) => lerp(a, b, (latMin - a[1]) / (b[1] - a[1])));
  r = clipEdge(r, (p) => p[1] <= latMax, (a, b) => lerp(a, b, (latMax - a[1]) / (b[1] - a[1])));
  return r;
}

const src = process.argv[2];
if (!src) {
  console.error('usage: tsx scripts/make-coastline.ts <ne_10m_land.json>');
  process.exit(1);
}

const land = JSON.parse(readFileSync(src, 'utf8'));
const polygons: Ring[][] = [];

for (const f of land.features) {
  const geom = f.geometry;
  const parts: Ring[][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of parts) {
    const clipped = poly.map(clipRing).filter((r: Ring) => r.length >= 4);
    // Keep the polygon only if its outer ring survived the clip.
    if (clipped.length && clipped[0].length >= 4) polygons.push(clipped);
  }
}

// Round to ~1 m. At the demo's zoom levels nothing finer is visible, and it
// keeps the committed file small.
const round = (n: number) => Math.round(n * 1e5) / 1e5;
const out = {
  type: 'FeatureCollection',
  properties: {
    source: 'Natural Earth 10 m physical land (public domain)',
    clip: CLIP,
    note: 'Built once by scripts/make-coastline.ts. Committed so the app runs offline.',
  },
  features: polygons.map((rings) => ({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: rings.map((r) => r.map(([lon, lat]) => [round(lon), round(lat)])),
    },
  })),
};

writeFileSync('src/data/coastline.geojson', JSON.stringify(out));
const pts = polygons.reduce((n, rings) => n + rings.reduce((m, r) => m + r.length, 0), 0);
console.log(`wrote src/data/coastline.geojson — ${out.features.length} polygons, ${pts} points`);
