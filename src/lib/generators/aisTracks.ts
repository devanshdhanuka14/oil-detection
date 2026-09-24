/**
 * The 612 AIS tracks (CLAUDE.md §4).
 *
 * Counts come from attribution.filter_groups, and each group is generated so
 * that its *reason for elimination is true of the geometry*:
 *
 *   402 reach - coastal lane, a western transit lane and fishing clusters, all
 *               kept further from the backtrack path than the step radius
 *   131 time  - cross the path, but more than 2 h from when the oil was there
 *    41 port  - short tracks inside the Kochi port limits
 *    38 cand  - pass within the step radius at a matching time; three of them
 *               are V-A, V-B and V-C from the JSON, 35 are low-probability passers
 *
 * Names come from a seeded fictional word list. MMSIs are always masked and
 * always carry "(synthetic)" - no real vessel name or MMSI appears anywhere.
 */
import { attribution, backtracking, backtrackAt, backtrackPoints, geo, sar } from '../../data/scenario';
import { distanceNm, offsetNm } from '../../map/projection';
import { stream, type Rng } from '../rng';

export type TrackGroup = 'reach' | 'time' | 'port' | 'cand';

export type AisTrack = {
  id: string;
  name: string;
  mmsi: string;
  group: TrackGroup;
  /** [time ms, lat, lon] samples, ascending in time. */
  samples: [number, number, number][];
  /** Present for the three named suspects and Tessera Bay. */
  vesselKey?: string;
  /** Closest approach to the contemporaneous backtrack point, in nm. */
  minDistanceNm: number;
  /** Hours from the matching time at that closest approach. */
  timeOffsetH: number;
  typeLabel: string;
};

const IMAGE_MS = Date.parse(sar.time_utc);
const H = 3600_000;

/* ── Fictional names ────────────────────────────────────────────────────── */

const PREFIX = ['MV', 'MT', 'FV'];
const ADJ = [
  'Amber', 'Coral', 'Saffron', 'Indigo', 'Silver', 'Northern', 'Southern', 'Golden',
  'Azure', 'Crimson', 'Emerald', 'Pearl', 'Ivory', 'Copper', 'Onyx', 'Cobalt',
  'Harbour', 'Monsoon', 'Trade', 'Cardamom', 'Pepper', 'Lagoon', 'Estuary', 'Reef',
];
const NOUN = [
  'Tern', 'Heron', 'Marlin', 'Crest', 'Meridian', 'Lark', 'Petrel', 'Kestrel',
  'Wave', 'Current', 'Bay', 'Sound', 'Passage', 'Star', 'Horizon', 'Trader',
  'Voyager', 'Mariner', 'Dawn', 'Runner', 'Osprey', 'Albatross', 'Dolphin', 'Sailfish',
];

function makeName(rand: Rng, used: Set<string>, prefix?: string): string {
  for (let i = 0; i < 400; i++) {
    const n = `${prefix ?? rand.pick(PREFIX)} ${rand.pick(ADJ)} ${rand.pick(NOUN)}`;
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  // Fall back to a numbered variant rather than repeating a name.
  let n = 0;
  let name = '';
  do {
    n += 1;
    name = `${prefix ?? 'MV'} ${rand.pick(ADJ)} ${rand.pick(NOUN)} ${n}`;
  } while (used.has(name));
  used.add(name);
  return name;
}

/** Masked MMSI: the "(synthetic)" tag is always visible (spec 3 §9). */
function makeMmsi(rand: Rng): string {
  const mid = rand.pick(['538', '636', '419', '477', '563', '249']);
  return `${mid}•••${String(rand.int(100, 999))} (synthetic)`;
}

/* ── Track shapes ───────────────────────────────────────────────────────── */

/** AIS sampling interval for generated tracks, in hours (20 min). */
const STEP_H = 1 / 3;

/**
 * Round a leg duration so that its midpoint lands exactly on a sample. A track
 * aimed at a crossing is only inside the search circle if a *sample* is there,
 * and at 14 kn a 10-minute gap is 2.3 nm.
 */
const alignHours = (h: number) => Math.max(2 * STEP_H, Math.round(h / (2 * STEP_H)) * (2 * STEP_H));

/** A straight leg at constant speed, sampled every 20 min. */
function leg(
  startMs: number,
  from: [number, number],
  bearingDeg: number,
  sogKn: number,
  hours: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  const stepH = STEP_H;
  for (let t = 0; t <= hours + 1e-9; t += stepH) {
    const [lat, lon] = offsetNm(from[0], from[1], bearingDeg, sogKn * t);
    out.push([startMs + t * H, lat, lon]);
  }
  return out;
}

/**
 * Closest approach of a track to the rewound oil: for each sample, compare it
 * with the backtrack point *for that same moment*. This is the whole idea of
 * the module - "there when the oil was there", not "near it at some point".
 */
function closestApproach(samples: [number, number, number][]): { nm: number; offsetH: number; clearanceNm: number } {
  let best = Infinity;
  let bestOffset = 0;
  // The smallest (distance - search radius) over the track. Positive means the
  // vessel was never inside the rewound oil's circle at a matching time, which
  // is exactly what the "reach" and "time" groups claim.
  let clearance = Infinity;
  // Also track the nearest approach in space, to report the time error there.
  let bestSpace = Infinity;
  let spaceOffset = 0;

  for (const [ms, lat, lon] of samples) {
    const hBefore = (IMAGE_MS - ms) / H;
    if (hBefore < 0) continue;
    const q = backtrackAt(hBefore);
    const d = distanceNm([lat, lon], [q.lat, q.lon]);
    if (d < best) {
      best = d;
      bestOffset = 0;
    }
    clearance = Math.min(clearance, d - q.radius_2sig_nm);
    // Distance to the whole path, regardless of time, and the time error there.
    for (const bp of backtrackPoints) {
      const ds = distanceNm([lat, lon], [bp.lat, bp.lon]);
      if (ds < bestSpace) {
        bestSpace = ds;
        spaceOffset = Math.abs(hBefore - bp.hours_before_image);
      }
    }
  }
  // A track wholly outside the AIS window has no contemporaneous comparison.
  // Report its spatial distance so it still sorts and renders sensibly.
  if (!Number.isFinite(best)) return { nm: bestSpace, offsetH: spaceOffset, clearanceNm: Infinity };
  return { nm: best, offsetH: bestSpace < best ? spaceOffset : bestOffset, clearanceNm: clearance };
}

export type AisSet = {
  all: AisTrack[];
  byGroup: Record<TrackGroup, AisTrack[]>;
  byId: Map<string, AisTrack>;
};

export function buildAisTracks(): AisSet {
  const rand = stream('ais');
  const used = new Set<string>();
  const all: AisTrack[] = [];
  const bboxA = geo.bbox_attribution_overview;

  // Reserve the JSON's real names so a generated one can never collide.
  for (const v of Object.values(attribution.vessels)) {
    if ('name' in v && v.name) used.add(v.name as string);
  }

  const groups = Object.fromEntries(attribution.filter_groups.map((g) => [g.id, g.count])) as Record<TrackGroup, number>;
  // The AIS query window is the drift team's hand-off, not a number of our own.
  const windowStart = Date.parse(backtracking.handoff.ais_window_utc[0]);

  let n = 0;
  const push = (t: Omit<AisTrack, 'id' | 'minDistanceNm' | 'timeOffsetH'>) => {
    const ca = closestApproach(t.samples);
    n += 1;
    all.push({ ...t, id: `T${String(n).padStart(3, '0')}`, minDistanceNm: ca.nm, timeOffsetH: ca.offsetH });
  };

  /* 402 never within reach --------------------------------------------- */
  for (let i = 0; i < groups.reach; i++) {
    const kind = i % 5;
    let start: [number, number];
    let bearing: number;
    let sog: number;
    let hours: number;
    let type: string;

    if (kind < 2) {
      // Coastal lane, 25-45 nm offshore, running 330째 / 150째.
      const offshore = rand.range(25, 45);
      const alongLat = rand.range(bboxA.lat[0] + 0.1, bboxA.lat[1] - 0.1);
      const coastLon = 76.3;
      start = [alongLat, coastLon - offshore / (60 * Math.cos((9.75 * Math.PI) / 180))];
      bearing = rand.next() < 0.5 ? 330 : 150;
      sog = rand.range(9, 16);
      hours = rand.range(3, 9);
      type = rand.pick(['Container ship', 'Bulk carrier', 'General cargo', 'Product tanker']);
    } else if (kind === 2) {
      // Western transit lane, well offshore of the backtrack path.
      start = [rand.range(bboxA.lat[0], bboxA.lat[1]), rand.range(bboxA.lon[0], bboxA.lon[0] + 0.35)];
      bearing = rand.next() < 0.5 ? 345 : 165;
      sog = rand.range(11, 18);
      hours = rand.range(4, 10);
      type = rand.pick(['Crude oil tanker', 'Container ship', 'LPG tanker']);
    } else {
      // Fishing clusters.
      const cLat = rand.range(bboxA.lat[0] + 0.2, bboxA.lat[1] - 0.2);
      const cLon = rand.range(bboxA.lon[0] + 0.5, 76.1);
      start = [cLat + rand.normal() * 0.05, cLon + rand.normal() * 0.05];
      bearing = rand.range(0, 360);
      sog = rand.range(2, 6);
      hours = rand.range(2, 6);
      type = 'Fishing vessel';
    }

    const t0 = windowStart + rand.range(0, 30) * H;
    let samples = leg(t0, start, bearing, sog, hours);

    // Enforce the group's reason: never within reach of the rewound oil.
    // Push the whole track away from the path until that is true.
    for (let guard = 0; guard < 24; guard++) {
      const ca = closestApproach(samples);
      if (ca.nm > REACH_FLOOR_NM && ca.clearanceNm > TIME_CLEARANCE_NM) break;
      samples = samples.map(([ms, lat, lon]) => {
        const q = backtrackAt(Math.max(0, (IMAGE_MS - ms) / H));
        const away = Math.atan2(lon - q.lon, lat - q.lat);
        return [ms, lat + Math.cos(away) * 0.05, lon + Math.sin(away) * 0.05];
      });
    }

    push({
      name: makeName(rand, used, type === 'Fishing vessel' ? 'FV' : undefined),
      mmsi: makeMmsi(rand),
      group: 'reach',
      samples,
      typeLabel: type,
    });
  }

  /* 131 near the path, wrong time --------------------------------------- */
  // Tessera Bay is one of these 131, not an extra: it is near the slick at
  // image time but arrived long after the oil did. The counter says 612.
  const lastH = backtrackPoints[backtrackPoints.length - 1].hours_before_image;
  for (let i = 0; i < groups.time - 1; i++) {
    // Cross the backtrack path at a chosen point, but hours away from the time
    // the oil was actually there.
    const bp = backtrackPoints[rand.int(2, backtrackPoints.length - 2)];
    const bearing = rand.range(0, 360);
    const sog = rand.range(8, 15);
    const hours = alignHours(rand.range(2.5, 6));
    const back = offsetNm(bp.lat, bp.lon, (bearing + 180) % 360, (sog * hours) / 2);

    // Choose a crossing time that is well away from when the oil was there and
    // still inside the AIS window.
    let samples: [number, number, number][] = [];
    for (let guard = 0; guard < 30; guard++) {
      const mag = rand.range(TIME_MISMATCH_MIN_H, 11) + guard * 0.8;
      const sign = rand.next() < 0.5 ? -1 : 1;
      // Keep the whole leg inside [T-lastH, T0].
      const crossH = Math.min(lastH - hours / 2, Math.max(hours / 2, bp.hours_before_image + sign * mag));
      const crossMs = IMAGE_MS - crossH * H;
      samples = leg(crossMs - (hours / 2) * H, back, bearing, sog, hours);
      // The group's reason must be true: never inside the search circle at a
      // matching time, however close it passes in space.
      if (closestApproach(samples).clearanceNm > TIME_CLEARANCE_NM) break;
    }

    // If no crossing time cleared the circle, step the whole track away from
    // the path until it does. The group's claim must be true of the geometry.
    for (let guard = 0; guard < 24; guard++) {
      if (closestApproach(samples).clearanceNm > TIME_CLEARANCE_NM) break;
      samples = samples.map(([ms, lat, lon]) => {
        const q = backtrackAt(Math.max(0, (IMAGE_MS - ms) / H));
        const away = Math.atan2(lon - q.lon, lat - q.lat);
        return [ms, lat + Math.cos(away) * 0.02, lon + Math.sin(away) * 0.02];
      });
    }

    push({
      name: makeName(rand, used),
      mmsi: makeMmsi(rand),
      group: 'time',
      samples,
      typeLabel: rand.pick(['Container ship', 'Bulk carrier', 'General cargo', 'Chemical tanker', 'Fishing vessel']),
    });
  }

  /* 41 stayed inside Kochi port limits ---------------------------------- */
  const kochi = geo.places['Kochi (Fort Kochi)'] as number[];
  for (let i = 0; i < groups.port; i++) {
    const t0 = windowStart + rand.range(0, 30) * H;
    const start: [number, number] = [kochi[0] + rand.normal() * 0.02, kochi[1] + rand.normal() * 0.02];
    push({
      name: makeName(rand, used),
      mmsi: makeMmsi(rand),
      group: 'port',
      samples: leg(t0, start, rand.range(0, 360), rand.range(0.5, 3), rand.range(1, 4)),
      typeLabel: rand.pick(['Harbour tug', 'Pilot vessel', 'Container feeder', 'Bunker barge']),
    });
  }

  /* 38 candidates: 3 named + 35 low-probability passers ------------------ */
  const namedKeys = attribution.ranking.filter((r) => r.id.startsWith('V-')).map((r) => r.id);
  for (const key of namedKeys) {
    push({
      name: (attribution.vessels as Record<string, { name: string }>)[key].name,
      mmsi: (attribution.vessels as Record<string, { mmsi?: string }>)[key].mmsi ?? makeMmsi(rand),
      group: 'cand',
      samples: namedVesselSamples(key, rand),
      vesselKey: key,
      typeLabel: (attribution.vessels as Record<string, { type?: string }>)[key].type ?? 'Unknown',
    });
  }

  const others = groups.cand - namedKeys.length;
  for (let i = 0; i < others; i++) {
    // Pass within the step radius at a matching time, but without the timing,
    // parallelism or behaviour that makes a leading candidate.
    const bp = backtrackPoints[rand.int(4, backtrackPoints.length - 4)];
    const bearing = rand.range(0, 360);
    const sog = rand.range(6, 14);
    const hours = alignHours(rand.range(1.5, 3.5));

    // A candidate must actually be inside the search circle at a matching time -
    // that is what puts it in the loop. Sampling is every 20 min, so a track
    // aimed at the crossing can still miss it; tighten until it holds.
    let samples: [number, number, number][] = [];
    for (let guard = 0; guard < 20; guard++) {
      const spread = bp.radius_2sig_nm * 0.55 * (1 - guard / 20);
      const crossMs = IMAGE_MS - (bp.hours_before_image + rand.range(-0.4, 0.4) * (1 - guard / 20)) * H;
      const jitter = offsetNm(bp.lat, bp.lon, rand.range(0, 360), rand.range(0, spread));
      const back = offsetNm(jitter[0], jitter[1], (bearing + 180) % 360, (sog * hours) / 2);
      samples = leg(crossMs - (hours / 2) * H, back, bearing, sog, hours);
      if (closestApproach(samples).clearanceNm < 0) break;
    }

    push({
      name: makeName(rand, used),
      mmsi: makeMmsi(rand),
      group: 'cand',
      samples,
      typeLabel: rand.pick(['Bulk carrier', 'General cargo', 'Product tanker', 'Container ship', 'Fishing vessel']),
    });
  }

  /* Tessera Bay: the trap. Eliminated at stage 2, but always present. ---- */
  push({
    name: attribution.vessels['V-TESSERA'].name,
    mmsi: attribution.vessels['V-TESSERA'].mmsi,
    group: 'time',
    samples: namedVesselSamples('V-TESSERA', rand),
    vesselKey: 'V-TESSERA',
    typeLabel: attribution.vessels['V-TESSERA'].type,
  });

  const byGroup = { reach: [], time: [], port: [], cand: [] } as Record<TrackGroup, AisTrack[]>;
  for (const t of all) byGroup[t.group].push(t);
  return { all, byGroup, byId: new Map(all.map((t) => [t.id, t])) };
}

/** Distance beyond which a "never within reach" track must stay. */
const REACH_FLOOR_NM = 4;

/** Spec 3 section 5.2: a wrong-time track is at least this far off in time. */
const TIME_MISMATCH_MIN_H = 2.5;

/** ...and must clear the search circle by this much at every matching moment. */
const TIME_CLEARANCE_NM = 0.5;

/**
 * V-A, V-B, V-TESSERA use their exact waypoints, interpolated linearly in time.
 * V-C loiters in a seeded zig-zag inside its loiter_radius_km.
 */
function namedVesselSamples(key: string, rand: Rng): [number, number, number][] {
  const v = (attribution.vessels as Record<string, Record<string, unknown>>)[key];

  if (key === 'V-C') {
    const c = v.loiter_centre as number[];
    const rKm = v.loiter_radius_km as number;
    const [fromIso, toIso] = v.loiter_utc as string[];
    const t0 = Date.parse(fromIso);
    const t1 = Date.parse(toIso);
    const out: [number, number, number][] = [];
    const steps = 40;
    // A fishing zig-zag: a slow drift with a reversing cross-track leg.
    let lat = c[0];
    let lon = c[1];
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps;
      const swing = (i % 8 < 4 ? 1 : -1) * rand.range(0.4, 1);
      const [nlat, nlon] = offsetNm(lat, lon, rand.range(0, 360), swing * 0.35);
      // Keep the zig-zag inside the stated loiter radius.
      const dKm = distanceNm([nlat, nlon], [c[0], c[1]]) * 1.852;
      if (dKm <= rKm) {
        lat = nlat;
        lon = nlon;
      }
      out.push([t, lat, lon]);
    }
    return out;
  }

  const track = v.track as { t: string; lat: number; lon: number }[];
  const out: [number, number, number][] = [];
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    const ta = Date.parse(a.t);
    const tb = Date.parse(b.t);
    // Sample every 10 min so the match window is resolved finely.
    const steps = Math.max(2, Math.round((tb - ta) / (10 * 60_000)));
    for (let k = 0; k < steps; k++) {
      const f = k / steps;
      out.push([ta + (tb - ta) * f, a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f]);
    }
  }
  const last = track[track.length - 1];
  out.push([Date.parse(last.t), last.lat, last.lon]);
  return out;
}
