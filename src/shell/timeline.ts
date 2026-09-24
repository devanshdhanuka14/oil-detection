/**
 * One GSAP master timeline per module, with labelled beats (CLAUDE.md §3).
 *
 * The timeline is the single clock: components render from a plain progress
 * object it tweens, so Play, Explore, the arrow keys and Play-full-case all
 * drive the same code path. Explore is simply "seek to the end".
 */
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './store';

/** A labelled beat: `at` is seconds from the module's start. */
export type Beat = { label: string; at: number };

export type TimelineSpec<S extends object> = {
  /** Total run time in seconds, from the module's spec timeline table. */
  duration: number;
  beats: Beat[];
  /** The animated state at t = 0. */
  initial: S;
  /** Build the tweens onto the timeline, mutating `state`. */
  build: (tl: gsap.core.Timeline, state: S) => void;
};

export type TimelineApi<S> = {
  state: S;
  /** Seconds elapsed. */
  time: number;
  beats: Beat[];
  /** Index of the beat the playhead is at or past. */
  beatIndex: number;
  seekBeat: (i: number) => void;
  restart: () => void;
  done: boolean;
};

/**
 * Run a module timeline. `mode` decides whether it plays, holds at the end
 * (Explore) or is driven by the full-case controller.
 */
export function useTimeline<S extends object>(spec: TimelineSpec<S>, deps: unknown[] = []): TimelineApi<S> {
  const mode = useApp((s) => s.mode);
  const paused = useApp((s) => s.paused);
  const beat = useApp((s) => s.beat);

  const [, force] = useState(0);
  const stateRef = useRef<S>({ ...spec.initial });
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    // Reset to the initial state, then rebuild.
    Object.assign(stateRef.current, spec.initial);

    const tl = gsap.timeline({
      paused: true,
      onUpdate: () => {
        timeRef.current = tl.time();
        force((n) => n + 1);
      },
    });
    for (const b of spec.beats) tl.addLabel(b.label, b.at);
    spec.build(tl, stateRef.current);

    tlRef.current = tl;

    if (mode === 'explore') {
      // Explore is the end state, fully interactive. No animation runs.
      tl.progress(1, false);
      timeRef.current = tl.duration();
      force((n) => n + 1);
    } else {
      tl.play(0);
    }

    return () => {
      tl.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ...deps]);

  // Space pauses and resumes.
  useEffect(() => {
    const tl = tlRef.current;
    if (!tl || mode === 'explore') return;
    if (paused) tl.pause();
    else tl.play();
  }, [paused, mode]);

  // Arrow keys step between labelled beats. This acts only on a real *change*
  // of beat: seeking on mount would pause the timeline at t=0 before it ever
  // plays, and a first-run flag is not enough because StrictMode invokes the
  // effect twice.
  const lastBeat = useRef(beat);
  useEffect(() => {
    if (lastBeat.current === beat) return;
    lastBeat.current = beat;
    const tl = tlRef.current;
    if (!tl || mode === 'explore') return;
    const b = spec.beats[Math.min(beat, spec.beats.length - 1)];
    if (b) tl.pause().seek(b.at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  const time = timeRef.current;
  const beatIndex = Math.max(
    0,
    spec.beats.reduce((acc, b, i) => (time + 1e-6 >= b.at ? i : acc), 0),
  );

  return {
    state: stateRef.current,
    time,
    beats: spec.beats,
    beatIndex,
    seekBeat: (i) => {
      const b = spec.beats[i];
      if (b) tlRef.current?.pause().seek(b.at);
    },
    restart: () => tlRef.current?.restart(),
    done: tlRef.current ? tlRef.current.progress() >= 1 : false,
  };
}
