/**
 * Typed access to scenario.json — the single source of truth (CLAUDE.md §1.2).
 *
 * Nothing in src/ may hardcode a scenario number. Components read from here.
 */
import raw from './scenario.json';

export type LatLon = [number, number];
export type BBoxJson = { lat: [number, number]; lon: [number, number] };

export type BacktrackPoint = {
  hours_before_image: number;
  lat: number;
  lon: number;
  point_confidence: number;
  radius_2sig_nm: number;
};

export type LoopRow = {
  h: number;
  in_circle: number;
  leader: string | null;
  p: number | null;
  second?: number;
  note?: string;
  stop_at_default?: boolean;
};

export type TrackPoint = { t: string; lat: number; lon: number; sog?: number };

export const scenario = raw;
export type Scenario = typeof raw;

/** Shorthands for the sections screens read constantly. */
export const meta = raw.meta;
export const geo = raw.geo;
export const sar = raw.sar;
export const detection = raw.detection;
export const backtracking = raw.backtracking;
export const attribution = raw.attribution;

export const backtrackPoints = backtracking.backtrack_points as BacktrackPoint[];
export const loopRows = attribution.loop_rows as LoopRow[];

/** The three headline counters shown in the module bar at all times. */
export const counters = {
  detection: `${detection.counter.from} → ${detection.counter.to}`,
  backtracking: `${backtracking.cloud_km2.before} → ${backtracking.cloud_km2.after} km²`,
  attribution: `${attribution.counter.in_window} → ${attribution.counter.candidates} → ${attribution.counter.suspects}`,
} as const;

/** Interpolate the drift team's backtrack path at an arbitrary hour-before-image. */
export function backtrackAt(h: number): { lat: number; lon: number; point_confidence: number; radius_2sig_nm: number } {
  const pts = backtrackPoints;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (h <= first.hours_before_image) return first;
  if (h >= last.hours_before_image) return last;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1].hours_before_image < h) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const span = b.hours_before_image - a.hours_before_image;
  const f = span === 0 ? 0 : (h - a.hours_before_image) / span;
  const mix = (x: number, y: number) => x + (y - x) * f;
  return {
    lat: mix(a.lat, b.lat),
    lon: mix(a.lon, b.lon),
    point_confidence: mix(a.point_confidence, b.point_confidence),
    radius_2sig_nm: mix(a.radius_2sig_nm, b.radius_2sig_nm),
  };
}

/** Resolve a ranking/loop id ("V-A", "DARK-BT3", …) to a display name. */
export function displayName(id: string): string {
  const v = (attribution.vessels as Record<string, { name?: string }>)[id];
  if (v?.name) return v.name;
  if (id === 'DARK-BT3') return `dark target ${attribution.dark.bright_target}`;
  if (id === 'FIXED') return 'fixed source';
  if (id === 'NONE') return 'no visible ship';
  if (id === 'OTHERS_35') return `${attribution.counter.candidates - attribution.ranking.filter((r) => r.id.startsWith('V-')).length} others combined`;
  return id;
}
