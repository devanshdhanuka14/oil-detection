/**
 * The procedural SAR scene (CLAUDE.md §4).
 *
 *   - gamma-distributed speckle over a smooth incidence gradient
 *   - the 47 dark patches rendered *into* the image
 *   - a darker low-wind zone over 8% of the scene (the blind area)
 *
 * Patches are drawn from the same geometry the SVG outlines use, so the outline
 * always sits exactly on the patch. Nothing here is fetched or loaded.
 */
import { stream } from '../rng';
import type { Patch } from './patches';
import type { Projection } from '../../map/projection';

/**
 * Number of looks. The processing panel says "speckle filtered", so the sea is
 * multi-looked rather than raw single-look: high enough to read as a filtered
 * scene, low enough to still look like radar and not a photograph.
 */
const LOOKS = 12;

/** Sum of k exponentials = gamma(k). k is the number of looks: higher = smoother. */
function gammaSpeckle(rand: () => number, looks: number): number {
  let s = 0;
  for (let i = 0; i < looks; i++) s += -Math.log(1 - rand());
  return s / looks;
}

/** Signed distance from a point to a polygon, in pixels. Negative = inside. */
function signedDistance(px: number, py: number, poly: Float64Array): number {
  let inside = false;
  let best = Infinity;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    // distance to segment i-j
    const dx = xj - xi;
    const dy = yj - yi;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - xi) * dx + (py - yi) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = xi + t * dx - px;
    const ey = yi + t * dy - py;
    const d = Math.hypot(ex, ey);
    if (d < best) best = d;
  }
  return inside ? -best : best;
}

type Blob = { poly: Float64Array; depthDb: number; softPx: number; bbox: [number, number, number, number] };

function toPixels(ring: [number, number][], p: Projection): Float64Array {
  const a = new Float64Array(ring.length * 2);
  ring.forEach(([lat, lon], i) => {
    const q = p.project(lat, lon);
    a[i * 2] = q.x;
    a[i * 2 + 1] = q.y;
  });
  return a;
}

function bboxOf(poly: Float64Array, pad: number): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    if (poly[i] < x0) x0 = poly[i];
    if (poly[i] > x1) x1 = poly[i];
    if (poly[i + 1] < y0) y0 = poly[i + 1];
    if (poly[i + 1] > y1) y1 = poly[i + 1];
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/**
 * Render the scene into an ImageData. Called once; the result is cached by the
 * component, so there is no per-frame cost and no loading state.
 */
export function renderRadar(
  w: number,
  h: number,
  patches: Patch[],
  blindRing: [number, number][],
  p: Projection,
): ImageData {
  const rand = stream('radar').next;
  const img = new ImageData(w, h);
  const d = img.data;

  // Pre-project every patch, with a feather width set by its edge softness.
  const blobs: Blob[] = patches.map((patch) => {
    const rings = patch.fragments ?? [patch.ring];
    // Fragments are merged into one blob list below; here keep the first.
    const poly = toPixels(rings[0], p);
    const softPx = 1.0 + patch.edgeSoftness * 9;
    return { poly, depthDb: patch.depthDb, softPx, bbox: bboxOf(poly, softPx * 3) };
  });
  // Fragmented slicks contribute each fragment separately.
  for (const patch of patches) {
    const rings = patch.fragments;
    if (!rings) continue;
    for (let i = 1; i < rings.length; i++) {
      const poly = toPixels(rings[i], p);
      const softPx = 1.0 + patch.edgeSoftness * 9;
      blobs.push({ poly, depthDb: patch.depthDb, softPx, bbox: bboxOf(poly, softPx * 3) });
    }
  }

  const blind = toPixels(blindRing, p);

  // The blind zone covers 8% of a ~1.2 Mpx scene; testing every pixel against
  // its 72 vertices would cost ~86M distance computations and blow the 3 s
  // budget. It is one large smooth blob, so its distance field is sampled on a
  // coarse grid and bilinearly interpolated - visually identical, ~60x cheaper.
  const GRID = 8;
  const gw = Math.ceil(w / GRID) + 1;
  const gh = Math.ceil(h / GRID) + 1;
  const blindField = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      blindField[gy * gw + gx] = signedDistance(gx * GRID, gy * GRID, blind);
    }
  }
  const sampleBlind = (x: number, y: number): number => {
    const fx = x / GRID;
    const fy = y / GRID;
    const x0 = Math.min(gw - 2, fx | 0);
    const y0 = Math.min(gh - 2, fy | 0);
    const tx = fx - x0;
    const ty = fy - y0;
    const a = blindField[y0 * gw + x0];
    const b = blindField[y0 * gw + x0 + 1];
    const c = blindField[(y0 + 1) * gw + x0];
    const d2 = blindField[(y0 + 1) * gw + x0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d2 * tx) * ty;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Incidence gradient: the sea is brighter in near range (left) than far.
      const across = x / w;
      let sigma = 0.30 - 0.09 * across + 0.022 * Math.sin((y / h) * 2.2);

      // The low-wind zone: the sea itself goes dark, so nothing is detectable.
      const db = sampleBlind(x, y);
      if (db < 26) {
        const k = db <= 0 ? 1 : 1 - db / 26;
        sigma *= 1 - 0.38 * k * k;
      }

      // Dark patches, feathered by their own edge softness.
      for (const b of blobs) {
        if (x < b.bbox[0] || x > b.bbox[2] || y < b.bbox[1] || y > b.bbox[3]) continue;
        const dist = signedDistance(x, y, b.poly);
        if (dist > b.softPx * 2) continue;
        // smoothstep from 1 (deep inside) to 0 (outside the feather)
        const t = Math.max(0, Math.min(1, 0.5 - dist / (b.softPx * 2)));
        const k = t * t * (3 - 2 * t);
        sigma *= Math.pow(10, (b.depthDb * k) / 20);
      }

      // 4-look gamma speckle, the multiplicative noise that makes SAR look SAR.
      const speckle = gammaSpeckle(rand, LOOKS);
      const v = Math.max(0, Math.min(1, sigma * speckle));
      // Mild gamma for display, as an operator's stretch would apply.
      const g = Math.pow(v, 0.95);
      const px = Math.round(g * 232);

      const o = (y * w + x) * 4;
      // Very slightly cool grey, so the red and yellow outlines sit off it cleanly.
      d[o] = px;
      d[o + 1] = px;
      d[o + 2] = Math.min(255, px + 6);
      d[o + 3] = 255;
    }
  }
  return img;
}
