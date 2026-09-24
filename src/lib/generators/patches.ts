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
function ellipseRing(
  centre: [number, number],
  lengthKm: number,
  widthKm: number,
  bearingDeg: number,
  wobble: number,
  rand: () => number,
  steps = 64,
): [number, number][] {
  // One seeded harmonic set per ring, so the wobble is smooth, not noisy.
  const h = Array.from({ length: 4 }, () => ({ a: rand() * wobble, ph: rand() * Math.PI * 2 }));
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

/** S01, from scenario.detection.S01: 18.0 km x 690 m along 135°, 3 fragments. */
function buildS01(level: 'tight' | 'expected' | 'generous'): Patch {
  const s = detection.S01;
  const rand = stream('patch:S01').next;
  const areas = s.outline_levels;
  const area = level === 'tight' ? areas.tight_km2 : level === 'generous' ? areas.generous_km2 : areas.expected_km2;
  // Width scales with the outline level; length is measured head-to-tail and fixed.
  const widthKm = (s.width_m / 1000) * (area / areas.expected_km2);

  const fragments: [number, number][][] = [];
  // 3 fragments strung along the 135° axis between the fresh end and the tail.
  const gaps = [
    [-0.5, -0.09],
    [-0.04, 0.16],
    [0.21, 0.5],
  ];
  for (let i = 0; i < s.fragments; i++) {
    const [a, b] = gaps[i];
    const midT = (a + b) / 2;
    const fragLen = (b - a) * s.length_km;
    const centre = offsetKm(s.centre[0], s.centre[1], s.orientation_deg, midT * s.length_km, 0);
    // The fresh (head) end is the widest; the tail has thinned and spread.
    const taper = 1 - 0.35 * (midT + 0.5);
    fragments.push(ellipseRing(centre, fragLen, widthKm * (1.25 - taper * 0.4), s.orientation_deg, 0.1, rand, 48));
  }

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
    ring: ellipseRing(s.centre as [number, number], s.length_km, widthKm, 118, 0.12, rand, 48),
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

      const widthKm = lengthKm / elong;
      const bearing = rand.range(0, 360);

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
        id: `S${String(n + 2).padStart(2, '0')}`,
        group: g.id as PatchGroup,
        ring: ellipseRing([lat, lon], lengthKm, widthKm, bearing, 0.08 + softness * 0.22, rand.next, 40),
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

export type PatchSet = {
  all: Patch[];
  oil: Patch[];
  byGroup: Record<PatchGroup, Patch[]>;
  byId: Map<string, Patch>;
};

export function buildPatches(level: 'tight' | 'expected' | 'generous' = 'expected'): PatchSet {
  const oil = [buildS01(level), buildS02()];
  const all = applyS14([...oil, ...buildLookAlikes(oil)]);
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

