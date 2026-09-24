# Changes made to the team UI specs (numbers only, no features changed)

All three screens now read from one `scenario.json`, so every number agrees across the
demo. Please check these and tell me if any is wrong for your module.

## Scenario decision (all teams)

- The date and area off Kochi match the real **MSC Elsa 3** incident (sank 25 May 2025).
  To avoid a judge spotting a fictional culprit on a real incident, the demo is now
  labelled a **synthetic scenario with fictional vessels, not a reconstruction of MSC Elsa 3**.
  A badge showing this is visible on every screen.

## Detection team (`1_detection_ui_spec.md`)

| Item | Was | Now | Why |
|---|---|---|---|
| Fresh end (head) | 9.7821 N, 75.8994 E | 9.8111 N, 75.8933 E | Head and tail were only 13.9 km apart, but length is 18.0 km. They now sit 18 km apart along the 135° axis through the same centre |
| Old end (tail) | 9.7104 N, 76.0032 E | 9.6965 N, 76.0093 E | same |
| Volume | 5–400 m³ from area × 5–200 µm | 6–370 m³ from area × 0.5–30 µm | 12.4 km² × 5–200 µm is actually 62–2,480 m³. The thickness range was changed to match the volume you intended |
| Hand-off to vessel team | "origin window + 4 radar bright targets" | "slick outline, SAR time + 4 radar bright targets" | The origin window comes from the drift team, not detection |

## Backtracking team (`2_backtracking_ui_spec.md`)

| Item | Was | Now | Why |
|---|---|---|---|
| Source time | 29 May 2025 04:10 UTC | 27 May 2025 06:41 UTC | The old time was *after* the SAR image (28 May 00:41). 18 h before the image is 27 May 06:41 |
| Source position | 9.31 N, 74.82 E | 9.6194 N, 75.7578 E | The old source was about 130 km from the slick. Your forcing moves oil about 26 km in 18 h |
| Current | 0.41 m/s from 312° | 0.20 m/s from 221° | The old current pushed oil south-east, away from the Kerala coast your forecast reaches. The net drift is now 0.40 m/s toward 055°, which carries the source to the slick in 18 h and on to the coast |
| Age window (header) | 12–48 h | 12–36 h | Three different windows appeared in the spec. Now: Fay 14–42 h, shape < 36 h, window 12–36 h |
| Fay inversion (layout) | 18–36 h | 14–42 h | matches section 5.1 |
| Age centroids | 12 h 9.28/74.79, 24 h 9.31/74.83, 36 h 9.38/74.91 | 12 h 9.66/75.82, 24 h 9.57/75.69, 36 h 9.49/75.56 | Different ages must sit at different distances along the drift path |
| "All three converge within 12 nm" | — | "lie on one drift axis (055°); forward match selects 18 h" | follows from the line above |
| 1σ / 2σ | 9 nm / 21 nm radius | ellipse 1.7 × 1.0 nm (18 km²) / 3.4 × 2.0 nm (72 km²) | 18 km² can't have a 9 nm radius (that circle is about 870 km²). The "340 → 18 km²" counter was kept and the σ values now match it |
| Uncertainty breakdown | ±6 / ±4 / ±3 / ±1 nm | ±1.0 / ±0.7 / ±0.5 / ±0.2 nm | These must combine to about the 1σ value (they now give about 1.3 nm) |
| Data-limit shifts | ±5 nm, ±3 nm | ±0.5 nm, ±0.4 nm | Must fit inside the stated 1σ |
| Oil type / volume | HFO · IFO 380; 5–500 m³ | HFO · IFO 380 (reported: furnace oil + diesel); 6–370 m³ | matches the detection screen |
| Forcing window | 28 May 03:00 → 00:41 | 26 May 12:41 → 28 May 00:41 UTC | covers the full 36 h window |
| Forecast | 12/24/48/72 h points; Vypeen 23%, Munambam 11% | 12/24/36 h points, shoreline contact about 43 h; Fort Kochi–Vypeen 41%, Chellanam 24%, Munambam 9% | recomputed from the new drift; the oil reaches the coast before 48 h |
| Survey recommendation | 9.7 N 75.9 E by 48 h | 9.85 N 76.10 E before 28 May 18:00 UTC | ahead of the predicted landfall |
| Hand-off lat/lon | `source_lon: 9.3141`, `source_lat: 74.8218` (swapped) | `source_lat: 9.6194`, `source_lon: 75.7578` | were swapped |
| Search radius | 3σ + 50 nm = 83 nm | 55 nm | 3 × 1.7 + 50 |
| AIS query window | 27 May 04:10 – 29 May 00:41 | 26 May 12:41 – 28 May 00:41 UTC | full age window, ending at the image time |
| **New hand-off field** | — | `backtrack_points`: every 30 min, T0 → T−27 h, each with `point_confidence` and `radius_2sig_nm` | The vessel module's joint stopping rule needs your confidence at every step |

## What the vessel team needs you to confirm

- **Drift team:** is a point confidence schedule of 1.00 at T0, 0.80 at T−18 h and
  0.60 at T−27 h acceptable for the demo? Your confidence floor (0.60) ends the loop.
- **Detection team:** four bright targets are placed as in `scenario.json`
  (`detection.bright_targets`). BT-3 has no AIS match and becomes the dark-ship candidate.
