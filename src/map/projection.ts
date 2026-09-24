/**
 * Fixed equirectangular projection, x scaled by cos(9.75°) (CLAUDE.md §3).
 *
 * One projection per bbox in scenario.geo. There is no map library and no user
 * pan or zoom: a scripted camera move is a tween of the SVG viewBox, which is
 * expressed in this projection's own units.
 */

export const LAT0_DEG = 9.75;
export const KX = Math.cos((LAT0_DEG * Math.PI) / 180);

export type BBox = { lat: [number, number]; lon: [number, number] };
export type Point = { x: number; y: number };

export type Projection = {
  /** lat/lon (degrees) -> stage units, y down. */
  project(lat: number, lon: number): Point;
  /** Inverse, for hit-testing a click back to a coordinate. */
  invert(x: number, y: number): { lat: number; lon: number };
  /** Width and height of the projected bbox, in the same units. */
  size: { w: number; h: number };
  /** Scale factor: stage units per kilometre. Constant across the bbox. */
  unitsPerKm: number;
  bbox: BBox;
};

const KM_PER_DEG_LAT = 111.32;

/**
 * Build a projection that maps `bbox` onto a `w` x `h` box, preserving shape.
 * The bbox is fitted (letterboxed) rather than stretched, so a circle on the
 * sea stays a circle.
 */
export function makeProjection(bbox: BBox, w: number, h: number): Projection {
  const [latMin, latMax] = bbox.lat;
  const [lonMin, lonMax] = bbox.lon;

  // Work in "degree units" with longitude pre-squeezed, then fit to the box.
  const dxDeg = (lonMax - lonMin) * KX;
  const dyDeg = latMax - latMin;
  const scale = Math.min(w / dxDeg, h / dyDeg);

  const padX = (w - dxDeg * scale) / 2;
  const padY = (h - dyDeg * scale) / 2;

  return {
    bbox,
    size: { w, h },
    unitsPerKm: scale / KM_PER_DEG_LAT,
    project(lat, lon) {
      return {
        x: padX + (lon - lonMin) * KX * scale,
        // y is inverted: latitude increases northward, screen y increases downward.
        y: padY + (latMax - lat) * scale,
      };
    },
    invert(x, y) {
      return {
        lon: lonMin + (x - padX) / (KX * scale),
        lat: latMax - (y - padY) / scale,
      };
    },
  };
}

/** Nautical miles -> stage units, for search circles and uncertainty ellipses. */
export function nmToUnits(p: Projection, nm: number): number {
  return nm * 1.852 * p.unitsPerKm;
}

/** Kilometres -> stage units. */
export function kmToUnits(p: Projection, km: number): number {
  return km * p.unitsPerKm;
}

/** Great-circle-ish distance in nautical miles; flat-earth is exact enough here. */
export function distanceNm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * 60;
  const dLon = (b[1] - a[1]) * 60 * KX;
  return Math.hypot(dLat, dLon);
}

/**
 * Move from a point along a compass bearing. Used only for placing geometry the
 * JSON describes in words (e.g. the charted wreck, "31 nm SE"), never to derive
 * a number that is displayed.
 */
export function offsetNm(lat: number, lon: number, bearingDeg: number, nm: number): [number, number] {
  const r = (bearingDeg * Math.PI) / 180;
  return [lat + (nm * Math.cos(r)) / 60, lon + (nm * Math.sin(r)) / (60 * KX)];
}
