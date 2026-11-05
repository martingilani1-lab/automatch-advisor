# City-car batch, 2026-11 — intake documents

There are 15 cars in total: 13 intake documents plus one gap check for the 2 cars already in the
catalog. Each document follows `scripts/new-car-template/INTAKE.md` (sections A–J). Every document
was dry-run through `scripts/intake-to-template.mjs` against a snapshot of the live DB taken on
2026-11-05.

| # | car | file | dry-run today | what it tests |
|---|---|---|---|---|
| 1 | Škoda Fabia II (5J) | `skoda-fabia-5j.md` | **clean** | new generation under a live model, REUSE engines, 1.4 TDI pump-injector, explicit DPF true/false |
| 2 | Toyota Yaris II (XP90) | `toyota-yaris-xp90.md` | STOP: 8 gearboxes | new brand, AMT (MMT), 4AT, CVT |
| 3 | Hyundai i10 II (IA) | `hyundai-i10-ia.md` | STOP: 2 gearboxes | segment A, engine shared with the Picanto |
| 4 | Suzuki Swift (FZ) | `suzuki-swift-fz.md` | STOP: 3 gearboxes + 1 drivetrain | 3 + 5-door, 4x4 viscous drivetrain, Fiat diesel |
| 5 | Kia Picanto II (TA) | `kia-picanto-ta.md` | STOP: 2 gearboxes | same code at 2 powers (G3LA 49 / 51) |
| 6 | Mazda 2 (DJ) | `mazda-2-dj.md` | STOP: 2 gearboxes | NEDC → WLTP between phases, Skyactiv-D DPF |
| 7 | Škoda Fabia III (NJ) | `GAPS-fabia-nj-polo-aw.md` | already live | gap check |
| 8 | Hyundai i20 III (BC3) | `hyundai-i20-bc3.md` | STOP: 4 gearboxes | 48 V MHEV, GPF, dry DCT, hot hatch (i20 N) |
| 9 | Kia Rio IV (YB) | `kia-rio-yb.md` | STOP: 4 gearboxes | 4AT, diesel at 2 powers |
| 10 | VW Polo VI (AW) | `GAPS-fabia-nj-polo-aw.md` | already live | gap check: CNG TGI missing, FL MPI power |
| 11 | Toyota Yaris IV (XP210) | `toyota-yaris-xp210.md` | STOP: 3 gearboxes | HEV, power-split, dual injection |
| 12 | Honda Jazz IV (GR) | `honda-jazz-gr.md` | **clean** | HEV, **first `Hatchback Cross` body** (Crosstar) |
| 13 | BMW i3 (I01) | `bmw-i3-i01.md` | **clean** | **first pure EV**, RWD, battery / AC / DC / heat pump |
| 14 | Renault Zoe Ph2 (X10) | `renault-zoe-x10.md` | **clean** (DB will reject 0★, see below) | EV, `active_air` battery cooling, **0-star NCAP** |
| 15 | Renault Clio V (BJA) | `renault-clio-bja.md` | STOP: 3 gearboxes | E-Tech HEV, Blue dCi with **AdBlue**, dry EDC, front-passenger ISOFIX |

A "STOP" here is the pipeline doing its job. Brands, gearboxes and drivetrains are shared reference
data and get their own reviewed migration first; nothing else in those documents fails. See
`REFERENCE-NEEDED.md` for the full list.

## Before importing anything

1. Run `20261105150000` (EV / injection columns). Until it runs, the live `catalog_engines` has no
   `injection_type` / battery columns, so the parser's live engine query fails.
2. Confirm the reference list (`REFERENCE-NEEDED.md`). Claude then writes it as one migration.
3. Fill the `NULL` prices / mileage ranges (market data) and every line marked **verify**.

## Conventions used

- **`NULL` over guessing.** NCAP percentages are only filled where an Euro NCAP datasheet or a
  manufacturer release was reached, and consumption only where a figure was confirmed. That's why
  section J is short or omitted in most documents.
- **Petrol engines carry explicit `has_dpf = false`, `has_adblue = false`,** the same as the
  2026-11-04 all-engine pass. `has_gpf` is filled only where known.
- **HEV `power_kw` is the system output.** Engine output goes in `display_name`. The live PHEV `DGEA`
  uses engine output; that can't be the key here, because the Yaris Hybrid 130 keeps the same 68 kW
  engine as the 116. **Martin to confirm.**
- **An EV "engine" code is the powertrain variant.** The i3 used one motor at 125 kW with three
  battery sizes, so the codes are `i3-60Ah` / `i3-94Ah` / `i3-120Ah`. **Martin to confirm** before
  it becomes the pattern for every EV.

## Parser change made for this batch

`intake-to-template.mjs` section I now accepts `CODE@kW` as an engine fault target
(e.g. `G3LA@49kW`). It is needed whenever the same engine code appears at two powers in one
document, which happened in 7 of these 13 documents. Before this change those faults could only
STOP as "ambiguous". A bare code still works when it's unique.
