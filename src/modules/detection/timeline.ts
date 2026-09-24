/**
 * Screen 1's timeline — spec 1 §3, about 13 s.
 *
 *   0–2 s   radar fades in · processing lines tick off
 *   2–5 s   47 outlines draw on · FOUND 47 dark patches
 *   5–6 s   zoom to one slick (the 4 outline beats)
 *   6–7 s   zoom back out
 *   7–11 s  rejected outlines dim, group by group, in sync with the ✗ lines
 *   11–13 s the 2 confirmed snap to red, then the slick panel fills
 *
 * The elimination is synchronised by construction: each ✗ line and its group's
 * outlines are driven by the same `groupsShown` counter, so the picture cannot
 * dim a different number of outlines than the log claims (acceptance item 3).
 */
import type { TimelineSpec } from '../../shell/timeline';
import { detection } from '../../data/scenario';

export type DetectionState = {
  radar: number;
  outlines: number;
  processingLines: number;
  showFound: boolean;
  showMeasuring: boolean;
  /** How many of the four group lines (3 rejections + 1 confirmation) have landed. */
  groupsShown: number;
  confirmed: boolean;
  showPanel: boolean;
  /** 0 = wide, 1 = zoomed on S01, for the outline-building beats. */
  zoom: number;
  zoomBeat: number;
};

const PROCESSING_LINES = 6;

export const detectionTimeline: TimelineSpec<DetectionState> = {
  duration: 13,
  beats: [
    { label: 'image', at: 0 },
    { label: 'found', at: 2 },
    { label: 'zoom', at: 5 },
    { label: 'out', at: 6 },
    { label: 'eliminate', at: 7 },
    { label: 'confirm', at: 11 },
    { label: 'hold', at: 13 },
  ],
  initial: {
    radar: 0,
    outlines: 0,
    processingLines: 0,
    showFound: false,
    showMeasuring: false,
    groupsShown: 0,
    confirmed: false,
    showPanel: false,
    zoom: 0,
    zoomBeat: 0,
  },

  build(tl, s) {
    // 0–2 s: the image fades in while the processing lines tick off.
    tl.to(s, { radar: 1, duration: 1.4, ease: 'power2.out' }, 0);
    tl.to(s, { processingLines: PROCESSING_LINES, duration: 2, ease: 'none' }, 0);

    // 2–5 s: 47 outlines draw on.
    tl.set(s, { showFound: true }, 2);
    tl.to(s, { outlines: 1, duration: 2.6, ease: 'power1.out' }, 2.2);
    tl.set(s, { showMeasuring: true }, 4.2);

    // 5–6 s: the four outline-building beats, zoomed on S01.
    tl.to(s, { zoom: 1, duration: 0.5, ease: 'power2.inOut' }, 5);
    tl.to(s, { zoomBeat: 4, duration: 4.8, ease: 'none' }, 5.2);

    // 6–7 s: back out. (The beats run over the zoom; the camera eases back
    // once they have played, which is what the spec's table describes.)
    tl.to(s, { zoom: 0, duration: 0.6, ease: 'power2.inOut' }, 10.2);

    // 7–11 s: the three rejection groups dim, one per ✗ line.
    const rejected = detection.groups.filter((g) => g.id !== 'oil').length;
    for (let i = 1; i <= rejected; i++) {
      tl.set(s, { groupsShown: i }, 7 + (i - 1) * 1.2);
    }

    // 11–13 s: ✓ 2 CONFIRMED OIL, then the slick panel.
    tl.set(s, { groupsShown: rejected + 1, confirmed: true }, 11);
    tl.set(s, { showPanel: true }, 11.6);
  },
};
