# Vessel Attribution — UI Prototype Spec

SIH 2026, PS 26143. For the prototype team.

**One screen.** Map on the left, everything appearing on the right as it happens.
No page navigation. Three toggles swap the right panel; nothing else moves.

No backend. Every number comes from `scenario.json` (section `attribution`, plus the
detection and backtracking hand-offs). All vessels are fictional.

> **Tessera Bay's arrival was corrected.** The old `arrived_near_slick_utc: 23:01 UTC`
> did not fit its own track — at 23:01 it was still 21 nm from the slick's fresh end.
> The field is now `first_within_2nm_of_slick_utc`, computed from the track against the
> S01 outline: **00:17 UTC, 24 min before the image**, by which point the oil had been on
> the water about 18 h. The trap is unchanged and slightly stronger: the nearest ship at
> image time only arrived minutes before it.

---

## 1. What this demo has to prove

1. **We don't blame the nearest ship.** The obvious suspect at image time is usually
   innocent: the oil drifted to it. Our system rewinds the oil and checks who was there
   *when the oil was there*.
2. **The work is elimination, then weighing evidence.** 612 vessels become 38
   candidates, then 3 suspects, each with its reasons visible.
3. **We know our limits.** The output is a probability, never a verdict. The ranking
   always includes "dark ship", "fixed source" and "no visible ship", and the system can
   end with "not conclusive".

Every element below serves one of those three.

---

## 2. The layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Vessel attribution · Slick S01 · 28 May 2025 00:41 UTC               │
│ AIS vessels in window  612  →  38 in reach  →  3 suspects            │
├────────────────────────────────┬─────────────────────────────────────┤
│                                │ STAGE 1 · INPUTS RECEIVED            │
│                                │ STAGE 2 · AIS FILTER                 │
│          THE MAP               │ STAGE 3 · REWIND LOOP                │
│  slick · backtrack path ·      │ ┌ point confidence 0.80 ▮▮▮▮▮▮▮▮░░ ┐ │
│  search circle · AIS tracks ·  │ └ leader probability 71% ▮▮▮▮▮▮▮░░ ┘ │
│  candidates · leader           │ ── RANKING ─────────────────────────  │
│                                │ 1  MT Coral Meridian   ███████░  71% │
│                                │ 2  MV Saffron Crest    █░░░░░░░  12% │
│                                │ 3  FV Blue Marlin 12   ░░░░░░░░   6% │
│                                │ ▲  dark target BT-3    ░░░░░░░░   5% │
│                                │ ○  no visible ship     ░░░░░░░░   3% │
│                                │ ■  fixed source        ░░░░░░░░   2% │
│                                │ …  35 others combined             1% │
├────────────────────────────────┴─────────────────────────────────────┤
│ ◀ T0 ─●──●──●──●──●──●──●──●──●── T−18 h ■ STOP   [ threshold ●── ]   │
│ ▭ AIS  ▭ candidates  ▭ search circle  ▭ dark  ▭ fixed  ▭ gaps         │
└──────────────────────────────────────────────────────────────────────┘
```

The counter **612 → 38 → 3** in the header stays visible the whole time. It matches
the other screens' counters (47 → 2, 340 km² → 18 km²) and sits beside them in the
module bar.

The "3 suspects" are the same 3 AIS tracks the backtracking screen says lie inside its
1σ ellipse. Both screens read this from `scenario.json`.

---

## 3. The timeline (about 23 seconds, one continuous shot)

| time | LEFT (map) | RIGHT (panel) |
|---|---|---|
| 0–2 s | overview map. Red slick S01, the drift team's backtrack path (dotted red, T0 → T−27 h) and the 1σ/2σ source ellipse fade in | Stage 1 lines tick off |
| 2–4 s | all 612 AIS tracks draw on as thin grey lines | `612 vessels in the AIS window` |
| 4–5.5 s | **the trap:** MV Tessera Bay pulses at the slick's fresh end | label on map: *typical approach: nearest ship = polluter* |
| 5.5–8.5 s | tracks dim to 10% group by group, synchronised with each ✗ line | Stage 2 elimination log; counter → 38 |
| 8.5–16 s | camera eases to the loop view. **The rewind loop:** playhead steps back 30 min at a time. A dashed cyan search circle sits on each backtrack point and grows with its radius. Vessels inside glow teal. Tessera Bay greys out at T−2 h, because it wasn't there yet | step table fills; both meters move; ranking bars reorder live |
| 16–17 s | circle flashes; playhead locks at T−18 h | `■ STOP · leader 71% ≥ 65% · margin 59 pts ≥ 40 · point confidence 0.80 ≥ 0.60` |
| 17–21 s | four evidence beats on the leader (section 4) | beat captions |
| 21–23 s | leader track turns magenta; its match window (05:46–07:36 UTC) glows along the track | ranking locks; leader card fills in. Tessera Bay row reads `0.2% · arrived ~18 h after the oil was released` |
| hold | everything visible together | |

The dimming is **synchronised**. When "402 never within reach" appears on the right,
exactly those 402 tracks dim on the left. The same applies to the ranking: when a bar
moves on the right, that vessel's track brightens on the left.

---

## 4. The evidence beats (seconds 17–21, zoomed on the leader)

Four beats, about 1 s each. The map stays zoomed on MT Coral Meridian at the match window.

**Beat 1 — timing.** The rewound oil (particle cloud for 06:41 UTC) and the ship's dot
at 06:41 UTC appear together and overlap.
Caption: *there when the oil was there, not just nearby at some point*

**Beat 2 — proximity.** A thin line from the ship to the backtrack point, labelled **0.3 nm**.
Caption: *0.3 nm from the rewound oil at the matching time*

**Beat 3 — parallelism.** The ship heading arrow (318°) and the slick axis (315°/135°)
are drawn together, with the gap labelled **3°**.
Caption: *track runs along the slick, within 3°*

**Beat 4 — behaviour.** A small inset speed chart: 12.8 kn → 5.3 kn for 1 h 50 min, then
back to 12.8 kn. The slow stretch is shaded and lines up with the match window.
Caption: *slowed inside the window, then resumed*

**Coverage line** (appears with beat 4): `explains 81% of the slick's particles`.
Caption: *explains most of the slick, not one corner*

---

## 5. The right panel in detail

### 5.1 Stage 1 — inputs received (seconds 0–2)

```
STAGE 1 · INPUTS RECEIVED
✓ From detection:  slick S01 outline · SAR time 28 May 00:41 UTC
✓ From detection:  4 radar bright targets (nearest 1.2 km from fresh end)
✓ From drift:      backtrack points every 30 min, each with a confidence
✓ From drift:      source 9.62° N, 75.76° E ± 2.6 nm (2σ) · 27 May 06:41 UTC
✓ AIS window:      26 May 12:41 → 28 May 00:41 UTC · radius 55 nm
```

These lines echo the other two teams' hand-off panels word for word. That echo is the
integration proof.

### 5.2 Stage 2 — AIS filter (seconds 5.5–8.5)

```
STAGE 2 · AIS FILTER
FOUND 612 vessels in the window
✗ 402 never within reach of the rewound oil
✗ 131 near the oil's path, but at the wrong time
✗  41 stayed inside Kochi port limits the whole window
✓  38 CANDIDATES enter the rewind loop
```

### 5.3 Stage 3 — the rewind loop (seconds 8.5–16)

```
STAGE 3 · REWIND LOOP        stop when all three hold:
                             leader ≥ 65% · margin ≥ 40 pts · point confidence ≥ 0.60

 step      point conf   radius   in circle   leader                 p
 T0          1.00       0.5 nm      0        —                      —
 T−3 h       0.97       0.9 nm      2        candidate #21          6%
 T−9 h       0.90       1.6 nm      3        candidate #9           9%
 T−15 h      0.84       2.3 nm      4        candidate #9          11%
 T−16.5 h    0.82       2.4 nm      3        MV Saffron Crest      34%
 T−17.5 h    0.81       2.5 nm      3        MT Coral Meridian     52%   margin 31 < 40 → continue
 T−18 h      0.80       2.6 nm      3        MT Coral Meridian     71%   ■ STOP
```

Rows appear as the playhead passes them. The animation steps every 30 min, but only
these rows are printed. Two meters sit above the table:

- **Backtrack point confidence** (drift team): a bar that falls as the playhead goes
  back, with a tick mark at the 0.60 floor.
- **Leader probability** (ours): a bar that rises, with a tick mark at the threshold.

The stop moment is when the rising bar crosses its tick while the falling bar is still
above its own tick. This shows both teams' outputs meeting in one rule.

### 5.4 Ranking (appears at 21 s)

As in the layout. Every row has a probability bar and an icon. **The "no visible ship"
row is always shown.**

### 5.5 Leader card (appears at 21 s, and on click)

```
── MT CORAL MERIDIAN ─────────── LEADING CANDIDATE · 71% · NOT A DETERMINATION ──

WHY
  ✓ inside the rewound oil for 1 h 50 min  (27 May 05:46 – 07:36 UTC)
  ✓ explains 81% of the slick's particles
  ✓ heading 318° vs slick axis 315° — 3° off parallel
  ✓ 0.3 nm from the backtracked point at the matching time
  ✓ slowed from 12.8 kn to 5.3 kn inside that window, then resumed

MEASURED (AIS)
  MMSI        538•••117 (synthetic)     Type      Product tanker
  Length      183 m                     Draught   10.9 m of 11.6 m max
  Course      318°                      Destination  JNPT Mumbai, ETA 29 May 03:00 UTC
  AIS gaps    none in the window

ESTIMATED — NOT MEASURED
  Loaded state      likely            from self-reported draught
  Vessel type       product tanker    self-reported in AIS
  Release window    05:46 – 07:36     inferred from overlap, not observed

NOT RESOLVABLE FROM THIS DATA
  whether oil was actually discharged, or the ship only passed through
  accidental vs deliberate · what was discharged

→ Recommend: port-state inspection at JNPT and review of the oil record book
```

The **ESTIMATED** block uses the same visual treatment as the other two screens:
different background, italic values, its own header.

### 5.6 The trap card (click Tessera Bay)

```
── MV TESSERA BAY ─────────────────────────── 0.2% · NOT A LIKELY SOURCE ──

WHY NOT
  ✗ came within 2 nm of the slick only at 00:17 UTC, 24 min before the image
  ✗ the oil had already been on the water for about 18 h
  ✗ never inside the rewound oil at any matching time
→ nearest ship ≠ source. This is the most common false attribution.
```

**This panel is the demo. Make sure the script clicks it.**

### 5.7 Eliminated vessel card (click any dimmed grey track)

```
── MV NORTHERN LARK ─────────────────────────── ELIMINATED · STAGE 2 ──
WHY NOT
  ✗ closest approach 14.2 nm from the rewound oil (needed ≤ 2.6 nm)
```
```
── MT SILVER HERON ──────────────────────────── ELIMINATED · STAGE 2 ──
WHY NOT
  ✗ crossed the oil's path at 27 May 01:10 UTC, 5.5 h before the oil was there
```

Any other dimmed track shows its group reason, using a generated name from the seeded
list.

### 5.8 Other candidate cards

- **MV Saffron Crest (12%)**:
  - inside the rewound oil for 25 min around 08:25 UTC
  - heading 152°, 17° off parallel
  - no slowdown
  - explains 22%
  - AIS gap of 43 min at 24 nm offshore, marked *reception gap, not counted (under 12 h and within 50 nm)*
- **FV Blue Marlin 12 (6%)**:
  - loitering in a fishing pattern near the source, 04:30–09:30 UTC
  - small craft, so a low type prior
  - no consistent heading
  - explains 9%
- **Dark target BT-3 (5%)**:
  - *possible vessel, radar only, not AIS*
  - about 58 m long, 9.4 km NW of the fresh end at image time
  - within 20° of the slick axis
  - note: vessels under 300 GT need not carry AIS
- **Fixed source (2%)**: no charted platform within 55 nm; one charted wreck (synthetic) 31 nm SE, outside the rewound oil.

---

## 6. The three toggles (same screen, right panel swaps)

### Toggle 1 — Where AIS couldn't see

Grey hatching appears over the part of the search area beyond terrestrial AIS reach.

```
WHERE AIS COULD NOT SEE
Terrestrial AIS reaches about 40 nm offshore here.
The backtracked source is 32 nm offshore, inside coverage.
11% of the 55 nm search area lies beyond reach (hatched): a ship there could pass unseen.

AIS gaps in this case: 3
  all under 12 h and within 50 nm of shore
  → treated as reception gaps, not as intent
Vessels under 300 GT (most fishing boats) need not carry AIS
  → covered only by radar bright targets

→ Recommend a satellite-AIS pull for the hatched zone, 26–27 May.
```

Clicking Saffron Crest's dashed gap segment draws its **reachability ellipse**: every
place it could have gone in 43 min. The ellipse doesn't touch the rewound oil at that
time. Caption: *we never draw a straight line through a gap*

### Toggle 2 — Dark and fixed sources

The detection team's 4 blue triangles appear. Three snap to their AIS ships with a thin
link line. BT-3 stays alone and pulses.

```
RADAR BRIGHT TARGETS vs AIS
BT-1 → MV Tessera Bay     matched
BT-2 → MV Orchid Wave     matched
BT-4 → MT Kestrel Point   matched
BT-3 → no AIS within 2 km → dark target, 5%

FIXED SOURCES CHECKED
platforms within 55 nm: none
charted wrecks: 1, 31 nm SE, outside the rewound oil → 2%
```

### Toggle 3 — Case file (hand-off)

```
CASE FILE · PS26143-DEMO-S01
→ Received from detection:  slick S01, SAR time, 4 bright targets
→ Received from drift:      55 backtrack points, source ellipse, AIS window
→ Output:                   ranked candidates + alternatives + stop rule

WHAT IS IN THE FILE
  case_id:           PS26143-DEMO-S01
  stop_rule:         { threshold: 0.65, min_margin: 0.40, point_conf_floor: 0.60 }
  stopped_at:        T−18 h
  ranking[0]:        { name: "MT Coral Meridian", p: 0.71, match: "05:46–07:36Z", coverage: 0.81 }
  alternatives:      { dark: 0.05, fixed: 0.02, none: 0.03 }
  provenance:        { ais: "synthetic", backtrack_run: "S01-bt", detection: "S01-v1" }
  disclaimer:        "ranking of candidates, not a determination of responsibility"

[ Download case JSON ]
```

The download is real: it saves the relevant slice of `scenario.json`.

---

## 7. Optional extra: the side-by-side

| | |
|---|---|
| **Typical approach** | nearest ship at image time → "MV Tessera Bay responsible" |
| **Ours** | rewind the oil 18 h → MT Coral Meridian 71%, Tessera Bay 0.2% (arrived ~18 h after the oil was released) · dark 5% · fixed 2% · none 3% |

Twenty seconds.

---

## 8. Interaction

- **Click any track** → the right panel swaps to that vessel's card (candidate or eliminated).
- **Rewind scrubber** (footer): drag through the steps T0 → T−27 h. The search circle,
  meters, table and ranking all follow the scrubber.
- **Threshold slider** (50% · 65% · 80%): the stop point and outcome update live:
  - **50%**: still stops at T−18 h. Show the line *margin rule blocked T−17.5 h (52% vs 21%)*.
  - **65%**: stops at T−18 h, 71%.
  - **80%**: the loop runs to T−27 h, where point confidence hits the floor. The panel reads
    *MT Coral Meridian leads at 77%, below threshold → leading candidate, not conclusive*.

  Caption: *raising the bar never forces an answer; the system says when it can't reach one*
- **Layer chips**: AIS tracks, candidates, search circle, backtrack path, dark targets,
  fixed sources, gaps.
- Nothing else. No user pan or zoom (scripted camera moves only), no page navigation.

---

## 9. Colours and wording (everyone must match)

| meaning | colour |
|---|---|
| slick S01 (from detection) | solid red outline, 20% red fill |
| source ellipse / backtrack path (from drift) | red outline, 15% fill; dotted red path |
| AIS track, not a candidate | grey, 35% opacity (dims to 10% when eliminated) |
| candidate track | teal |
| leading candidate | magenta, thicker |
| search circle | cyan, dashed |
| AIS gap segment | dotted, same colour as its track |
| reachability ellipse | cyan, 10% fill |
| radar bright target (from detection) | small blue triangle |
| fixed source | purple square |
| AIS blind zone | grey hatching |

Wording rules:

- Never "polluter identified", "responsible" or "guilty". Write "leading candidate · 71% · not a determination".
- Never show the ranking without the "no visible ship" row.
- Never "vessel identified" for a bright target. Write "possible vessel, radar only, not AIS".
- Never call an AIS gap suspicious unless it is at least 12 h long and more than 50 nm offshore.
- Every vessel name and MMSI is fictional. The "synthetic" tag on MMSIs is always visible.

---

## 10. Build order (if time runs short)

1. **The main screen, static**: map + tracks + ranking + leader card + counter.
   *If you build only one thing, build this.*
2. The rewind loop animation with the two meters and the STOP moment.
3. The Tessera Bay trap (pulse at 4 s + its card).
4. The Stage 2 elimination animation (synchronised dimming).
5. The four evidence beats.
6. Threshold slider and scrubber.
7. Toggles 1 → 2 → 3.

Items 1–3 alone beat most complete prototypes, because they show that the nearest ship
isn't the answer.

---

## 11. Do not

- Show a ranking that sums to anything but 100%.
- Use any real vessel name or a full MMSI.
- Draw a straight line through an AIS gap.
- Show "no visible ship" at 0%. It is never zero.
- Use a loading bar longer than 3 seconds.
- Show a number that isn't in `scenario.json`.
- Present "not conclusive" as an error state. It is a valid result and styled as one.

---

## 12. Demo script (about 90 seconds)

1. Map, slick, 612 grey tracks. **"Which of these ships spilled the oil?"** (pause)
2. "Most systems pick the nearest ship. This one, Tessera Bay, is 1.2 km from the slick." (trap pulses)
3. "First we remove every ship that could never have been there, and every ship that
   was there at the wrong time. 612 becomes 38." (elimination)
4. "Now we rewind the oil with the drift team, half an hour at a time, and ask who was
   inside it at that moment." (loop runs)
5. "We stop only when one candidate is clearly ahead and the drift is still reliable.
   Here, 18 hours back." (STOP)
6. "MT Coral Meridian: there when the oil was there, parallel to the slick, and it slowed
   down inside that window. 71%, not a verdict." (beats, leader card)
7. "And Tessera Bay? It only came within two miles of the slick 24 minutes before the image — about 18 hours after the oil was released." (click the trap card)
8. "Set the bar at 80% and the system tells you it can't get there. It doesn't force an answer." (slider)
9. "It also shows where AIS couldn't see, and checks radar-only ships." (toggles 1–2)
10. "All of it goes into one case file." (toggle 3)
