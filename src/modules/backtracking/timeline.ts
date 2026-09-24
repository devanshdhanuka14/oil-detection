/**
 * Screen 2's timeline — spec 2 §3, about 18 s.
 *
 *   0–2 s   map fades in, slick visible · stage 1 ticks
 *   2–4 s   three age rings pulse · window set
 *   4–6 s   forcing layers fade in · stage 2 ticks
 *   6–10 s  600 particles run backward, fanning out
 *   10–12 s particles converge into the 340 km² amber cloud
 *   12–15 s the cloud shrinks to the 18 km² ellipse
 *   15–18 s the source pin drops, 1σ crystallises, panel fills
 *
 * The shrink is synchronised by construction: `cloud` and `refinedShown` are
 * set in the same GSAP position, so the amber cloud cannot compress before the
 * "refined by forward match" line appears (acceptance item 4).
 */
import type { TimelineSpec } from '../../shell/timeline';

export type BacktrackState = {
  map: number;
  stage1: number;
  ageRings: number;
  forcing: number;
  stage2: number;
  /** 0 = at the slick, 1 = fully rewound. */
  rewind: number;
  trails: number;
  /** 1 = the full 340 km² cloud, 0 = fully shrunk to the refined ellipse. */
  cloud: number;
  cloudShown: number;
  refinedShown: boolean;
  ellipse: number;
  pin: number;
  showPanel: boolean;
  /** The "typical approach: one line, no uncertainty" arrow (spec 2 §4). */
  singleArrow: number;
};

export const backtrackTimeline: TimelineSpec<BacktrackState> = {
  duration: 18,
  beats: [
    { label: 'map', at: 0 },
    { label: 'ages', at: 2 },
    { label: 'forcing', at: 4 },
    { label: 'particles', at: 6 },
    { label: 'cloud', at: 10 },
    { label: 'shrink', at: 12 },
    { label: 'source', at: 15 },
    { label: 'hold', at: 18 },
  ],
  initial: {
    map: 0,
    stage1: 0,
    ageRings: 0,
    forcing: 0,
    stage2: 0,
    rewind: 0,
    trails: 0,
    cloud: 1,
    cloudShown: 0,
    refinedShown: false,
    ellipse: 0,
    pin: 0,
    showPanel: false,
    singleArrow: 0,
  },

  build(tl, s) {
    tl.to(s, { map: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.to(s, { stage1: 6, duration: 2, ease: 'none' }, 0);

    tl.to(s, { ageRings: 1, duration: 1.6, ease: 'power2.out' }, 2);

    tl.to(s, { forcing: 1, duration: 1.2, ease: 'power1.out' }, 4);
    tl.to(s, { stage2: 6, duration: 2, ease: 'none' }, 4);

    // The single upwind arrow every competing demo draws, then replaced.
    tl.to(s, { singleArrow: 1, duration: 0.5 }, 5.6);
    tl.to(s, { singleArrow: 0, duration: 0.8 }, 7.4);

    // 600 particles run backward, trails fanning out.
    tl.to(s, { trails: 1, duration: 0.6 }, 6);
    tl.to(s, { rewind: 1, duration: 4, ease: 'power1.inOut' }, 6);

    // They converge into the amber cloud.
    tl.to(s, { cloudShown: 1, duration: 1.4, ease: 'power2.out' }, 10);
    tl.to(s, { trails: 0.35, duration: 1.4 }, 10.4);

    // The shrink. Both of these sit at 12 s, so the line and the compression
    // are the same instant - that link is the whole demo in two seconds.
    tl.set(s, { refinedShown: true }, 12);
    tl.to(s, { cloud: 0, duration: 2.4, ease: 'power2.inOut' }, 12);

    // The pin drops and the ellipse crystallises.
    tl.to(s, { ellipse: 1, duration: 1, ease: 'power2.out' }, 14.6);
    tl.to(s, { pin: 1, duration: 0.6, ease: 'back.out(2)' }, 15);
    tl.set(s, { showPanel: true }, 15.6);
  },
};
