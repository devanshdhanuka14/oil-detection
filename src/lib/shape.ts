/**
 * Shape measurement from a drawn outline.
 *
 * Elongation is the major ÷ minor axis of the moment-fitted ellipse: the
 * ellipse with the same area and the same second moments as the polygon. It is
 * measured the same way for a confirmed slick and for a rejected look-alike, so
 * "elongation 8.2" and "elongation 1.6" are the same quantity and the
 * comparison between them is fair.
 */

const KM_PER_DEG_LAT = 111.32;
const KX = Math.cos((9.75 * Math.PI) / 180);

export type Moments = {
  areaKm2: number;
  centroid: [number, number];
  /** Semi-axes of the moment-fitted ellipse, in km. */
  majorKm: number;
  minorKm: number;
  /** major / minor. */
  elongation: number;
  /** Bearing of the major axis, degrees clockwise from north. */
  axisDeg: number;
};

/** Project a lat/lon ring onto a local km plane, so moments are metric. */
function toKm(ring: [number, number][]): [number, number][] {
  return ring.map(([lat, lon]) => [lon * KM_PER_DEG_LAT * KX, lat * KM_PER_DEG_LAT]);
}

/**
 * Second moments of a polygon's *area* (not of its vertices — sampling the
 * vertices would weight the rounded ends, where points bunch, far too heavily).
 */
export function polygonMoments(ringLatLon: [number, number][]): Moments {
  const pts = toKm(ringLatLon);
  // Drop a duplicated closing vertex if present.
  const n =
    pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
      ? pts.length - 1
      : pts.length;

  let a2 = 0; // 2 * signed area
  let cx = 0;
  let cy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    a2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
    sxx += (x0 * x0 + x0 * x1 + x1 * x1) * cross;
    syy += (y0 * y0 + y0 * y1 + y1 * y1) * cross;
    sxy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * cross;
  }

  const area = a2 / 2;
  const absArea = Math.abs(area);
  cx /= 3 * a2;
  cy /= 3 * a2;

  // Second moments about the centroid, normalised by area = covariance.
  const m20 = sxx / (12 * area) - cx * cx;
  const m02 = syy / (12 * area) - cy * cy;
  const m11 = sxy / (24 * area) - cx * cy;

  // Eigenvalues of [[m20, m11], [m11, m02]].
  const mid = (m20 + m02) / 2;
  const diff = Math.sqrt(((m20 - m02) / 2) ** 2 + m11 * m11);
  const l1 = Math.max(1e-12, mid + diff);
  const l2 = Math.max(1e-12, mid - diff);

  // For an ellipse of semi-axes a, b the variances are a²/4 and b²/4.
  const majorKm = 2 * Math.sqrt(l1);
  const minorKm = 2 * Math.sqrt(l2);

  // Orientation of the major axis, as a compass bearing.
  const thetaMath = 0.5 * Math.atan2(2 * m11, m20 - m02);
  const axisDeg = (((90 - (thetaMath * 180) / Math.PI) % 360) + 360) % 360;

  return {
    areaKm2: absArea,
    centroid: [cy / KM_PER_DEG_LAT, cx / (KM_PER_DEG_LAT * KX)],
    majorKm,
    minorKm,
    elongation: majorKm / minorKm,
    axisDeg,
  };
}

/** Elongation of a ring: major ÷ minor axis of its moment-fitted ellipse. */
export const elongationOf = (ring: [number, number][]): number => polygonMoments(ring).elongation;

/** The fragment with the largest area, which is what S01's elongation is measured on. */
export function largestRing(rings: [number, number][][]): [number, number][] {
  return rings.reduce((best, r) => (polygonMoments(r).areaKm2 > polygonMoments(best).areaKm2 ? r : best), rings[0]);
}
