/**
 * Play full case (CLAUDE.md §2).
 *
 *   module 1 → its hand-off toggle for ~2 s → transition →
 *   module 2 → hand-off → transition → module 3
 *
 * Total is about 61 s: 13 + 2 + 1.5 + 18 + 2 + 1.5 + 23.
 *
 * In the transitions the slick outline animates into the next screen's map, and
 * the source ellipse does the same between screens 2 and 3. The controller owns
 * only the sequencing; each module still runs its own timeline.
 */
import { useEffect, useRef, useState } from 'react';
import { MODULE_ORDER, useApp, type ModuleId } from './store';

/** Seconds each module's timeline runs, from its spec's timeline table. */
export const MODULE_SECONDS: Record<ModuleId, number> = {
  detection: 13,
  backtracking: 18,
  attribution: 23,
};

export const HANDOFF_HOLD_S = 2;
export const TRANSITION_S = 1.5;

export const FULL_CASE_SECONDS =
  MODULE_SECONDS.detection +
  HANDOFF_HOLD_S +
  TRANSITION_S +
  MODULE_SECONDS.backtracking +
  HANDOFF_HOLD_S +
  TRANSITION_S +
  MODULE_SECONDS.attribution;

/** Which hand-off toggle each module shows during its hold. */
const HANDOFF_TOGGLE: Record<ModuleId, string> = {
  detection: 'handoff',
  backtracking: 'handoff',
  attribution: 'casefile',
};

export type Phase =
  | { kind: 'module'; module: ModuleId }
  | { kind: 'handoff'; module: ModuleId }
  | { kind: 'transition'; from: ModuleId; to: ModuleId };

/**
 * Drives the full case. Returns the transition state so the shell can draw the
 * carried-over geometry; everything else happens through the store.
 */
export function useFullCase(): { phase: Phase | null; progress: number } {
  const mode = useApp((s) => s.mode);
  const paused = useApp((s) => s.paused);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    if (mode !== 'fullcase') {
      clear();
      setPhase(null);
      return;
    }

    const s = useApp.getState();
    const at = (sec: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, sec * 1000));
    };

    let t = 0;
    clear();

    MODULE_ORDER.forEach((m, i) => {
      const start = t;
      at(start, () => {
        s.setModule(m);
        s.setToggle(null);
        setPhase({ kind: 'module', module: m });
      });
      t += MODULE_SECONDS[m];

      if (i < MODULE_ORDER.length - 1) {
        // Hold on the hand-off panel: this is the integration proof.
        at(t, () => {
          s.setToggle(HANDOFF_TOGGLE[m]);
          setPhase({ kind: 'handoff', module: m });
        });
        t += HANDOFF_HOLD_S;

        const next = MODULE_ORDER[i + 1];
        at(t, () => setPhase({ kind: 'transition', from: m, to: next }));
        t += TRANSITION_S;
      }
    });

    return clear;
  }, [mode]);

  // A simple progress clock for the transition overlay.
  useEffect(() => {
    if (!phase || phase.kind !== 'transition' || paused) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / (TRANSITION_S * 1000));
      setProgress(k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused]);

  return { phase, progress };
}
