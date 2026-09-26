# CLAUDE.md — PS 26143 Prototype (Detection · Backtracking · Vessel Attribution)

## 0. What you are building

A **hardcoded, no-backend demo app** for Smart India Hackathon 2026, PS 26143 (NTRO):
detect an oil slick in satellite radar, backtrack it to its source, and rank the vessels
that could have released it.

The app has three module screens inside one shell. It is shown **live by a presenter**
and also **recorded as a video**, so it needs both a scripted Play mode and a clickable
Explore mode.

Read these before writing code:

| File | What it is |
|---|---|
| `scenario.json` | **Single source of truth for every number, name, coordinate and time.** |
| `specs/1_detection_ui_spec.md` | Screen 1. Features fixed by the detection team. |
| `specs/2_backtracking_ui_spec.md` | Screen 2. Features fixed by the backtracking team. |
| `specs/3_attribution_ui_spec.md` | Screen 3. Our module. |
| `CHANGES_FOR_TEAMS.md` | Why some numbers differ from the teams' original drafts. |

## 1. Non-negotiables

1. **Every feature in the three specs is built as written.** Don't add, remove or
   redesign features in specs 1 and 2. If something looks wrong, ask; don't change it.
2. **No number is hardcoded in a component.** Everything comes from `scenario.json`.
   If a spec's text and the JSON disagree, the JSON wins; leave a `// SPEC-CONFLICT` note.
3. **Synthetic scenario badge**, always visible in the shell:
   *"Prototype · synthetic scenario · fictional vessels · not a reconstruction of the MSC Elsa 3 incident"*.
4. **Wording rules** from all three specs apply everywhere (section 7 of this file).
5. **No user pan or zoom.** Camera moves are scripted only. No page navigation inside a module.
6. **Works fully offline.** No runtime network calls, no CDN fonts, no tile servers.
7. **No loading state longer than 3 s.**

## 2. App structure

```
┌ Module bar ───────────────────────────────────────────────────────────────────┐
│ [1 DETECT 47 → 2] ─▶ [2 BACKTRACK 340 → 18 km²] ─▶ [3 ATTRIBUTE 612 → 38 → 3]  │
│                                   ▶ Play full case   ◻ Explore   [synthetic badge] │
└───────────────────────────────────────────────────────────────────────────────┘
│                    active module screen (exactly as its spec)                  │
```

- **Module bar** (about 44 px tall) sits above each spec's own header. Each module
  button shows its headline counter, which stays visible at all times.
- **Play mode**: runs the active module's scripted timeline from its spec's timeline
  table, then holds on the end state.
- **Play full case**: runs module 1 → its hand-off toggle for about 2 s → transition →
  module 2 → hand-off → transition → module 3. Total is about 60 s. In the transitions,
  the slick outline animates into the next screen's map; the source ellipse does the
  same between screens 2 and 3.
- **Explore mode**: jumps to the end state with everything clickable (click-to-card,
  sliders, toggles, scrubber). This is what the live presenter uses to answer questions.
- Each spec's hand-off toggle has an **"Open in next module →"** link.

**Keyboard** (for the presenter):
- `1` `2` `3`: switch module
- `Space`: play / pause
- `R`: restart the module
- `F`: play full case
- `E`: explore mode
- `T`: cycle toggles
- `Z`: presenter magnifier — right panel at 1.5×, Explore only (`Z` or `Esc` to close)
- `←` `→`: step between timeline beats

## 3. Stack and rendering

- React 18 + TypeScript + Vite. State: Zustand. Animation: **GSAP timelines** (one
  master timeline per module, with labelled beats).
- **Maps: SVG over a static basemap. No map library.** Use a fixed equirectangular
  projection per screen from `scenario.geo` bboxes, with x scaled by cos(9.75°).
  Scripted camera = tweening the viewBox.
- **Canvas 2D** for heavy layers: radar speckle, 600 particles, 612 AIS tracks.
- **Coastline:** Natural Earth 10 m land, clipped to lat 8.4–10.8 and lon 74.7–77.0,
  committed as `src/data/coastline.geojson`. If unavailable, draw from
  `scenario.geo.coastline_fallback_points`.
- **Fixed 1920×1080 stage**, scaled to fit the window (letterboxed) so the layout never
  reflows while recording.
- **Minimum live resolution is 1440×800. Recording is always 1920×1080.**
  The stage scales uniformly, so panel type shrinks with the window: 13 px renders at
  9.6 px at 1440×800 and 8.7 px at 1280×720. Below 1440×800 the panel is legible to a
  presenter leaning in, but not to a room. The `Z` magnifier covers the gap when a
  smaller screen is unavoidable.
- Fonts bundled locally: Inter (UI) and JetBrains Mono (numbers, coordinates, JSON).

## 4. Generated (synthetic) data

Use a seeded RNG (`seed = 26143`, mulberry32) for everything below, so every run is identical.

- **Radar image (screen 1):** procedural sea texture:
  - Gamma-distributed speckle over a smooth incidence gradient.
  - The 47 dark patches rendered into it: S01 and S02 use the S01/S02 geometry from the
    JSON; 45 look-alikes use shapes matching their rejection reason (fuzzy-edged blobs,
    round low-elongation blobs, faint noise-floor patches).
  - A darker low-wind zone covering 8% of the scene (the blind area).
  - Generate the patch outlines from the same fields so outlines match the image exactly.
- **S01 geometry:** an elongated polygon along 135° through `centre`, from `fresh_end`
  to `tail`, 18 km × 690 m, 3 fragments. It has three outline levels (tight / expected /
  generous) using the areas in `outline_levels`.
- **Particles (screen 2):**
  - 600 particles, 200 per age hypothesis, seeded uniformly inside the S01 polygon.
  - Advect them backward along the net drift, `0.40 m/s toward 055°`, reversed.
  - Add spread that grows with age; the 36 h group spreads widest.
  - Each group's cloud centroid must land on `backtracking.centroids`.
- **AIS tracks (screen 3):** 612 tracks, with counts per `attribution.filter_groups`:
  - **402 reach:** coastal-lane traffic (330°/150°, 25–45 nm offshore), a western
    transit lane, and fishing clusters, all kept away from the backtrack path by more
    than the step radius.
  - **131 time:** tracks that cross the backtrack path, but more than 2 h away from the
    time the oil was at that point.
  - **41 port:** short tracks inside the Kochi port limits near 9.965 N, 76.24 E.
  - **38 candidates:** pass within the step radius at a matching time. Three of them are
    V-A, V-B and V-C from the JSON (exact waypoints); 35 are low-probability passers.
  - Names for generated tracks come from a seeded fictional word list (e.g. "MV Amber
    Tern"). MMSIs are always masked, e.g. `4xx•••123 (synthetic)`.
- **V-A, V-B, V-C, Tessera Bay:** use the exact waypoints in `attribution.vessels`,
  interpolated linearly in time. V-C loiters in a seeded zig-zag inside its
  `loiter_radius_km`.

## 5. Visual system

- **Theme:** dark operations console.
  - background `#0B1220`, panel `#111A2B`, panel border `#1E2A40`
  - text `#E6EDF7`, muted `#8A9BB3`
  - ✓ lines in green `#3DDC97`, ✗ lines in muted red `#E0605A`
- **Panel lines** appear with a 150 ms fade and slide, and the ✓/✗ icon ticks in first.
  Numbers count up over 400 ms.
- **ESTIMATED — NOT MEASURED / NOT COMPUTED** blocks look the same on all three screens:
  background `#1A2438`, a 3 px amber left bar, italic values, and their own header.
- **"NOT RESOLVABLE / NOT MEASURABLE"** blocks: muted text, no icons.
- **Merged colour table.** Each spec's own table governs its own screen; shared meanings
  must match across screens:

| meaning | colour |
|---|---|
| confirmed oil / slick | solid red `#FF4D4D` outline, 20% fill |
| look-alike (rejected) | yellow `#F2C94C` dashed, dims to 15% |
| blind / no-coverage area | grey hatching |
| radar bright target | small blue `#4DA3FF` triangle |
| source ellipse | red outline, 15% fill; 1σ solid, 2σ dashed |
| source cloud (pre-refinement) | amber `#F2A541` at 40% |
| particle trails | orange (12 h) · white (24 h) · blue (36 h) |
| forecast | orange gradient contours |
| AIS track (not candidate) | grey at 35% |
| candidate | teal `#2EC4B6` |
| leading candidate | magenta `#FF4FD8` |
| search circle / reachability | cyan `#5CE1E6`, dashed / 10% fill |
| fixed source | purple `#A77BFF` square |

## 6. Folder structure

```
src/
  data/scenario.json, coastline.geojson
  shell/        ModuleBar, SyntheticBadge, PlayController, Stage1080, keyboard.ts
  map/          projection.ts, Basemap.tsx, Camera.ts
  ui/           Panel, TickLine, EstimatedBlock, Toggle, Slider, LayerChips, ProbBar, Meter, Card
  lib/          rng.ts, generators/{radar,patches,particles,aisTracks}.ts, time.ts
  modules/
    detection/     DetectionScreen, RadarCanvas, PatchLayer, panels/*, timeline.ts
    backtracking/  BacktrackScreen, ParticleCanvas, CloudLayer, panels/*, timeline.ts
    attribution/   AttributionScreen, AisCanvas, LoopLayer, panels/*, timeline.ts
  theme/tokens.ts
```

## 7. Merged wording rules

- Never "oil spill detected" on a rejected patch. Write "dark patch, judged not oil".
- Never show a volume, density or oil type without "estimated", "reported" or "assigned" beside it.
- Never "vessel identified" for a radar bright target. Write "possible vessel, radar only, not AIS".
- Never "source located at" without the uncertainty ellipse on screen.
- Never show a source time without "±" and the range.
- Never "oil will reach the coast". Write "coast impact probability: X% by 72 h".
- Never "polluter identified", "responsible" or "guilty". Write "leading candidate · X% · not a determination".
- Never show a ranking without the "no visible ship" row.
- Never show FSS without its baseline (0.14 vs 0.058).

## 8. Build order across the whole app

Each module's own build order lives in its spec. Across modules:

1. Shell: stage, module bar, badge, scenario loader, projection, basemap.
2. Build item 1 of each module (the static main screens). **After this the demo works.**
3. Items 2–3 of each module (the signature animations: elimination, cloud shrink, rewind loop + trap).
4. Play full case and the transitions.
5. The remaining items in each spec, then keyboard polish.

## 9. Acceptance checklist

- [ ] Every number on screen can be traced to `scenario.json`.
- [ ] The three counters are visible in the module bar at all times.
- [ ] Screen 1's elimination dims exactly 29, 11 and 5 outlines, in sync with the ✗ lines.
- [ ] Screen 2's cloud shrinks 340 → 18 km² at the moment "refined by forward match" appears.
- [ ] Screen 3's STOP happens at T−18 h at the 65% threshold; 50% and 80% behave as the spec says.
- [ ] Probabilities in the ranking sum to exactly 100%.
- [ ] Tessera Bay's card is reachable by clicking it.
- [ ] The synthetic badge is visible in every frame, including recordings.
- [ ] Runs with Wi-Fi off. Full case plays in about 60 s with no dropped frames at 1080p.
- [ ] No user pan or zoom anywhere.

## 10. Do not

Everything in the "Do not" sections of all three specs, plus:
- Do not fetch anything at runtime.
- Do not use real vessel names, real MMSIs or real ship photos.
- Do not show training loss curves, convergence curves or accuracy numbers anywhere.
