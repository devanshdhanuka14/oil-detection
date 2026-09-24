/**
 * The 600 backward particles (CLAUDE.md §4).
 *
 *   - 200 per age hypothesis, seeded uniformly inside the S01 polygon
 *     (spec 2 §11: never seed from the centroid only)
 *   - advected backward along the net drift, 0.40 m/s toward 055°, reversed
 *   - spread grows with age, so the 36 h group is widest
 *   - each group's cloud centroid lands on backtracking.centroids
 *
 * The centroid is not left to chance: the cloud is generated, then translated
 * so its mean sits exactly on the JSON's centroid for that hypothesis. The
 * spread is physics; the destination is data.
 */
import { backtracking } from '../../data/scenario';
import { buildPatches } from './patches';
import { stream } from '../rng';

export type Particle = {
  /** Sample positions from the slick (t = 0) back to the hypothesis age. */
  path: [number, number][];
  age: 12 | 24 | 36;
};

const KM_PER_DEG_LAT = 111.32;
const KX = Math.cos((9.75 * Math.PI) / 180);

/**
 * Turbulent diffusion, in km per sqrt(hour). With the per-particle wind and
 * current errors below, this is what makes the 36 h cloud the widest and puts
 * the combined cloud at the scale scenario.cloud_km2.before states.
 */
const DIFFUSION_KM_PER_SQRT_H = 0.32;

/** Room beyond the outermost age centroid, for that group's own spread. */
const CLOUD_END_PAD_KM = 4;

/** Point-in-polygon, for seeding inside the observed slick. */
function inside(lat: number, lon: number, ring: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export type ParticleSet = {
  all: Particle[];
  byAge: Record<12 | 24 | 36, Particle[]>;
  /** Cloud outline per age, and the combined cloud, as convex-ish hulls. */
  centroid: Record<12 | 24 | 36, [number, number]>;
};

export function buildParticles(): ParticleSet {
  const rand = stream('particles');
  const { particles, hypotheses_h, centroids, forcing } = backtracking;

  // Net drift: "0.40 m/s toward 055°". Reversed, this is where the oil came from.
  const m = /([\d.]+)\s*m\/s\s*toward\s*(\d+)/.exec(forcing.net_drift);
  const speedMs = m ? Number(m[1]) : 0.4;
  const towardDeg = m ? Number(m[2]) : 55;

  // The slick polygon the particles are seeded across.
  const s01 = buildPatches('expected').byId.get('S01')!;
  const rings = s01.fragments ?? [s01.ring];
  const latMin = Math.min(...rings.flat().map((q) => q[0]));
  const latMax = Math.max(...rings.flat().map((q) => q[0]));
  const lonMin = Math.min(...rings.flat().map((q) => q[1]));
  const lonMax = Math.max(...rings.flat().map((q) => q[1]));

  const seeds: [number, number][] = [];
  while (seeds.length < particles.per_hypothesis) {
    const lat = rand.range(latMin, latMax);
    const lon = rand.range(lonMin, lonMax);
    if (rings.some((r) => inside(lat, lon, r))) seeds.push([lat, lon]);
  }

  const STEPS = 24; // sample positions along each backward track
  const byAge = {} as Record<12 | 24 | 36, Particle[]>;
  const centroid = {} as Record<12 | 24 | 36, [number, number]>;

  for (const ageRaw of hypotheses_h) {
    const age = ageRaw as 12 | 24 | 36;
    const group: Particle[] = [];

    for (let i = 0; i < particles.per_hypothesis; i++) {
      // Each particle carries its own plausible wind and current history, so
      // the spread between same-coloured dots is the ensemble uncertainty.
      const speedErr = 1 + rand.normal() * 0.085;
      const dirErr = rand.normal() * 3.6;
      const seed = seeds[i % seeds.length];

      const path: [number, number][] = [];
      // Turbulent diffusion is a random *walk*: the increments accumulate.
      // Drawing fresh noise at every sample instead would make each trail a
      // scribble rather than a trajectory.
      let wn = 0;
      let we = 0;
      const dtH = age / STEPS;
      const stepSigmaKm = DIFFUSION_KM_PER_SQRT_H * Math.sqrt(dtH);

      for (let k = 0; k <= STEPS; k++) {
        const hours = k * dtH;
        if (k > 0) {
          wn += rand.normal() * stepSigmaKm;
          we += rand.normal() * stepSigmaKm;
        }
        const km = (speedMs * speedErr * hours * 3600) / 1000;
        // Reversed drift: subtract the forward displacement.
        const r = ((towardDeg + dirErr) * Math.PI) / 180;
        const dn = -km * Math.cos(r) + wn;
        const de = -km * Math.sin(r) + we;
        path.push([seed[0] + dn / KM_PER_DEG_LAT, seed[1] + de / (KM_PER_DEG_LAT * KX)]);
      }
      group.push({ path, age });
    }

    // Translate the whole cloud so its mean endpoint is exactly the JSON's
    // centroid for this hypothesis. The shape stays physical; the location is data.
    const target = (centroids as Record<string, number[]>)[String(age)] as [number, number];
    let mLat = 0;
    let mLon = 0;
    for (const q of group) {
      const e = q.path[q.path.length - 1];
      mLat += e[0];
      mLon += e[1];
    }
    mLat /= group.length;
    mLon /= group.length;
    const dLat = target[0] - mLat;
    const dLon = target[1] - mLon;
    for (const q of group) {
      for (let k = 0; k <= STEPS; k++) {
        // Ramp the correction in over the track so t=0 stays on the slick.
        const f = k / STEPS;
        q.path[k] = [q.path[k][0] + dLat * f, q.path[k][1] + dLon * f];
      }
    }

    byAge[age] = group;
    centroid[age] = target;
  }

  const all = hypotheses_h.flatMap((a) => byAge[a as 12 | 24 | 36]);
  return { all, byAge, centroid };
}

/**
 * The amber pre-refinement cloud, drawn as an ellipse along the drift axis.
 *
 * A convex hull of the endpoints cannot be right here: the three age centroids
 * alone lie ~35 km apart, so their hull is far larger than the 340 km2 the
 * scenario states, and scaling it down leaves most particles outside their own
 * cloud. An ellipse whose long axis spans the three centroids along the drift
 * bearing and whose area is exactly cloud_km2.before is both - it is 35 x 12 km,
 * which is what 340 km2 elongated along 055 degrees actually looks like.
 */
export function cloudEllipse(
  set: ParticleSet,
  areaKm2: number,
  axisDeg: number,
): [number, number][] {
  const cs = Object.values(set.centroid) as [number, number][];
  const mid = polyCentroid(cs);

  // Semi-major: half the centroid span along the drift axis, with room for the
  // ensemble spread at each end.
  const r = (axisDeg * Math.PI) / 180;
  let halfSpan = 0;
  for (const c of cs) {
    const dn = (c[0] - mid[0]) * KM_PER_DEG_LAT;
    const de = (c[1] - mid[1]) * KM_PER_DEG_LAT * KX;
    halfSpan = Math.max(halfSpan, Math.abs(dn * Math.cos(r) + de * Math.sin(r)));
  }
  const a = halfSpan + CLOUD_END_PAD_KM;
  const b = areaKm2 / (Math.PI * a);

  const ring: [number, number][] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const along = Math.cos(t) * a;
    const across = Math.sin(t) * b;
    const dn = along * Math.cos(r) - across * Math.sin(r);
    const de = along * Math.sin(r) + across * Math.cos(r);
    ring.push([mid[0] + dn / KM_PER_DEG_LAT, mid[1] + de / (KM_PER_DEG_LAT * KX)]);
  }
  ring.push(ring[0]);
  return ring;
}

export function polyCentroid(ring: [number, number][]): [number, number] {
  let lat = 0;
  let lon = 0;
  for (const q of ring) {
    lat += q[0];
    lon += q[1];
  }
  return [lat / ring.length, lon / ring.length];
}

export function polyAreaKm2(ring: [number, number][]): number {
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
