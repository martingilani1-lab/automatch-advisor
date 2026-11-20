# Tag coverage review — 2026-11-20

Live catalog (Supabase MCP, read-only): **94 phases, 1 684 configurations**. Proposal only —
nothing written to the DB, no migration yet.

## 1. Where we stand

- **683 of 1 684 configurations (41 %) have no configuration tag.** 334 of those have no tag at all,
  not even a model tag from their phase.
- **6 of the 24 tags are never used:** `value_choice`, `value_retainer`, `workhorse`, `drivers_choice`,
  `sport`, `comfort_cruiser`. Another 3 exist in rules but match nothing because the data is missing:
  `heavy_tower`, `true_offroad`, `seven_seater` (only 3 rows).
- Tags in use: winter_ready 364, highway_cruiser 280, roadtrip_camper 243, city_commuter 138,
  ultra_efficient 138, bulletproof_reliability 90, hot_hatch 52, green_zone 39, sleeper 25,
  seven_seater 3. On phases: stroller_friendly 42, family_ideal 31, representative 10,
  head_turner 6, isofix_3x 3, cargo_van 1.

## 2. What kinds of cars we have

Grouped from the live segment × body counts (configurations):

| type | configs | untagged | typical cars |
|---|---|---|---|
| Compact family (C estate / liftback / sedan) | 559 | 254 | Octavia, Golf Variant, León ST, Bora, Toledo, A3 Sedan |
| Compact hatch (C, 3- and 5-door) | 467 | 211 | Golf, A3, León, Scala, ID.3, New Beetle |
| Mid-size family / exec (D estate / liftback / sedan / SUV) | 214 | 37 | Superb, Passat, A4, Arteon, Kodiaq, Tarraco |
| Compact SUV (C SUV / SUV coupe) | 125 | 31 | Karoq, Ateca, Tiguan, Q3, Formentor, Terramar |
| Small car (B hatch / estate) | 98 | 29 | Fabia, Polo, Ibiza, A1, i3, Zoe |
| Small crossover (B SUV / SUV coupe) | 86 | 57 | Kamiq, Arona, T-Cross, T-Roc, Q2, Taigo |
| Sports coupe / roadster (S) | 63 | 32 | TT |
| Cabrio (B / C) | 42 | 32 | A3 Cabrio, T-Roc Cabrio, New Beetle Cabrio |
| MPV / van (C / D) | 23 | 0 | Touran, Caddy, Multivan |
| Estate Cross (C) | 7 | 0 | Octavia Scout |
| *of all the above: electric / plug-in / EREV* | 39 | 0 | i3, Zoe, ID.3, Golf GTE, Octavia iV |

Across those types, the untagged mass is the **ordinary mid-power car**: a 1.4 / 1.5 TSI or 1.6 TDI
Golf, Octavia, León or A3 (82–150 kW), and **the 1996–2006 cars** (Golf IV, Bora, Octavia I, A3 8L,
León I). Today's rules tag the extremes (small city car, big diesel, GTI, AWD, big boot) and skip the
middle. They also leave out the old cars, because those have no NCAP child score and thirsty NEDC
figures.

## 3. Data gaps that block existing rules (fix the data, not the rule)

| rule | needs | filled today | effect |
|---|---|---|---|
| `heavy_tower` | `catalog_vehicle_configurations.towing_braked_kg` | **0 / 1 684** | never fires |
| `seven_seater` (5+2) | `phase_body_dimensions.seats_optional_max` | **0 / 151** | Kodiaq / Tarraco 7-seat option not tagged |
| `isofix_3x` | `phase_body_dimensions.isofix_count` | 6 / 151 | only Zoe and ID.3 tagged |
| `true_offroad` | `drivetrain_systems.has_low_range` | 25 / 25, but no car has low range | correct: nothing in the catalog is a real off-roader |
| `stroller_friendly`, `family_ideal`, `roadtrip_camper` | `boot_capacity_liters` | 145 / 151 | **Octavia NX and Golf CD1 have no boot figure** → no family tags at all |
| `value_retainer` | `resale_value_rating` | 91 / 94, but 70 are `holds_well` | too coarse to mean anything |

## 4. Proposed rule for every tag

Counts = configurations the rule tags (of which currently untagged). ✅ = rule exists, unchanged.

### Model level (phase)

| tag | rule | status |
|---|---|---|
| representative | segment D, not SUV / MPV only | ✅ |
| family_ideal | boot ≥ 550 AND NCAP child ≥ 75 % — **add:** OR an MPV body (Touran, Caddy, Multivan; the Multivan misses today: 469 l behind row 3) | extend |
| stroller_friendly | boot ≥ 500 | ✅ (NX / CD1 need boot data) |
| isofix_3x | isofix_count ≥ 3 | ✅ (needs data) |
| head_turner | segment S, or only coupe / cabrio / roadster / 4-seat 3-door | ✅ |
| cargo_van | boot ≥ 1 000 | ✅ |
| value_retainer | **proposed:** `holds_well` AND the phase's average engine reliability ≥ 4.0. Still ~55 phases, so it's weak. Better: re-rate resale so `holds_well` is the top ~20 % | needs your call |

### Configuration level

| tag | proposed rule | tags (new) |
|---|---|---|
| city_commuter | **A/B segment: petrol ≤ 85 kW** in any body except MPV (adds the 1.0 TSI 85 kW Kamiq / T-Cross / Arona / Polo and the Taigo, which today has zero tags); C-segment hatch petrol ≤ 81 kW as now; A/B electric as now | 156 (35) |
| highway_cruiser | C/D: diesel ≥ 100 kW in every body except 3-door hatch / cabrio (adds Golf / A3 / León TDI 5-door), **or petrol ≥ 110 kW** in an estate / liftback / sedan / SUV / MPV | 654 (167) — broad, see note |
| sport | engine badge GTI / GTD / RS / R / S3 / S4 / RS3 / Cupra, or segment S | 177 (65) |
| drivers_choice | manual gearbox + petrol ≥ 110 kW in a hatch / coupe / roadster / cabrio, or any segment-S car | 124 (75) |
| comfort_cruiser | segment D + torque-converter or wet-clutch DSG + ≥ 110 kW | 142 (19) |
| value_choice | engine reliability ≥ 4 AND gearbox reliability ≥ 4 AND the phase's average market price in the cheapest 25 % of its segment | 307 (97) |
| workhorse | diesel, engine and gearbox reliability ≥ 4, estate / liftback / MPV / SUV with boot ≥ 500 l (the 1.9 / 2.0 TDI Octavia Combi type) | 217 (1) — almost all already tagged |
| heavy_tower | until per-configuration towing exists: phase towing ≥ 1 800 kg AND engine torque ≥ 340 Nm (the 2.0 TDI / 2.0 TSI in a Superb / Kodiaq / Passat; a 1.0 TSI never qualifies) | 182 (7) |
| bulletproof_reliability, ultra_efficient, green_zone, winter_ready, roadtrip_camper, hot_hatch, sleeper, seven_seater, true_offroad | as now | — |

**All proposals together: 328 of the 683 untagged configurations get a tag** (→ about 79 % of the
catalog tagged, up from 59 %). The ~355 left over are mostly old 1996–2006 automatics and petrol
estates (Golf IV 1.6 auto, Bora 2.0, Octavia I 1.6) — honestly ordinary cars. A tag there would be
noise. `value_choice` already picks up the cheap reliable ones.

**Note on highway_cruiser:** adding petrol ≥ 110 kW more than doubles it (280 → 654), so on a
C/D estate it becomes the default. If that's too broad, raise petrol to ≥ 125 kW or require an
automatic. I can show the count for either.

## 5. What I need from you

1. Which proposed rules to keep, and any threshold changes (one line each is enough).
2. Data gaps: shall I research and fill boot for Octavia NX / Golf CD1, `seats_optional_max` for
   Kodiaq / Tarraco, and per-configuration towing? Those are UPDATEs, so they'd be files you run.
3. `value_retainer`: re-rate resale, or the reliability-filtered rule above?

After that: one additive migration `…_seed_tag_rules_round3.sql` (INSERT … ON CONFLICT DO NOTHING,
like the other tag files), a preview of the exact rows per car, then MCP run after your review +
`npm test`.
