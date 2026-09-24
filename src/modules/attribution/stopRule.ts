/**
 * The joint stopping rule (spec 3 §5.3).
 *
 * Stop when all three hold:
 *   leader ≥ threshold · margin ≥ min_margin · point confidence ≥ floor
 *
 * The point confidence is the drift team's, the leader probability is ours.
 * Both teams' outputs meet in one rule - that is the integration argument, so
 * the rule is evaluated here rather than hardcoded per threshold.
 */
import { attribution, backtrackAt, loopRows, type LoopRow } from '../../data/scenario';

export type Step = LoopRow & {
  pointConfidence: number;
  radiusNm: number;
  margin: number | null;
};

/** The loop rows joined to the drift team's per-point confidence and radius. */
export function steps(): Step[] {
  return loopRows.map((r) => {
    const q = backtrackAt(r.h);
    return {
      ...r,
      pointConfidence: q.point_confidence,
      radiusNm: q.radius_2sig_nm,
      margin: r.p != null && r.second != null ? r.p - r.second : null,
    };
  });
}

export type Outcome = {
  /** The step the loop stopped on. */
  stop: Step;
  /** True when the stop rule was satisfied; false when the loop ran out of
   *  reliable drift and the result is "leading candidate, not conclusive". */
  conclusive: boolean;
  /** Steps printed up to and including the stop. */
  shown: Step[];
  /** Why the loop continued past a step that had a leader over the threshold. */
  blockedBy: Map<number, string>;
};

export function runLoop(threshold: number): Outcome {
  const all = steps();
  const { min_margin, point_conf_floor } = attribution.stop_rule;
  const blockedBy = new Map<number, string>();

  for (const s of all) {
    if (s.p == null) continue;

    // The drift team's confidence is the floor: past it we stop regardless.
    if (s.pointConfidence < point_conf_floor) break;

    const overThreshold = s.p >= threshold;
    const marginOk = s.margin != null && s.margin >= min_margin;

    if (overThreshold && !marginOk && s.margin != null) {
      blockedBy.set(
        s.h,
        `margin rule blocked ${label(s.h)} (${pct(s.p)} vs ${pct(s.p - s.margin)})`,
      );
    }

    if (overThreshold && marginOk) {
      return { stop: s, conclusive: true, shown: all.slice(0, all.indexOf(s) + 1), blockedBy };
    }
  }

  // No candidate reached the threshold before the drift became unreliable.
  const last = all[all.length - 1];
  return { stop: last, conclusive: false, shown: all, blockedBy };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const label = (h: number) => `T−${Number.isInteger(h) ? h : h.toFixed(1)} h`;
