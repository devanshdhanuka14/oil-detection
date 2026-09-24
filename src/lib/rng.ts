/**
 * Seeded RNG so every run of the demo is byte-identical (CLAUDE.md §4).
 *
 * Generators take a *named* sub-stream rather than sharing one global sequence:
 * adding or reordering a generator then cannot shift another one's output, so
 * the radar image stays the same when the AIS generator changes.
 */

export const SEED = 26143;

export type Rng = {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Standard normal, Box–Muller. */
  normal(): number;
  /** One item from a list. */
  pick<T>(items: readonly T[]): T;
};

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    normal() {
      // Guard against log(0).
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick: (items) => items[Math.floor(next() * items.length)],
  };
  return rng;
}

/** FNV-1a, so a stream name maps to a stable numeric offset. */
function hash(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A named sub-stream of the scenario seed. */
export function stream(name: string): Rng {
  return mulberry32((SEED ^ hash(name)) >>> 0);
}
