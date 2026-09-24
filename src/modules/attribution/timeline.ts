/**
 * Screen 3's timeline — spec 3 §3, about 23 s.
 *
 *   0–2 s     overview · slick, backtrack path, source ellipse · stage 1 ticks
 *   2–4 s     612 tracks draw on
 *   4–5.5 s   the trap: Tessera Bay pulses at the slick's fresh end
 *   5.5–8.5 s tracks dim group by group, in sync with each ✗ line · → 38
 *   8.5–16 s  the rewind loop steps back 30 min at a time
 *   16–17 s   the circle flashes, the playhead locks at the stop step
 *   17–21 s   four evidence beats on the leader
 *   21–23 s   the leader turns magenta, the ranking locks
 *
 * The playhead is a real value in hours-before-image, so the loop table, the
 * meters, the search circle and the ranking all read from the same clock.
 */
import type { TimelineSpec } from '../../shell/timeline';
import { attribution } from '../../data/scenario';

export type AttributionState = {
  stage1: number;
  tracks: number;
  trap: number;
  groupsShown: number;
  /** Hours before the SAR image; drives the search circle and the table. */
  playhead: number;
  flash: number;
  /** 0–4: which evidence beat is showing (spec 3 §4). */
  evidence: number;
  camera: number;
  leader: boolean;
  showRanking: boolean;
};

export function attributionTimeline(stopH: number): TimelineSpec<AttributionState> {
  const rejected = attribution.filter_groups.filter((g) => g.id !== 'cand').length;

  return {
    duration: 23,
    beats: [
      { label: 'overview', at: 0 },
      { label: 'tracks', at: 2 },
      { label: 'trap', at: 4 },
      { label: 'filter', at: 5.5 },
      { label: 'loop', at: 8.5 },
      { label: 'stop', at: 16 },
      { label: 'evidence', at: 17 },
      { label: 'rank', at: 21 },
      { label: 'hold', at: 23 },
    ],
    initial: {
      stage1: 0,
      tracks: 0,
      trap: 0,
      groupsShown: 0,
      playhead: 0,
      flash: 0,
      evidence: 0,
      camera: 0,
      leader: false,
      showRanking: false,
    },

    build(tl, s) {
      tl.to(s, { stage1: 5, duration: 2, ease: 'none' }, 0);
      tl.to(s, { tracks: 1, duration: 1.8, ease: 'power1.out' }, 2);

      // The trap: the nearest ship at image time, which is not the answer.
      tl.to(s, { trap: 1, duration: 0.5 }, 4);
      tl.to(s, { trap: 0.35, duration: 0.6 }, 5.0);

      // Elimination, one group per ✗ line.
      for (let i = 1; i <= rejected; i++) {
        tl.set(s, { groupsShown: i }, 5.5 + (i - 1) * 1);
      }
      tl.set(s, { groupsShown: rejected + 1 }, 8.2);

      // The rewind loop: ease the camera in, then step the playhead back.
      tl.to(s, { camera: 1, duration: 1, ease: 'power2.inOut' }, 8.5);
      tl.to(s, { playhead: stopH, duration: 7, ease: 'none' }, 8.8);

      // The circle flashes and the playhead locks.
      tl.to(s, { flash: 1, duration: 0.25, yoyo: true, repeat: 3 }, 16);

      // Four evidence beats on the leader, about 1 s each.
      tl.to(s, { evidence: 4, duration: 4, ease: 'none' }, 17);

      // The leader turns magenta and the ranking locks.
      tl.set(s, { leader: true }, 21);
      tl.set(s, { showRanking: true }, 21.4);
      tl.to(s, { camera: 0, duration: 1, ease: 'power2.inOut' }, 21.6);
    },
  };
}

/** Captions for the four evidence beats (spec 3 §4). */
export const EVIDENCE_BEATS = [
  { title: 'timing', caption: 'there when the oil was there, not just nearby at some point' },
  { title: 'proximity', caption: '0.3 nm from the rewound oil at the matching time' },
  { title: 'parallelism', caption: 'track runs along the slick, within 3°' },
  { title: 'behaviour', caption: 'slowed inside the window, then resumed' },
] as const;
