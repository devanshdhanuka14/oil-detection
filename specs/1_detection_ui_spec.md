# Oil Detection — UI Prototype Spec

> **Corrected copy for the prototype build.** Features are unchanged. Some numbers were corrected so all three screens agree; see `CHANGES_FOR_TEAMS.md`. At build time every number is read from `scenario.json`, which wins if anything here disagrees.

SIH 2026, PS 26143. For the prototype team.

**One screen.** Image on the left, everything else appearing on the right as it
happens. No page navigation. Two toggles swap the right panel; nothing else moves.

No backend needed. Every value here is what the system really outputs.

---

## 1. What this demo has to prove

1. **We understand the physics.** Anyone can draw a red box over a dark patch.
2. **The work is judgement, not detection.** Our advantage is rejection. If the
   screen shows only confirmed oil, that advantage is invisible on camera.
3. **We know our own limits.** A system that says "I could not see here" is
   trusted more than one that always answers.

Every element below serves one of those three.

---

## 2. The layout

```
┌────────────────────────────────────────────────────────────────┐
│  Sentinel-1 · 28 May 2025 00:41 UTC · Arabian Sea    47 → 2    │
├──────────────────────────────┬─────────────────────────────────┤
│                              │  PROCESSING                     │
│                              │  ✓ calibrated, geometry fixed   │
│      THE RADAR IMAGE         │  ✓ wind 6.2 m/s from 240°       │
│      (outlines draw          │  ✓ 92% of area observable       │
│       on top of it)          │                                 │
│                              │  FOUND 47 dark patches          │
│                              │  ✗ 29 rejected · fuzzy edges    │
│                              │  ✗ 11 rejected · blobby shape   │
│                              │  ✗  5 rejected · at noise floor │
│                              │  ✓  2 CONFIRMED OIL             │
│                              │                                 │
│                              │  ── SLICK S01 ──── OIL 91% ──   │
│                              │  12.4 km² · 18.0 km · 690 m     │
│                              │  −7.1 dB vs surrounding sea     │
│                              │  edges 3.4× sharper than typical│
│                              │  elongation 8.2                 │
│                              │  fresh end ▸ 9.8111N 75.8933E   │
│                              │  volume 6–370 m³  (estimated)   │
│                              │  oil type: reported, not measured│
├──────────────────────────────┴─────────────────────────────────┤
│ 🔴 oil  🟡 look-alike  ▨ blind   [outline confidence ●──────]  │
└────────────────────────────────────────────────────────────────┘
```

The counter **47 → 2** sits in the header and stays visible the whole time. It is
the single most persuasive element in the demo.

---

## 3. The timeline (about 13 seconds, one continuous shot)

| time | LEFT (image) | RIGHT (panel) |
|---|---|---|
| 0–2 s | radar image fades in | processing lines tick off one by one |
| 2–5 s | 47 grey outlines draw on | `FOUND 47 dark patches` |
| 5–6 s | zoom to one slick, the 4 beats below | `measuring 40 properties each` |
| 6–7 s | zoom back out | |
| 7–11 s | rejected outlines turn yellow, then dim to 15%, group by group | the three ✗ lines appear, one per group |
| 11–13 s | 2 outlines snap to solid red, rest stays dim | `✓ 2 CONFIRMED OIL`, then the slick panel fills in |
| hold | everything visible together | |

The rejections are **synchronised**: when the "fuzzy edges" line appears on the
right, exactly those 29 outlines dim on the left. That link is what makes the
reasoning legible.

---

## 4. The outline-building beats (the 5-second zoom, seconds 5–6)

Zoomed in on one slick. Four beats, roughly 1.2 s each.

**Beat 1 — comparison.** A small circle sweeps across the slick. A tiny inset
graph shows brightness inside versus the sea around it, with the gap labelled
**−7.1 dB**.
Caption: *each pixel compared with the sea around it, not a fixed threshold*

**Beat 2 — core.** The very darkest pixels light up first, in bright red.
Caption: *very dark cores found first*

**Beat 3 — flood.** Colour spreads outward from the core and stops at the
boundary. Where it approaches a **neighbouring** dark patch it visibly halts, and
that patch stays a different colour.
Caption: *each dark pixel joins the core it belongs to, so a slick touching a calm
patch stays separate*

**Beat 4 — trace.** The boundary crystallises into a clean outline while the
measurements count up beside it: area, length, width, orientation.
Caption: *outline, not a box*

**Add one second here:** show the bounding box and the outline together, box
shaded to reveal the empty water, labelled
**"box: 400 km² · actual slick: 4 km²"**.
Every competing demo uses boxes. One second undoes that comparison.

---

## 5. The right panel in detail

### 5.1 While processing (seconds 0–2)

```
PROCESSING
✓ Orbit and geometry corrected
✓ Sensor noise removed, calibrated to decibels
✓ Pixels made square in metres (latitude-corrected)
✓ Speckle filtered
✓ Wind fetched for 28 May 2025 00:41 UTC → 6.2 m/s from 240°
✓ Detectability computed → 92% of area observable
```

Keep each line under 3 words of jargon. This is the section that shows depth.

### 5.2 The elimination log (seconds 2–11)

```
FOUND 47 dark patches
   measuring 40 properties each…
✗  29 rejected · fuzzy edges (0.4× typical sharpness)
✗  11 rejected · blobby shape, low elongation
✗   5 rejected · signal at the sensor noise floor
✓   2 CONFIRMED OIL
```

### 5.3 The slick panel (appears at 11 s, and on any click)

```
── SLICK S01 ─────────────────────── OIL · 91% · HIGH ──

WHY
  ✓ edge sharpness 0.118 dB/m — 3.4× sharper than typical sea
  ✓ elongation 8.2 — long and thin, consistent with a moving discharge
  ✓ 7.1 dB darker than the surrounding sea
  ✓ 9 dB above the sensor noise floor — a real signal

MEASURED
  Centre           9.7538° N, 75.9513° E
  Area             12.4 km²      Length 18.0 km    Width 690 m
  Orientation      135° (NW–SE)  Fragments 3
  Fresh end (head) 9.8111° N, 75.8933° E   (confidence 0.80)
  Old end (tail)   9.6965° N, 76.0093° E
  Darkness         −7.1 dB VV · −3.2 dB VH
  vs expected      −6.4 dB   [CMOD model + ERA5 wind]
  Damping class    strong        Observable share 95%

ESTIMATED — NOT MEASURED
  Freshness        intermediate           from shape
  Volume           6 – 370 m³             area × 0.5–30 µm assumed
  Oil type         furnace oil + diesel   REPORTED by authorities
  Density          from reported type     ASSIGNED, NOT MEASURED

NOT MEASURABLE FROM RADAR
  density · viscosity · sulphur · flash point · oil below the surface
```

The **ESTIMATED** block must look visibly different: different background, italic
values, its own header. One line on camera about it buys more credibility than
any other five seconds in the video.

### 5.4 When a rejected patch is clicked

```
── PATCH S14 ────────────────── NOT OIL · 14% ──

WHY NOT
  ✗ edges fade gradually — 0.4× typical sharpness
  ✗ blobby shape, elongation 1.6
  ✗ only 2.1 dB darker than the surrounding sea
  → consistent with a low-wind patch
```

This panel is the demo. Make sure the script clicks one.

---

## 6. The two toggles (same screen, right panel swaps)

### Blind areas

Grey hatching appears over the image. Panel:

```
WHERE WE COULD NOT SEE
8% of this area was not observable.
Wind there was 1.8 m/s. Below ~3 m/s the whole sea is dark,
so no satellite could have seen oil — ours included.
→ Recommend re-imaging on the next pass, 14:22 UTC.
```

Frame it as a tasking recommendation, not an apology. No competing team will show
this.

### Hand-off

```
SENT TO THE OTHER MODULES
→ Drift team:   outline (3 confidence levels), head/tail, area, time, wind
→ Vessel team:  slick outline, SAR time + 4 radar bright targets
                nearest is 1.2 km from the fresh end

[ Download GeoJSON ]
```

Show a few real field names in a preview. Judges score integration, and this
proves the modules connect.

---

## 7. Optional extra: the side-by-side

If there is time, one toggle showing the same dark patch judged two ways:

| | |
|---|---|
| **Typical approach** | dark patch → "OIL DETECTED" |
| **Ours** | dark patch → "not oil, 14% — fuzzy edges (0.4× typical), blobby shape, damping only −2.1 dB, consistent with low wind" |

Twenty seconds, and it makes the contribution legible to a non-specialist.

---

## 8. Interaction

- **Click any outline** → the right panel swaps to that patch (oil or rejected).
- **Outline confidence slider** (tight / expected / generous) → the outline on the
  image changes and the area readout updates live.
  Caption: *the drift team seeds particles across all three, so our uncertainty
  carries into their result instead of disappearing.*
- **Layer chips** in the footer toggle: radar, oil, look-alikes, blind areas,
  bright targets.
- Nothing else. No pan, no zoom, no page navigation.

---

## 9. Colours and wording (everyone must match)

| meaning | colour |
|---|---|
| confirmed oil | solid red outline, 20% red fill |
| look-alike, rejected | yellow dashed outline, dimmed after elimination |
| blind area | grey hatching |
| bright target (possible vessel, radar only) | small blue triangle |
| drift prediction (other module) | orange arrows |

Wording rules:

- Never "oil spill detected" on a rejected patch. Write "dark patch, judged not oil".
- Never a volume, density or oil type without "estimated" or "reported" beside it.
- Never "vessel identified" for a radar bright target. Write "possible vessel,
  radar only, not AIS".

---

## 10. Build order (if time runs short)

1. **The main screen, static**: image + 47 outlines + the counter + the slick panel.
   *If you build only one thing, build this.*
2. The elimination animation (outlines dimming, synchronised with the ✗ lines).
3. The rejected-patch panel (click a yellow outline).
4. The outline-building zoom (4 beats).
5. Blind areas toggle.
6. Hand-off toggle.

Items 1–3 alone beat most complete prototypes, because they show judgement rather
than detection.

---

## 11. Do not

- Build a live pan/zoom map you will not have time to polish.
- Fake a training loss curve. It invites "what was your validation protocol?"
- Show any number that has not actually been measured.
- Use a loading bar longer than 3 seconds.
- Use MV Wakashio as the demo case — at least two competing teams already do.
- Hide the look-alikes. They are the whole point.

---

## 12. Demo script (about 90 seconds)

1. Radar image, dark patches visible. **"Several of these are not oil. Which one is?"** (pause)
2. "The scene is physically corrected, then wind is fetched for that exact hour." (processing lines)
3. "The system finds 47 dark patches. Most systems would flag all 47."
4. "Ours confirms 2 and rejects 45 — and tells you why." (click a rejected one, read the reasons)
5. "Here is the confirmed slick: 12.4 km², 18 km long, fresh end here." (slick panel)
6. "Density and oil type are not measured. They come from the incident report. We say so." (estimated block)
7. "And here is where we could not see at all." (blind toggle)
8. "All of it goes to the drift and vessel teams as one file." (hand-off toggle)
