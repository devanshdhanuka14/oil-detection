/**
 * Geometry invariants for the S01 outline.
 *
 * The drawn polygon must actually carry the area the panel claims, at every
 * outline level. It did not before the fragments were reshaped as stadiums
 * (12.4 km² stated against 8.1 km² drawn), and nothing would have caught it.
 *
 *   npm run check:geometry
 */
import { buildPatches } from '../src/lib/generators/patches';
import { largestRing, polygonMoments } from '../src/lib/shape';
import { detection } from '../src/data/scenario';

const KM_PER_DEG_LAT = 111.32;
const KX = Math.cos((9.75 * Math.PI) / 180);
const TOLERANCE = 0.01; // 1%

type Level = 'tight' | 'expected' | 'generous';
const LEVELS: Level[] = ['tight', 'expected', 'generous'];

function ringAreaKm2(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1] * KM_PER_DEG_LAT * KX;
    const yi = ring[i][0] * KM_PER_DEG_LAT;
    const xj = ring[j][1] * KM_PER_DEG_LAT * KX;
    const yj = ring[j][0] * KM_PER_DEG_LAT;
    a += xj * yi - xi * yj;
  }
  return Math.abs(a) / 2;
}

const distKm = (a: [number, number], b: [number, number]) =>
  Math.hypot((b[0] - a[0]) * KM_PER_DEG_LAT, (b[1] - a[1]) * KM_PER_DEG_LAT * KX);

const s = detection.S01;
const fails: string[] = [];
const check = (pass: boolean, label: string, detail: string) => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
  if (!pass) fails.push(label);
};

for (const level of LEVELS) {
  const patch = buildPatches(level).byId.get('S01')!;
  const rings = patch.fragments ?? [patch.ring];
  const stated = s.outline_levels[`${level}_km2` as keyof typeof s.outline_levels];
  const drawn = rings.reduce((t, r) => t + ringAreaKm2(r), 0);
  const err = Math.abs(drawn / stated - 1);

  check(
    err <= TOLERANCE,
    `drawn area matches area at ${level}`,
    `${drawn.toFixed(3)} km² vs ${stated} km² (${(err * 100).toFixed(2)}%)`,
  );
  check(rings.length === s.fragments, `${level}: fragment count`, `${rings.length} of ${s.fragments}`);

  // Extent along the slick's own axis.
  const th = (s.orientation_deg * Math.PI) / 180;
  const along = rings
    .flat()
    .map(([lat, lon]) =>
      (lat - s.centre[0]) * KM_PER_DEG_LAT * Math.cos(th) +
      (lon - s.centre[1]) * KM_PER_DEG_LAT * KX * Math.sin(th),
    );
  const extent = Math.max(...along) - Math.min(...along);
  check(
    Math.abs(extent - s.length_km) <= s.length_km * TOLERANCE,
    `${level}: extent along ${s.orientation_deg}°`,
    `${extent.toFixed(3)} km vs ${s.length_km} km`,
  );
}

// The two ends are fixed by the spec; the outline must still reach them.
const pts = (buildPatches('expected').byId.get('S01')!.fragments ?? []).flat();
for (const [name, target] of [
  ['fresh end', s.fresh_end],
  ['tail', s.tail],
] as [string, number[]][]) {
  const d = Math.min(...pts.map((q) => distKm(q, target as [number, number])));
  check(d <= 0.1, `outline reaches the ${name}`, `${(d * 1000).toFixed(0)} m away`);
}

// box_vs_outline must be this outline's own bounding box.
const latMin = Math.min(...pts.map((q) => q[0]));
const latMax = Math.max(...pts.map((q) => q[0]));
const lonMin = Math.min(...pts.map((q) => q[1]));
const lonMax = Math.max(...pts.map((q) => q[1]));
const box = (lonMax - lonMin) * KM_PER_DEG_LAT * KX * ((latMax - latMin) * KM_PER_DEG_LAT);
check(
  Math.abs(box - detection.box_vs_outline.box_km2) <= detection.box_vs_outline.box_km2 * TOLERANCE,
  'box_vs_outline matches the drawn bounding box',
  `${box.toFixed(1)} km² vs ${detection.box_vs_outline.box_km2} km²`,
);
check(
  detection.box_vs_outline.slick_km2 === s.area_km2,
  'box_vs_outline slick area is S01 area_km2',
  `${detection.box_vs_outline.slick_km2} vs ${s.area_km2}`,
);

// --- Elongation -----------------------------------------------------------
// One definition, applied to the confirmed slick and to the rejected example
// alike, so "long and thin" and "blobby" are the same measurement.

const ELONG_TOLERANCE = 0.02; // 2%

const s01 = buildPatches('expected').byId.get('S01')!;
const s01Elong = polygonMoments(largestRing(s01.fragments!)).elongation;
check(
  Math.abs(s01Elong / s.elongation - 1) <= ELONG_TOLERANCE,
  'S01 elongation matches the drawn outline',
  `${s01Elong.toFixed(3)} measured vs ${s.elongation} stated`,
);

const s14Patch = buildPatches('expected').byId.get('S14')!;
const s14Elong = polygonMoments(s14Patch.ring).elongation;
const s14Stated = detection.S14_rejected_example.elongation;
check(
  Math.abs(s14Elong / s14Stated - 1) <= ELONG_TOLERANCE,
  'S14 elongation matches the drawn outline',
  `${s14Elong.toFixed(3)} measured vs ${s14Stated} stated`,
);

// Both must come from the same measurement, or the comparison the screen draws
// between them means nothing.
check(
  Math.abs(s01.elongation - Number(s01Elong.toFixed(2))) < 1e-9 &&
    Math.abs(s14Patch.elongation - Number(s14Elong.toFixed(2))) < 1e-9,
  'both report the measured moment-fitted ratio',
  `S01 ${s01.elongation}, S14 ${s14Patch.elongation}`,
);
check(
  s01Elong > s14Elong * 3,
  'the slick is clearly more elongated than the look-alike',
  `${s01Elong.toFixed(2)} vs ${s14Elong.toFixed(2)}`,
);

// The major axis of the fitted ellipse must be the slick's stated orientation.
const axis = polygonMoments(largestRing(s01.fragments!)).axisDeg;
check(
  Math.min(Math.abs(axis - s.orientation_deg), Math.abs(axis - s.orientation_deg - 180)) <= 2,
  'fitted major axis matches orientation_deg',
  `${axis.toFixed(1)}° vs ${s.orientation_deg}°`,
);

// The measurement itself must be right: a known ellipse measures its own ratio.
{
  const KM = KM_PER_DEG_LAT;
  const ring: [number, number][] = [];
  for (let i = 0; i < 400; i++) {
    const t = (i / 400) * Math.PI * 2;
    ring.push([9.75 + (Math.sin(t) * 2) / KM, 75.9 + (Math.cos(t) * 8) / (KM * KX)]);
  }
  ring.push(ring[0]);
  const m = polygonMoments(ring);
  check(
    Math.abs(m.elongation - 4) < 0.01 && Math.abs(m.areaKm2 - Math.PI * 16) < 0.2,
    'moment fit is correct on a known ellipse',
    `8x2 ellipse -> ${m.elongation.toFixed(3)} (expect 4.000), area ${m.areaKm2.toFixed(2)} (expect ${(Math.PI * 16).toFixed(2)})`,
  );
}

// The generator must be identical run to run.
const a = JSON.stringify(buildPatches('expected').all.map((p) => p.centre));
const b = JSON.stringify(buildPatches('expected').all.map((p) => p.centre));
check(a === b, 'patch generation is deterministic', `${buildPatches('expected').all.length} patches`);

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall geometry checks passed');
process.exit(fails.length ? 1 : 0);
