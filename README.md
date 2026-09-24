# PS 26143 prototype — detection · backtracking · vessel attribution

SIH 2026, PS 26143 (NTRO). A hardcoded, offline demo: detect an oil slick in
satellite radar, backtrack it to its source, and rank the vessels that could
have released it.

**Synthetic scenario. Fictional vessels. Not a reconstruction of the MSC Elsa 3
incident.** That badge is on screen at all times, including in recordings.

## Running it

```
npm install     # once
npm run dev     # http://localhost:5173
```

It runs with Wi-Fi off. Nothing is fetched at runtime — fonts, the coastline and
the whole scenario are bundled.

For a recording, `npm run build && npm run preview` serves the production build.
The stage is a fixed 1920×1080 scaled to the window, so the layout never
reflows; record at 1080p for a pixel-exact capture.

## Presenter keys

| key | |
|---|---|
| `1` `2` `3` | switch module |
| `F` | play the full case (~63 s, all three modules with the hand-offs) |
| `E` | explore mode — jump to the end state, everything clickable |
| `Space` | play / pause |
| `R` | restart the module |
| `T` | cycle the toggles |
| `←` `→` | step between timeline beats |

There is no pan or zoom anywhere. Camera moves are scripted only.

**Explore mode is what you want when a judge asks a question.** It holds the end
state and everything responds: click any patch, track, the source ellipse or a
particle trail; drag the rewind scrubber; move the threshold slider.

## The three things to show

1. **Screen 1 — 47 → 2.** Click a yellow outline. The system says *why* it
   rejected it. Rejection is the contribution, not detection.
2. **Screen 2 — 340 → 18 km².** The cloud shrinking is the whole demo in two
   seconds. Click the ellipse for what drives the uncertainty.
3. **Screen 3 — 612 → 38 → 3.** Click MV Tessera Bay: the nearest ship at image
   time, which arrived 16 h after the oil. Then set the threshold to 80% and the
   system says it cannot reach an answer.

## Tests

```
npm test
```

Two mechanical checks, both of which have caught real bugs:

- `check:geometry` — the drawn S01 outline must carry the area the panel claims,
  at all three outline levels, over the stated 18.0 km extent, reaching the
  fresh end and the tail, with `box_vs_outline` equal to its own bounding box.
- `audit:numbers` — no component may hold a scenario number.

## Where the numbers come from

`src/data/scenario.json` is the single source of truth. No component holds a
scenario number; `npm run audit:numbers` checks that mechanically and fails on
any literal that matches a value in the JSON.

The S01 fragment widths are *solved* rather than assumed: the generator bisects
a width scale until the drawn polygon's area equals the stated area for that
outline level. Extent, fragment count and the two end positions are fixed by
the spec, so width is the only free parameter.

`src/data/coastline.geojson` was built once from Natural Earth 10 m land by
`scripts/make-coastline.ts` and committed. That script is kept for provenance
and is not part of the build.

## Layout

```
src/
  data/       scenario.json + typed access, coastline.geojson
  shell/      stage, module bar, badge, store, keyboard, timelines, full case
  map/        projection, basemap, camera
  ui/         panels, tick lines, ESTIMATED blocks, meters, controls
  lib/        seeded RNG, time helpers, generators (radar, patches, particles, AIS)
  modules/    detection · backtracking · attribution
```

Three points where the drawn geometry and a stated number disagree are marked
`// SPEC-CONFLICT` in the code, with the reasoning. In each case the label reads
from `scenario.json` and the geometry is drawn as close to it as it can be.
