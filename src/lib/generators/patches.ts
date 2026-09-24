/**
 * The 47 dark patches (CLAUDE.md §4).
 *
 * S01 and S02 use the geometry in scenario.json. The 45 look-alikes are
 * generated with shapes that *match their rejection reason*, so the picture and
 * the elimination log tell the same story:
 *   29 fuzzy  - soft, ragged edges
 *   11 blobby - round, low elongation
 *    5 noise  - faint, at the noise floor
 *
 * The radar image and the SVG outlines are both built from these same fields,
 * so an outline can never sit off the patch it describes.
 */
import { detection, geo, sar } from '../../data/scenario';
import { stream } from '../rng';
import { elongationOf, largestRing, polygonMoments } from '../shape';

export type PatchGroup = 'oil' | 'fuzzy' | 'blobby' | 'noise';

export type Patch = {
  id: string;
  group: PatchGroup;
  /** Outline in lat/lon, closed. */
  ring: [number, number][];
  /** Extra rings for a fragmented slick (S01 has 3 fragments). */
  fragments?: [number, number][][];
  centre: [number, number];
  /** Rendering hints, also the physical reason the patch was rejected. */
  edgeSoftness: number; // 0 = crisp, 1 = very soft
  depthDb: number;      // how much darker than the surrounding sea
  elongation: number;
  orientationDeg: number;
  lengthKm: number;
  widthKm: number;
  /** Derived from the shape, so the panel never carries a number of its own. */
  oilProb: number;
  edgeRatio: number;
  /** The plain-language reason this patch was judged not oil. */
  verdict: string;
};

const KM_PER_DEG_LAT = 111.32;
const KX = Math.cos((9.75 * Math.PI) / 180);

const toDeg = (km: number) => km / KM_PER_DEG_LAT;
const lonDeg = (km: number) => km / (KM_PER_DEG_LAT * KX);

/** Offset a lat/lon by (along, across) kilometres relative to a bearing. */
function offsetKm(lat: number, lon: number, bearingDeg: number, along: number, across: number): [number, number] {
  const r = (bearingDeg * Math.PI) / 180;
  const n = along * Math.cos(r) - across * Math.sin(r);
  const e = along * Math.sin(r) + across * Math.cos(r);
  return [lat + toDeg(n), lon + lonDeg(e)];
}

/**
 * An elongated closed ring: a capsule along `bearing`, with a seeded wobble
 * whose amplitude is the patch's edge softness.
 */
type Harmonic = { a: number; ph: number };

/** Draw one ring's harmonics. Shared between a solve and its final build, so
 *  both see identical wobble and the measurement holds. */
function drawHarmonics(rand: () => number, wobble: number): Harmonic[] {
  return Array.from({ length: 4 }, () => ({ a: rand() * wobble, ph: rand() * Math.PI * 2 }));
}

function ellipseRing(
  centre: [number, number],
  lengthKm: number,
  widthKm: number,
  bearingDeg: number,
  harmonics: Harmonic[],
  steps = 64,
): [number, number][] {
  const h = harmonics;
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    let r = 1;
    h.forEach((x, k) => { r += x.a * Math.sin((k + 2) * t + x.ph); });
    const along = (Math.cos(t) * lengthKm * r) / 2;
    const across = (Math.sin(t) * widthKm * r) / 2;
    ring.push(offsetKm(centre[0], centre[1], bearingDeg, along, across));
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * A stadium: a rectangle of length `lengthKm` along `bearing` with semicircular
 * ends of radius width/2, plus a seeded wobble.
 *
 * An ellipse is only pi/4 of its bounding box, so elliptical fragments could
 * not carry the stated area over the stated extent. A slick fragment is closer
 * to a stadium anyway: elongated with rounded ends, not a lens.
 */
function stadiumRing(
  centre: [number, number],
  lengthKm: number,
  widthKm: number,
  bearingDeg: number,
  wobble: number,
  rand: () => number,
  steps = 64,
): [number, number][] {
  const w = Math.min(widthKm, lengthKm * 0.98);
  const r = w / 2;
  const straight = Math.max(0, lengthKm - w) / 2;

  // One seeded harmonic set per ring, so the edge wanders smoothly.
  const h = Array.from({ length: 4 }, () => ({ a: rand() * wobble, ph: rand() * Math.PI * 2 }));
  const wob = (t: number) => {
    let k = 1;
    h.forEach((x, i) => { k += x.a * Math.sin((i + 2) * t + x.ph); });
    return k;
  };

  const ring: [number, number][] = [];
  const cap = Math.max(6, Math.round(steps / 4));
  const side = Math.max(4, Math.round(steps / 4));

  // Leading cap, one side, trailing cap, the other side.
  for (let i = 0; i <= cap; i++) {
    const a = -Math.PI / 2 + (i / cap) * Math.PI;
    ring.push([straight + r * Math.cos(a), r * Math.sin(a) * wob(a)]as never);
  }
  for (let i = 1; i < side; i++) {
    const t = i / side;
    const along = straight - 2 * straight * t;
    ring.push([along, r * wob(Math.PI / 2 + t)] as never);
  }
  for (let i = 0; i <= cap; i++) {
    const a = Math.PI / 2 + (i / cap) * Math.PI;
    ring.push([-straight + r * Math.cos(a), r * Math.sin(a) * wob(a)] as never);
  }
  for (let i = 1; i < side; i++) {
    const t = i / side;
    const along = -straight + 2 * straight * t;
    ring.push([along, -r * wob(Math.PI * 1.5 + t)] as never);
  }

  const out = (ring as unknown as [number, number][]).map(([along, across]) =>
    offsetKm(centre[0], centre[1], bearingDeg, along, across),
  );
  out.push(out[0]);
  return out;
}

/** Shoelace area of a ring, in km². */
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

/**
 * Where the three fragments sit along the 135° axis, as fractions of the
 * 18.0 km extent. The outer edges are exactly -0.5 and +0.5, so the drawn
 * outline runs from the fresh end to the tail (both fixed by the spec), with
 * two gaps between. Coverage is 0.90 of the extent.
 */
const S01_FRAGMENT_SPANS: [number, number][] = [
  [-0.5, -0.09],
  [-0.04, 0.16],
  [0.21, 0.5],
];

/** Relative widths: the fresh end is widest, the tail has thinned and spread. */
const S01_FRAGMENT_WIDTH_PROFILE = [1.18, 1.0, 0.84];

/** S01, from scenario.detection.S01: 18.0 km extent along 135°, 3 fragments.
 *
 * The fragment widths are *solved*, not assumed: a single scale factor is
 * bisected until the drawn polygon's area equals the stated area for that
 * outline level. Extent, fragment count and the two end positions stay fixed,
 * so the only free parameter is width. scripts/check-geometry.ts asserts the
 * result, so this cannot drift.
 */
function buildS01Fragments(widthScaleKm: number): [number, number][][] {
  const s = detection.S01;
  // A fresh stream each call, so a trial width never shifts the wobble.
  const rand = stream('patch:S01').next;
  return S01_FRAGMENT_SPANS.map(([a, b], i) => {
    const midT = (a + b) / 2;
    const fragLen = (b - a) * s.length_km;
    const centre = offsetKm(s.centre[0], s.centre[1], s.orientation_deg, midT * s.length_km, 0);
    return stadiumRing(
      centre,
      fragLen,
      widthScaleKm * S01_FRAGMENT_WIDTH_PROFILE[i],
      s.orientation_deg,
      0.06,
      rand,
      64,
    );
  });
}

/** Solve the width scale that makes the drawn area equal `targetKm2`. */
function solveS01Width(targetKm2: number): number {
  let lo = 0.05;
  let hi = 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const area = buildS01Fragments(mid).reduce((t, r) => t + ringAreaKm2(r), 0);
    if (area < targetKm2) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function buildS01(level: 'tight' | 'expected' | 'generous'): Patch {
  const s = detection.S01;
  const areas = s.outline_levels;
  const target = level === 'tight' ? areas.tight_km2 : level === 'generous' ? areas.generous_km2 : areas.expected_km2;

  const widthKm = solveS01Width(target);
  const fragments = buildS01Fragments(widthKm);

  return {
    id: 'S01',
    group: 'oil',
    ring: fragments[1],
    fragments,
    centre: s.centre as [number, number],
    edgeSoftness: 0.1,
    depthDb: s.contrast_db,
    elongation: s.elongation,
    orientationDeg: s.orientation_deg,
    lengthKm: s.length_km,
    widthKm,
    oilProb: s.oil_prob,
    edgeRatio: s.edge_ratio,
    verdict: 'confirmed oil',
  };
}

function buildS02(): Patch {
  const s = detection.S02;
  const rand = stream('patch:S02').next;
  const widthKm = s.area_km2 / s.length_km;
  return {
    id: 'S02',
    group: 'oil',
    ring: ellipseRing(s.centre as [number, number], s.length_km, widthKm, 118, drawHarmonics(rand, 0.12), 48),
    centre: s.centre as [number, number],
    edgeSoftness: 0.14,
    depthDb: -5.8,
    elongation: s.length_km / widthKm,
    orientationDeg: 118,
    lengthKm: s.length_km,
    widthKm,
    oilProb: s.oil_prob,
    edgeRatio: 2.6,
    verdict: 'confirmed oil',
  };
}

/**
 * Solve the drawn length/width ratio whose *measured* elongation equals
 * `target`. Measured elongation is the moment-fitted ellipse's axis ratio, and
 * the seeded wobble shifts it, so the drawn ratio is not the measured one.
 */
function solveAspectForElongation(
  target: number,
  lengthKm: number,
  centre: [number, number],
  bearingDeg: number,
  harmonics: Harmonic[],
): number {
  const measure = (aspect: number) =>
    elongationOf(ellipseRing(centre, lengthKm, lengthKm / aspect, bearingDeg, harmonics, 40));
  let lo = 1.0;
  let hi = 8;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The 45 look-alikes. Counts come from detection.groups, never from a literal,
 * so the elimination log and the picture cannot disagree (acceptance item 3).
 */
function buildLookAlikes(oil: Patch[]): Patch[] {
  const bbox = geo.bbox_detection;
  const rand = stream('patch:lookalikes');
  const out: Patch[] = [];

  // Reserve room around the confirmed slicks so a look-alike never overlaps one.
  const clearOf = (lat: number, lon: number) =>
    oil.every((o) => {
      const d = Math.hypot((lat - o.centre[0]) * KM_PER_DEG_LAT, (lon - o.centre[1]) * KM_PER_DEG_LAT * KX);
      return d > o.lengthKm * 0.6 + 2;
    });

  const groups = detection.groups.filter((g) => g.id !== 'oil');
  let n = 0;

  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      let lat = 0;
      let lon = 0;
      for (let tries = 0; tries < 60; tries++) {
        lat = rand.range(bbox.lat[0] + 0.012, bbox.lat[1] - 0.012);
        lon = rand.range(bbox.lon[0] + 0.012, bbox.lon[1] - 0.012);
        if (clearOf(lat, lon)) break;
      }

      // Shape follows the rejection reason.
      let lengthKm: number;
      let elong: number;
      let softness: number;
      let depth: number;
      if (g.id === 'fuzzy') {
        lengthKm = rand.range(1.6, 4.6);
        elong = rand.range(1.6, 3.4);
        softness = rand.range(0.55, 0.85);
        depth = rand.range(-3.4, -1.6);
      } else if (g.id === 'blobby') {
        lengthKm = rand.range(1.3, 3.2);
        elong = rand.range(1.05, 1.7);
        softness = rand.range(0.3, 0.55);
        depth = rand.range(-4.6, -2.4);
      } else {
        lengthKm = rand.range(0.9, 2.2);
        elong = rand.range(1.2, 2.2);
        softness = rand.range(0.45, 0.7);
        depth = rand.range(-1.5, -0.7);
      }

      const bearing = rand.range(0, 360);
      const id = `S${String(n + 3).padStart(2, '0')}`;
      const harmonics = drawHarmonics(rand.next, 0.08 + softness * 0.22);

      // S14 is the spec's worked example of a *blobby* rejection. Drawn from
      // the fuzzy group's range it measured 3.6, so its stated elongation of
      // 1.6 was only a label. Its aspect ratio is solved instead, so the shape
      // on screen really does measure what the card says - and measures it the
      // same way S01's does.
      if (id === 'S14') {
        elong = solveAspectForElongation(
          detection.S14_rejected_example.elongation,
          lengthKm,
          [lat, lon],
          bearing,
          harmonics,
        );
      }

      const widthKm = lengthKm / elong;

      // Derived from the shape that was just drawn, so the number on the card
      // and the patch on screen always agree. Soft edges, round shape and a
      // shallow signal each push the oil probability down.
      const edgeRatio = Number((1.6 - softness * 1.5).toFixed(1));
      const oilProb = Number(
        Math.max(0.03, Math.min(0.34,
          0.10 * Math.min(1, edgeRatio / 1.2) +
          0.10 * Math.min(1, elong / 6) +
          0.14 * Math.min(1, Math.abs(depth) / 7),
        )).toFixed(2),
      );
      const verdict =
        g.id === 'blobby' ? 'consistent with a biogenic slick or calm patch'
        : g.id === 'noise' ? 'consistent with the sensor noise floor'
        : 'consistent with a low-wind patch';

      n += 1;
      out.push({
        id,
        group: g.id as PatchGroup,
        ring: ellipseRing([lat, lon], lengthKm, widthKm, bearing, harmonics, 40),
        centre: [lat, lon],
        edgeSoftness: softness,
        depthDb: depth,
        elongation: elong,
        orientationDeg: bearing,
        lengthKm,
        widthKm,
        oilProb,
        edgeRatio,
        verdict,
      });
    }
  }
  return out;
}

/**
 * S14 is the spec's clickable rejected example. Its *values* come from
 * scenario.detection.S14_rejected_example; only its position is generated,
 * since the JSON gives none.
 */
function applyS14(patches: Patch[]): Patch[] {
  const s = detection.S14_rejected_example;
  return patches.map((p) =>
    p.id === 'S14'
      ? {
          ...p,
          group: 'fuzzy' as PatchGroup,
          depthDb: s.contrast_db,
          elongation: s.elongation,
          oilProb: s.oil_prob,
          edgeRatio: s.edge_ratio,
          verdict: s.verdict,
          // edge_ratio 0.4 = 0.4x typical sharpness, i.e. a notably soft edge
          edgeSoftness: 0.78,
        }
      : p,
  );
}

/**
 * Every patch reports the elongation of its own drawn outline, measured as the
 * major/minor axis ratio of the moment-fitted ellipse. One definition for the
 * confirmed slick and for every rejected look-alike, so "elongation 8.1" and
 * "elongation 1.6" are the same quantity and the comparison is fair.
 *
 * A fragmented slick is measured on its largest fragment: the whole set's
 * moments would describe the gaps between fragments as much as the oil.
 */
function measureElongation(patches: Patch[]): Patch[] {
  return patches.map((p) => ({
    ...p,
    elongation: Number(
      polygonMoments(p.fragments ? largestRing(p.fragments) : p.ring).elongation.toFixed(2),
    ),
  }));
}

export type PatchSet = {
  all: Patch[];
  oil: Patch[];
  byGroup: Record<PatchGroup, Patch[]>;
  byId: Map<string, Patch>;
};

export function buildPatches(level: 'tight' | 'expected' | 'generous' = 'expected'): PatchSet {
  const oil = [buildS01(level), buildS02()];
  const all = measureElongation(applyS14([...oil, ...buildLookAlikes(oil)]));
  const byGroup = { oil: [], fuzzy: [], blobby: [], noise: [] } as Record<PatchGroup, Patch[]>;
  for (const p of all) byGroup[p.group].push(p);
  return { all, oil, byGroup, byId: new Map(all.map((p) => [p.id, p])) };
}

/** The low-wind blind zone: 8% of the scene (sar.observable_pct = 92). */
export function buildBlindZone(): [number, number][] {
  const bbox = geo.bbox_detection;
  const rand = stream('blind');
  const dLat = bbox.lat[1] - bbox.lat[0];
  const dLon = bbox.lon[1] - bbox.lon[0];
  const targetFrac = (100 - sar.observable_pct) / 100;
  // A soft blob in the scene's SW quadrant, sized to the required area share.
  const centre: [number, number] = [bbox.lat[0] + dLat * 0.26, bbox.lon[0] + dLon * 0.2];
  // Ellipse with semi-axes rLat and rLat/KX (so it is round on screen). Its
  // area is pi * rLat^2 / KX, and that must equal targetFrac of the scene.
  const sceneDeg2 = dLat * dLon;
  const rLat = Math.sqrt((targetFrac * sceneDeg2 * KX) / Math.PI);
  const ring: [number, number][] = [];
  const h = Array.from({ length: 5 }, () => ({ a: rand.range(0.05, 0.18), ph: rand.range(0, Math.PI * 2) }));
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    let r = 1;
    h.forEach((x, k) => { r += x.a * Math.sin((k + 2) * t + x.ph); });
    ring.push([centre[0] + Math.sin(t) * rLat * r, centre[1] + (Math.cos(t) * rLat * r) / KX]);
  }
  ring.push(ring[0]);
  return ring;
}

