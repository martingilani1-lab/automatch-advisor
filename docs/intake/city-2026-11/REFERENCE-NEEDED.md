# Reference data the city batch needs first

These are shared reference rows. Per CLAUDE.md rule 2c, a car import never creates them. Each block
below becomes one reviewed migration once Martin confirms the codes. Nothing here has been written as
SQL or run.

## 1. Brands (8): additive

`Toyota` (Japan), `Hyundai` (South Korea), `Kia` (South Korea), `Suzuki` (Japan), `Mazda` (Japan),
`Honda` (Japan), `BMW` (Germany), `Renault` (France).

None of them collides with a live brand under the normalized-name index (live brands: Audi, Cupra,
SEAT, Škoda, Volkswagen).

Note that `generate-seed.mjs` currently inserts a missing brand inline
(`insert into catalog_brands ... on conflict do nothing`). That contradicts rule 2c. Either the rule
or the script should change; until then, a brand migration run first makes that inline insert a
no-op.

## 2. Gearboxes: new `transmission_units` rows

Confidence: ✅ = known factory code, ⚠️ = code from memory, verify, ❓ = code unknown (the documents
use a `(code TBD)` placeholder).

| proposed code | maker | family | speeds | used by | confidence |
|---|---|---|---|---|---|
| Toyota C551 | Toyota | manual | 5 | Yaris II 1.0 | ✅ (Toyota C-series list: Yaris / Aygo 1KR) |
| Toyota C54 | Toyota | manual | 5 | Yaris II 1.3 | ⚠️ (C-series list names "Yaris", not the engine) |
| Toyota C53 | Toyota | manual | 5 | Yaris II 1.4 D-4D | ✅ (C-series list: Yaris 1.4 D-4D) |
| Toyota EC60 | Toyota | manual | 6 | Yaris II 1.33 | ⚠️ |
| Toyota MultiMode (MMT) | Toyota | amt | 5 | Yaris II 1.0 / 1.3 / D-4D | ⚠️ one row for C551A / C54A / C53A, or three? |
| Toyota U441E | Toyota | torque_converter | 4 | Yaris II 1.3 auto | ⚠️ |
| Toyota Multidrive S CVT | Toyota | cvt | — | Yaris II 1.33 | ❓ code |
| Toyota TS-MT | Toyota | manual | ? | Yaris II TS 1.8 | ❓ |
| Toyota 1.0 5MT / 1.5 6MT / 1.5 CVT | Toyota | manual / manual / cvt | 5 / 6 / — | Yaris IV | ❓ |
| Hyundai M5EF2 | Hyundai-Kia | manual | 5 | i10 II, Picanto II | ⚠️ |
| Hyundai A4CF0 | Hyundai-Kia | torque_converter | 4 | i10 II, Picanto II | ✅ |
| Hyundai A4CF1 | Hyundai-Kia | torque_converter | 4 | Rio IV 1.4 | ⚠️ |
| Hyundai D7GF1 | Hyundai-Kia | dct_dry | 7 | i20 III, Rio IV | ⚠️ |
| Hyundai 5MT / 6MT / 6iMT / N 6MT | Hyundai-Kia | manual | 5 / 6 / 6 / 6 | i20 III, Rio IV | ❓ |
| Suzuki 5MT / 4AT / Sport 6MT | Suzuki | manual / torque_converter / manual | 5 / 4 / 6 | Swift FZ | ❓ |
| Mazda Skyactiv-MT 5 / 6 | Mazda | manual | 5 / 6 | Mazda 2 DJ | ❓ |
| Renault JH3 | Renault | manual | 5 | Clio V SCe / TCe 100 | ⚠️ |
| Renault JT4 | Renault | manual | 6 | Clio V TCe 90 | ⚠️ |
| Renault TL4 | Renault | manual | 6 | Clio V Blue dCi | ⚠️ |

Before writing each row, run
`node scripts/audit-reference-duplicates.mjs --check-new transmissions "<maker>" "<family>" <speeds>`
(CLAUDE.md rule 2c).

Live units the batch REUSES as they are: `VW MQ200`, `VW DQ200`, `Aisin 09G (TF-60SN)`,
`Mazda Skyactiv-Drive 6AT`, `Toyota Hybrid Synergy eCVT`, `Honda e:HEV eCVT`,
`Renault EDC 7-speed (dry)`, `Renault E-TECH Multi-mode`, `generic:Single-speed EV`.

## 3. Drivetrain: 1 new `drivetrain_systems` row

- `suzuki_viscous_4wd`: Swift FZ 4x4, a viscous centre coupling (`on_demand`, maker Suzuki).

## 4. Family corrections on live units (UPDATE, human-run)

| unit | live family | should be | why |
|---|---|---|---|
| Toyota Hybrid Synergy eCVT | cvt | power_split | planetary gearset, no belt (needs `20261105150000` first) |
| Toyota Hybrid Synergy eCVT AWD-i | cvt | power_split | same |
| Honda e:HEV eCVT | cvt | ? | series hybrid + one fixed-ratio lock-up clutch: neither a belt CVT nor a power split. `single_speed` is closest; or a new value |
| Renault E-TECH Multi-mode | dct_wet | ? | clutchless dog-clutch box with no friction clutch, so `dct_wet` is wrong. No current value fits; `amt` is closest mechanically |

## 5. CHECK constraints the batch runs into

- **`catalog_phases_safety_rating_check` is `1..5`.** Renault Zoe Ph2 has a real **0-star** Euro
  NCAP result (2021), which the DB rejects. The fix is to widen it to `0..5` (migration), and the app
  then has to show 0★ distinctly from "not tested" (NULL).
- **`battery_thermal_management`:** `active_refrigerant` added (`20261105180000`) for the BMW i3.
