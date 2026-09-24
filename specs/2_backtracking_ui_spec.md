# Oil Spill Backtracking — UI Prototype Spec

> **Corrected copy for the prototype build.** Features are unchanged. Some numbers were corrected so all three screens agree; see `CHANGES_FOR_TEAMS.md`. At build time every number is read from `scenario.json`, which wins if anything here disagrees.

SIH 2026, PS 26143. For the prototype team.

**One screen.** Map on the left, everything appearing on the right as it
happens. No page navigation. Three toggles swap the right panel; nothing else moves.

No backend needed. Every value here is what the system really outputs.

---

## 1. What this demo has to prove

1. **We understand that backtracking is not replay.** Anyone can draw an arrow
   pointing upwind. Our system solves an inverse physics problem, handles unknown
   spill age, and quantifies how wrong it could be.
2. **The work is narrowing, not guessing.** We start with the entire ocean and
   systematically eliminate it. If the screen shows only the answer, that elimination
   is invisible — and elimination is what makes courts trust the result.
3. **We know where the uncertainty lives.** A system that admits "the source is
   somewhere in this ellipse" is trusted more than one that pins a single dot.

Every element below serves one of those three.

---

## 2. The layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Backtracking · Slick S01 · 28 May 2025 00:41 UTC · Arabian Sea     │
│  Age window: 12 – 36 h   ·   Source cloud: 340 km²  →  18 km²      │
├───────────────────────────────┬─────────────────────────────────────┤
│                               │  STAGE 1 — AGE ESTIMATION           │
│                               │  ✓ slick area: 12.4 km²             │
│                               │  ✓ oil type: HFO → C = 0.48         │
│                               │  ✓ Fay inversion: T = 14 – 42 h     │
│                               │  ✓ morphology: elongated → < 36 h   │
│                               │  ✓ window set: 12, 24, 36 h         │
│                               │                                     │
│        THE OCEAN MAP          │  STAGE 2 — FORCING DATA             │
│   (probability cloud draws    │  ✓ HYCOM currents fetched           │
│    on top, shrinks as stages  │  ✓ ERA5 wind fetched                │
│    run; particle trails show  │  ✓ CMEMS Stokes drift fetched       │
│    then fade)                 │                                     │
│                               │  STAGE 3 — BACKTRACKING             │
│                               │  ✓ 600 particles run backward       │
│                               │  ✓ 3 age hypotheses tested          │
│                               │  ✓ source cloud: 340 km²            │
│                               │  ✓ refined by forward match: 18 km² │
│                               │                                     │
│                               │  ── SOURCE ESTIMATE ──              │
│                               │  9.62° N, 75.76° E  ±1.3 nm (1σ)   │
│                               │  27 May 2025 · 06:41 UTC (−18/+6 h) │
│                               │  18 h before SAR image              │
│                               │  forward match quality: 0.14 FSS    │
├───────────────────────────────┴─────────────────────────────────────┤
│ 🔴 source · 🟠 forecast · 🔵 particles · 🟡 ensemble spread          │
│ [ Age window ●────── ]   [ Uncertainty  ●────── ]                   │
└─────────────────────────────────────────────────────────────────────┘
```

The counter **340 km² → 18 km²** in the header stays visible the whole time.
It is the single most persuasive element in the demo.
It shows that the system narrows the search space, not just draws a dot.

---

## 3. The timeline (about 18 seconds, one continuous shot)

| Time | LEFT (map) | RIGHT (panel) |
|---|---|---|
| 0–2 s | map fades in, confirmed slick polygon visible in red | Stage 1 lines tick off one by one |
| 2–4 s | three coloured age-rings pulse outward from slick centroid | `window set: 12, 24, 36 h` |
| 4–6 s | forcing data layers fade in as overlays — current arrows, wind barbs | Stage 2 lines tick off |
| 6–10 s | 600 particle trails animate backward from the slick, fanning out, colour-coded by age hypothesis | `600 particles run backward · 3 age hypotheses` |
| 10–12 s | particles converge into a wide amber cloud (340 km²) | `source cloud: 340 km²` |
| 12–15 s | cloud pulses, then shrinks to tight red ellipse (18 km²) | `refined by forward match: 18 km²` |
| 15–18 s | source pin drops at peak; 1σ ellipse crystallises around it | source panel fills in |
| hold | everything visible together | |

The cloud shrinking is **synchronised**: the moment "refined by forward match" appears
on the right, the amber cloud visibly compresses to the red ellipse on the left.
That link is what makes the Bayesian refinement legible to a non-specialist.

---

## 4. The physics animation beats (the 4-second backward run, seconds 6–10)

Zoomed out to show the full ocean region. Four beats, roughly 1 s each.

**Beat 1 — seeding.** 600 small dots appear distributed across the slick polygon
(not just the centroid). Caption: *particles seeded across the whole observed slick, not just its centre*

**Beat 2 — reverse advection.** Dots begin moving backward. Three colours: orange
(12h hypothesis), white (24h), blue (36h). Each dot follows a slightly different
path — the spread between dots of the same colour is the ensemble uncertainty.
Caption: *each particle follows a different plausible wind and current history*

**Beat 3 — divergence.** The three colour groups separate clearly as they travel
further back. The 36h group (blue) spreads widest. Caption: *older hypotheses carry more uncertainty — the physics tells us this*

**Beat 4 — cloud formation.** Dots fade to 30% opacity. Their density is rendered
as a heat map. The three clouds overlap but peak at slightly different locations.
Caption: *where they cluster is where the spill most likely started*

**Add one moment here:** show a single straight arrow pointing directly upwind from
the slick, labelled **"typical approach: one line, no uncertainty"**. Then fade it out
as the particle cloud replaces it. Five seconds. Every competing demo uses a single
arrow. This undoes that comparison.

---

## 5. The right panel in detail

### 5.1 While running — Stage 1 (seconds 0–2)

```
STAGE 1 — AGE ESTIMATION
✓ Slick area received: 12.4 km²
✓ Oil type: HFO (reported: furnace oil + diesel)  →  spreading constant C = 0.48
✓ Fay inversion: spill is 14–42 h old  (volume 6–370 m³ assumed)
✓ SAR shape: elongated, not yet fragmented  →  confirms < 36 h
✓ Age window finalised: 12 h · 24 h · 36 h
✓ Weights: 24 h most likely (0.38),  36 h next (0.32)
```

Keep each line under 3 words of jargon. This is the section that shows depth.
The weights line matters — it proves the system doesn't treat all ages equally.

### 5.2 While running — Stage 2 (seconds 4–6)

```
STAGE 2 — FORCING DATA
✓ HYCOM ocean currents  →  0.20 m/s from 221°  at source region
✓ ERA5 wind             →  8.3 m/s from 240°   at source region
✓ CMEMS Stokes drift    →  0.08 m/s from 235°  (wave-driven)
✓ Wind drift factor     →  1.6%  (HFO: thick slick, low wind coupling)
✓ Ekman deflection      →  17°  to right of wind
✓ Forcing window        →  26 May 2025 12:41 UTC  →  28 May 2025 00:41 UTC
```

One line on the wind drift factor (1.6%, not the usual 3%) earns more credibility
than any other line. It proves the physics is oil-type-aware.

### 5.3 While running — Stage 3 (seconds 6–15)

```
STAGE 3 — BACKTRACKING

  600 particles run backward  (200 per age hypothesis)
  each particle carries its own current, wind, diffusion
  integration step: 15 min  ·  output saved every 30 min

  Age 12 h  → source cloud centroid  9.66° N, 75.82° E
  Age 24 h  → source cloud centroid  9.57° N, 75.69° E   ← best weighted
  Age 36 h  → source cloud centroid  9.49° N, 75.56° E

  Combined cloud: 340 km²  (before refinement)

  FORWARD MATCH — checking if source reproduces the observed slick
  → running 40 forward simulations from candidate source region
  → best match at  9.62° N, 75.76° E,  T = 18 h
  → match quality: FSS = 0.14  (baseline is 0.058)

  Source cloud refined: 340 km²  →  18 km²
```

The FSS numbers must appear. 0.14 vs 0.058 baseline is concrete proof of improvement.

### 5.4 Source panel (appears at 15 s, and on any map click)

```
── SOURCE ESTIMATE ─────────────────── CONFIDENCE · HIGH ──

WHY THIS LOCATION
  ✓ the three age hypotheses lie on one drift axis (055°); the forward match selects 18 h on it
  ✓ forward simulation from here reproduces the observed slick (FSS 0.14)
  ✓ slick elongation axis (135°) is consistent with vessel heading from source
  ✓ 1σ ellipse (18 km²) contains only 3 AIS vessel tracks

COMPUTED
  Source location     9.6194° N,  75.7578° E
  Source time         27 May 2025 · 06:41 UTC   (18 h before SAR image; range 12–36 h)
  Age estimate        18 h  (range: 12 – 36 h)
  1σ uncertainty      ellipse 1.7 × 1.0 nm semi-axes (≈1.3 nm equivalent radius)
  2σ uncertainty      ellipse 3.4 × 2.0 nm semi-axes (≈2.6 nm equivalent radius)
  Cloud before refine 340 km²   (ensemble only)
  Cloud after refine   18 km²   (Bayesian-optimised forward match)
  Forward FSS         0.14      (baseline: 0.058)
  Oil type (input)    HFO · IFO 380 (reported: furnace oil + diesel)

ESTIMATED — NOT COMPUTED FROM PHYSICS
  Spill volume        6 – 370 m³         area × 0.5–30 µm assumed
  Discharge rate      unknown            single release assumed
  Source depth        surface only       sub-surface not modelled

NOT RESOLVABLE FROM THIS DATA
  whether discharge was accidental or deliberate
  exact vessel speed during discharge
  oil fate below surface — Stokes drift surface only
```

The **ESTIMATED** block must look visibly different: lighter background, italic
values, its own header. Every judge who asks "how do you know the volume?" will
see this block before you answer.

### 5.5 When the 1σ ellipse is clicked (uncertainty detail)

```
── UNCERTAINTY BREAKDOWN ───────────────── 1σ ≈ 1.3 nm ──

WHAT DRIVES THE UNCERTAINTY
  Age unknown          ±1.0 nm     biggest contributor
  Wind drift factor    ±0.7 nm     HFO is 1–3%, not a fixed number
  Ocean current error  ±0.5 nm     HYCOM accuracy in this region
  Stokes drift         ±0.2 nm     wave model error

HOW TO READ THE ELLIPSE
  1σ ring (solid)   → 68% probability source is inside
  2σ ring (dashed)  → 95% probability source is inside
  The ellipse is elongated along the wind direction — that is physics, not a guess

WHAT WOULD TIGHTEN IT
  → a second SAR image 6 h earlier or later
  → a confirmed oil type from samples (not just reported)
  → drifter buoy data in this region during the window
```

This panel is what differentiates a physics system from a heatmap generator.
Make sure the script clicks the ellipse.

---

## 6. The three toggles (same screen, right panel swaps)

### Toggle 1 — Forecast (72h forward)

Orange probability contours appear ahead of the source estimate:

```
WHERE THE OIL IS GOING
72-hour forecast from the estimated source.

  12 h  →  9.71° N, 75.89° E   (50% contour)
  24 h  →  9.80° N, 76.02° E   (passes the observed slick at 18 h)
  36 h  →  9.89° N, 76.14° E   approaching Kerala coast
  48 h  →  shoreline contact likely near Fort Kochi – Vypeen (≈ 43 h)

  Coastline risk  →  Fort Kochi – Vypeen: 41% by 72 h
                  →  Chellanam:           24% by 72 h
                  →  Munambam:             9% by 72 h

  Oil remaining on surface (HFO):
    evaporated:  2%   (HFO barely evaporates)
    dispersed:   4%
    surface:    94%   → still largely detectable

→ Recommend aerial survey at 9.85° N, 76.10° E before 28 May 2025 18:00 UTC
```

Frame coastline risk as a tasking recommendation, not a damage forecast.

### Toggle 2 — Data limits

Grey uncertainty overlay appears on the map:

```
WHERE THE PHYSICS COULD NOT SEE

  HYCOM current resolution  1/12° (~8 km)
  Sub-mesoscale eddies < 8 km are not captured.
  If a small eddy existed in this region, source could shift ±0.5 nm.

  ERA5 wind resolution  0.25° (~25 km)
  Local wind variations below 25 km are smoothed.
  Typical error contribution: ±0.4 nm over 18 h.

  Stokes drift  surface layer only
  Sub-surface transport not modelled.
  Relevant only for dispersed oil — HFO stays at surface.

  Backtracking limit: 72 h
  Beyond 72 h, HFO tarballs scatter randomly.
  We stop at 72 h and say so.

→ These limits are built into the 1σ ellipse — not hidden from it.
```

No competing team will show data resolution limits. Frame as transparency,
not weakness.

### Toggle 3 — Hand-off

```
SENT TO THE OTHER MODULES

→ Detection team:   received slick polygon, centroid, area, oil type, SAR time
→ Vessel team:      source window  9.62° N, 75.76° E ± 2.6 nm (2σ) · 27 May 06:41 UTC (−18 h / +6 h)
                    search radius: 3σ + 50 nm = 55 nm
                    AIS query window: 26 May 2025 · 12:41 – 28 May 2025 · 00:41 UTC
                    backtrack points every 30 min, each with a point confidence

WHAT IS PASSED IN THE FILE
  source_lat:         9.6194
  source_lon:        75.7578
  source_time_utc:   2025-05-27T06:41:00Z
  age_hours_mode:    18
  age_hours_min:     12
  age_hours_max:     36
  sigma_1sig_nm:     1.3
  sigma_2sig_nm:     2.6
  fss_achieved:      0.14
  oil_type:          HFO
  cloud_area_km2:    18.0
  backtrack_points:  [55 points, T0 → T−27 h: lat, lon, point_confidence, radius_2sig_nm]
  forecast_72h_geojson: [inline preview]

[ Download GeoJSON ]
```

Show the real field names. Judges score integration. This proves the modules
connect — and that uncertainty propagates forward instead of being discarded
before the vessel team sees it.

---

## 7. Optional extra: the side-by-side

If time allows, one toggle showing the same backtracking problem done two ways:

| | |
|---|---|
| **Typical approach** | reverse current direction · draw one line upwind · call it the source |
| **Ours** | 600 particles · 3 age hypotheses · uncertainty-weighted · forward-validated · 340 km² → 18 km² · source time included · uncertainty in the handoff file |

Thirty seconds. Makes the contribution legible to any judge who has seen
one-arrow backtracking before.

---

## 8. Interaction

- **Click the source pin** → source panel opens with full breakdown.
- **Click the 1σ ellipse** → uncertainty breakdown panel opens.
- **Click any point on the particle trail** → small tooltip shows: particle ID,
  age hypothesis, position at that time, wind and current at that point.
  Caption: *every particle's full history is stored — not just where it ended up*
- **Age window slider** (12 h · 24 h · 36 h) → particle trails and source cloud
  update live to show only that hypothesis.
  Caption: *the vessel team gets all three — uncertainty does not disappear at the handoff*
- **Uncertainty slider** (tight 1σ / standard 2σ / conservative 3σ) → ellipse on
  map resizes and AIS search radius updates in the hand-off panel.
- **Layer chips** in the footer toggle: particles, ensemble cloud, source pin,
  forecast, forcing (currents + wind), data limits.
- Nothing else. No page navigation.

---

## 9. Colours and wording (everyone must match)

| Meaning | Colour |
|---|---|
| Source probability cloud (pre-refinement) | amber fill, 40% opacity |
| Refined source ellipse (post-Bayesian Opt) | solid red outline, 15% red fill |
| Source peak pin | solid red marker |
| 1σ uncertainty ring | solid red circle |
| 2σ uncertainty ring | dashed red circle |
| Particle trails — 12h hypothesis | orange |
| Particle trails — 24h hypothesis | white |
| Particle trails — 36h hypothesis | blue |
| 72h forecast contours | orange gradient |
| Forcing data (currents) | grey arrows |
| Forcing data (wind) | white barbs |
| Data limit zones | grey hatching |

Wording rules:

- Never "source located at" without the uncertainty ellipse visible on screen.
- Never a source time without "±" and the range beside it.
- Never "oil will reach the coast" — write "coast impact probability: X% by 72 h".
- Never "vessel identified" — that is the vessel team's output, not ours.
  Write "AIS search window passed to vessel team".
- Never show a single backward arrow and call it backtracking.

---

## 10. Build order (if time runs short)

1. **The main screen, static**: map + amber cloud + red ellipse + source pin +
   source panel. *If you build only one thing, build this.*
2. The particle animation (trails fanning backward, then converging to cloud).
3. The cloud-shrinking transition (340 km² → 18 km²) when refinement completes.
4. The uncertainty-breakdown panel (click the ellipse).
5. Forecast toggle (72h contours + coastline risk).
6. Data limits toggle.
7. Hand-off toggle.

Items 1–3 alone beat most complete prototypes, because they show the narrowing
rather than a result.

---

## 11. Do not

- Show a single backward trajectory and call it backtracking.
- Animate particles from the centroid only — seed from the full polygon.
- Show the source pin without the 1σ ellipse visible at the same time.
- Use a loading bar longer than 3 seconds for any stage.
- Label the coastline risk as certain — write the probability and the time.
- Show FSS without also showing the baseline (0.14 means nothing without 0.058).
- Use MV Wakashio or Sanchi as the demo case — at least three competing teams
  already do.
- Forget the cloud-shrinking moment. That is the whole demo in two seconds.
- Fake a convergence curve. It invites "what was your particle count
  sensitivity analysis?"
- Show any number that was not actually computed.

---

## 12. Demo script (about 90 seconds)

1. Map with slick polygon visible. **"We know where the oil is. The question is where it came from — and when."** (pause)
2. "We do not know how old the spill is. The system estimates it from the slick's
   own shape, using Fay's spreading law. The window is 12 to 36 hours." (Stage 1 lines)
3. "Ocean currents, wind, and wave drift are fetched for that exact window.
   Wind drift for HFO is 1.6% — not the standard 3%. The physics knows the oil type." (Stage 2 lines)
4. "Six hundred particles run backward through time. Each one follows a slightly
   different version of those currents and wind." (particle animation)
5. "They converge into a 340-square-kilometre cloud. That is the honest answer from
   the physics alone." (cloud forms)
6. "Then the system checks: which point in that cloud, when we run oil forward from
   it, actually produces the slick we saw? The cloud shrinks to 18 square kilometres." (cloud shrinks)
7. "The source: here, 18 hours before the satellite image." (source pin drops)
8. "Click the ellipse — it tells you exactly what is driving the uncertainty and
   what data would reduce it." (uncertainty panel)
9. "All of this — location, time, uncertainty radius — goes to the vessel team
   as one file. Their AIS search window comes from our ellipse, not a guess." (hand-off toggle)
