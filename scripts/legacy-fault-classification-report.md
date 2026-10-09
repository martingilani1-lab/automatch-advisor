# Legacy fault classification report (read-only, nothing migrated)

Generated from `vehicles.common_faults` for every legacy row whose brand+model+generation
could be confidently matched to a live `catalog_phases` row. **34 vehicles, 129 faults.**

**Matching method**: brand exact match; model name with roman numerals/body-style suffixes/
generation-letter prefixes (e.g. "B8") stripped; then matched by the parenthesized chassis
code against `catalog_phases.generation_code` (exact, then prefix — legacy data sometimes
truncates a trailing digit the catalog's code includes, e.g. legacy "NW" vs catalog "NW1").
A vehicle whose code genuinely doesn't exist live (e.g. Golf VI "5K", A4 "B8", Tiguan I "5N",
or a model not seeded at all like Leon/A6/Q5/ID.3/up!) is correctly excluded below, not
loosely matched to a different real generation — see the exclusion list at the bottom.

**Severity mapping proposed** (legacy uses 4 levels, catalog_component_faults uses 3):
`critical`→`critical`, `high`→`critical`, `medium`→`moderate`, `low`→`minor`. Flag if you'd
rather map `high`→`moderate`.

**Classification method**: keyword heuristics only, not read for meaning — treat every row as
a draft for your review, not a verified classification. component_type one of
engine/transmission/drivetrain/vehicle; vehicle-level faults get a `category` from the frozen
list (electrical/body_rust/suspension/steering/brakes/climate/interior) or
`UNCLASSIFIED` where no keyword matched (needs a human pick, not a guess). A few rows are
flagged `NOT_A_FAULT` — legacy placeholder text ("too new for major patterns") that isn't a
real fault at all; proposed to exclude from migration entirely, not classify.

**Phase ambiguity**: a legacy vehicle row covers the whole generation, not one specific phase —
where a vehicle matched both Pre-facelift and Facelift, the fault is listed once with both
phase targets noted; whether it's duplicated into both phases, pinned to one, or re-targeted at
a specific engine_id/unit_id is your call per row, not assumed here.

---

## Škoda Fabia IV (PJ) (2021 - Present)

Matched phases: `PJ Pre-facelift`, `PJ Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| 1.0 TSI timing chain tensioner on early builds | medium | moderate | engine | — |
| Infotainment occasional lag and glitches | low | minor | vehicle | electrical |
| Rear drum brakes on lower specs | low | minor | vehicle | brakes |

## Audi A1 Sportback (GB) (2018 - Present)

Matched phases: `GB Pre-facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic mechatronics on all auto models | critical | critical | transmission | — |
| EA211 Evo timing chain stretch | medium | moderate | engine | — |
| Too new for major patterns | low | minor | NOT_A_FAULT | — |

## Audi A3 (8V) (2012 - 2020)

Matched phases: `8V Pre-facelift`, `8V Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 7-speed dry S-tronic mechatronics failure | critical | critical | transmission | — |
| EA888 timing chain tensioner on pre-facelift | high | critical | engine | — |
| EA211 1.4 TFSI timing chain stretch | medium | moderate | engine | — |
| Water pump failure on EA888 | medium | moderate | engine | — |
| MMI screen delamination on early cars | low | minor | vehicle | electrical |

## Audi Q3 (F3) (2018 - Present)

Matched phases: `F3 Pre-facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic mechatronics on 1.5 TFSI FWD | critical | critical | transmission | — |
| EA211 timing chain stretch on 1.5 TFSI | medium | moderate | engine | — |
| Too new for major patterns on 2.0 engines | low | minor | NOT_A_FAULT | — |

## Audi TT (8S) (2014 - 2023)

Matched phases: `8S Pre-facelift`, `8S Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic on FWD models | critical | critical | transmission | — |
| EA888 water pump failure | medium | moderate | engine | — |
| Convertible (Roadster) roof mechanism wear | medium | moderate | vehicle | UNCLASSIFIED -- needs human category pick |
| Magnetic ride damper failure if equipped | medium | moderate | vehicle | suspension |

## Audi A3 (8Y) (2020 - Present)

Matched phases: `8Y Pre-facelift`, `8Y Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic mechatronics on FWD auto | critical | critical | transmission | — |
| EA211 Evo timing chain stretch | medium | moderate | engine | — |
| Too new for major patterns | low | minor | NOT_A_FAULT | — |
| Dual touchscreen usability in cold weather | low | minor | vehicle | electrical |

## Cupra Formentor (2020 - Present)

Matched phases: `KM7 Pre-facelift`, `KM7 Facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 on 1.5 TSI FWD | critical | critical | transmission | — |
| EA888 water pump on 2.0 TSI | medium | moderate | engine | — |
| Too new for major patterns | low | minor | NOT_A_FAULT | — |

## SEAT Arona (2017 - Present)

Matched phases: `KJ7 Pre-facelift`, `KJ7 Facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on auto | critical | critical | transmission | — |
| EA211 Evo timing chain stretch | medium | moderate | engine | — |
| Too new for major patterns | low | minor | NOT_A_FAULT | — |

## SEAT Ateca (2016 - Present)

Matched phases: `KH7 Pre-facelift`, `KH7 Facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on FWD petrol auto | critical | critical | transmission | — |
| DPF on diesel with city use | high | critical | engine | — |
| EA888 water pump | medium | moderate | engine | — |
| Infotainment lag on pre-facelift | low | minor | vehicle | electrical |

## SEAT Tarraco (2018 - Present)

Matched phases: `KN2 Pre-facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 on FWD petrol | critical | critical | transmission | — |
| DPF on diesel with city use | high | critical | engine | — |
| EA888 water pump | medium | moderate | engine | — |

## Škoda Fabia III (NJ) (2014 - 2021)

Matched phases: `NJ Pre-facelift`, `NJ Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| EA211 1.2 TSI timing chain stretching | high | critical | engine | — |
| DSG DQ200 mechatronics in a budget car | critical | critical | transmission | — |
| Rear drum brake limited performance | low | minor | vehicle | brakes |
| Water pump leak on TSI engines | medium | moderate | engine | — |

## Škoda Kodiaq (NS7) (2016 - 2024)

Matched phases: `NS7 Pre-facelift`, `NS7 Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Haldex coupling oil change often neglected | high | critical | drivetrain | — |
| Electric tailgate malfunction | low | minor | vehicle | electrical |
| Brake wear faster due to vehicle weight | medium | moderate | vehicle | brakes |
| AdBlue system failures on diesel | medium | moderate | engine | — |

## Škoda Octavia II (1Z) (2004 - 2013)

Matched phases: `1Z Pre-facelift`, `1Z Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Rust on sills and rear wheel arches | high | critical | vehicle | body_rust |
| 2.0 FSI timing chain and fuel pump failures | critical | critical | engine | — |
| Worn suspension bushings and ball joints | medium | moderate | vehicle | suspension |
| EGR valve clogging on TDI engines | medium | moderate | engine | — |

## Škoda Octavia III (5E) (2013 - 2020)

Matched phases: `5E Pre-facelift`, `5E Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics failure | critical | critical | transmission | — |
| EA211 timing chain tensioner wear | high | critical | engine | — |
| Water pump leak around 80,000 km | medium | moderate | engine | — |
| Rear wheel arch corrosion | medium | moderate | vehicle | body_rust |
| EGR and DPF issues on TDI with short trips | high | critical | engine | — |

## Škoda Octavia IV (NX) (2020 - Present)

Matched phases: `NX Pre-facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Infotainment freezing and software bugs (early builds) | medium | moderate | vehicle | electrical |
| Touch climate controls unresponsive | low | minor | vehicle | climate |
| AdBlue system sensor failures on diesel | medium | moderate | engine | — |
| 48V mild-hybrid starter-generator issues (eTSI) | medium | moderate | engine | — |

## Škoda Superb III (3V) (2015 - 2024)

Matched phases: `3V Pre-facelift`, `3V Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Columbus infotainment freezing | medium | moderate | vehicle | electrical |
| Parking sensor and camera electrical faults | low | minor | engine | — |
| AdBlue system failures on diesel | medium | moderate | engine | — |
| Electric boot mechanism malfunction | low | minor | vehicle | electrical |

## Volkswagen Arteon (2017 - Present)

Matched phases: `3H7 Pre-facelift`, `3H7 Facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 DSG mechatronics on FWD 2.0 TSI | critical | critical | transmission | — |
| EA888 water pump failure | medium | moderate | engine | — |
| Frameless door window alignment | low | minor | vehicle | UNCLASSIFIED -- needs human category pick |
| DPF on diesel with city use | high | critical | engine | — |

## Volkswagen Golf VII (5G) (2013 - 2020)

Matched phases: `5G Pre-facelift`, `5G Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics failure | critical | critical | transmission | — |
| EA211 timing chain tensioner wear | high | critical | engine | — |
| Water pump leak around 80k km | medium | moderate | engine | — |
| Rear wheel bearing noise | medium | moderate | vehicle | suspension |
| Infotainment screen delamination on early models | low | minor | vehicle | electrical |

## Volkswagen Golf VIII (CD) (2020 - Present)

Matched phases: `CD1 Pre-facelift`, `CD1 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Infotainment freezing and lag (early builds) | high | critical | vehicle | electrical |
| Capacitive steering wheel buttons unresponsive | medium | moderate | vehicle | electrical |
| Touch climate slider difficult while driving | medium | moderate | vehicle | climate |
| Windshield wiper motor failures | low | minor | vehicle | electrical |

## Volkswagen Multivan / Transporter T6 (2015 - Present)

Matched phases: `T7 Pre-facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DPF clogging — vans often used for short trips | critical | critical | engine | — |
| DSG DQ500 judder at high mileage | medium | moderate | transmission | — |
| Sliding door mechanism wear with heavy use | medium | moderate | vehicle | electrical |
| Injector issues on 2.0 TDI at very high mileage | medium | moderate | engine | — |
| Dashboard rattle | low | minor | vehicle | interior |

## Volkswagen Passat B8 (3G) (2015 - 2024)

Matched phases: `3G Pre-facelift`, `3G Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| AdBlue system sensor failures on diesel | medium | moderate | engine | — |
| Infotainment lag and occasional freezing | low | minor | vehicle | electrical |
| DPF regeneration issues with short trips | high | critical | engine | — |
| Electric parking brake malfunction | medium | moderate | vehicle | brakes |
| DSG mechatronics on DQ200 variants | high | critical | transmission | — |

## Volkswagen Polo VI (AW) (2017 - Present)

Matched phases: `AW Pre-facelift`, `AW Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics | high | critical | transmission | — |
| 1.0 TSI timing chain tensioner | medium | moderate | engine | — |
| Water pump plastic impeller | medium | moderate | engine | — |
| Infotainment lag on early models | low | minor | vehicle | electrical |

## Volkswagen T-Cross (2019 - Present)

Matched phases: `C11 Pre-facelift`, `C11 Facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 DSG mechatronics on auto models | critical | critical | transmission | — |
| EA211 Evo timing chain stretch | medium | moderate | engine | — |
| Too new for major patterns | low | minor | NOT_A_FAULT | — |

## Volkswagen T-Roc (A11) (2017 - Present)

Matched phases: `A11 Pre-facelift`, `A11 Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on 1.0/1.5 TSI | high | critical | transmission | — |
| Infotainment lag and glitches | low | minor | vehicle | electrical |
| Rear seat space complaints from taller passengers | low | minor | NOT_A_FAULT | — |
| Rattles from rear load cover area | low | minor | vehicle | interior |

## Volkswagen Taigo (2022 - Present)

Matched phases: `CS Pre-facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 DSG mechatronics on auto | critical | critical | transmission | — |
| EA211 Evo timing chain | medium | moderate | engine | — |

## Volkswagen Tiguan Allspace (AD) (2017 - Present)

Matched phases: `AD1 Pre-facelift`, `AD1 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on FWD 1.5 TSI | critical | critical | transmission | — |
| DPF clogging on diesel with city use | high | critical | engine | — |
| EA888 water pump failure | medium | moderate | engine | — |
| Third row seat mechanism wear | low | minor | vehicle | interior |

## Volkswagen Tiguan II (AD) (2016 - Present)

Matched phases: `AD1 Pre-facelift`, `AD1 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on 1.4/1.5 TSI | high | critical | transmission | — |
| Haldex coupling oil change neglected on 4MOTION | high | critical | drivetrain | — |
| AdBlue system failures on diesel | medium | moderate | engine | — |
| Electric tailgate malfunction | low | minor | vehicle | electrical |
| Brake pad wear faster than expected | medium | moderate | vehicle | brakes |

## Volkswagen Touran II (5T) (2015 - Present)

Matched phases: `5T Pre-facelift`, `5T Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on 1.4/1.5 TSI | high | critical | transmission | — |
| Electric sliding door mechanism (if equipped) | medium | moderate | vehicle | electrical |
| Rear seat rail wear from frequent reconfiguration | low | minor | vehicle | interior |
| AdBlue system on diesel | medium | moderate | engine | — |

## Audi A4 (B9) (2015 - Present)

Matched phases: `B9 Pre-facelift`, `B9 Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic mechatronics on FWD petrol | critical | critical | transmission | — |
| EA888 water pump failure | medium | moderate | engine | — |
| Virtual Cockpit pixel failures on early cars | low | minor | vehicle | electrical |
| Oil consumption on EA888 2.0 TFSI | medium | moderate | engine | — |

## Audi Q2 (GA) (2016 - Present)

Matched phases: `GA Pre-facelift`, `GA Facelift` (method: code-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DQ200 S-tronic mechatronics on FWD auto | critical | critical | transmission | — |
| EA211 timing chain stretch | medium | moderate | engine | — |
| DPF on diesel with city use | high | critical | engine | — |
| Virtual Cockpit glitches on early cars | low | minor | vehicle | electrical |

## Škoda Scala (NW) (2019 - Present)

Matched phases: `NW1 Pre-facelift`, `NW1 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Rear torsion beam bushing wear on poor roads | low | minor | vehicle | suspension |
| DSG DQ200 mechatronics if automatic | high | critical | transmission | — |
| Infotainment software glitches | low | minor | vehicle | electrical |

## Škoda Kamiq (NW) (2019 - Present)

Matched phases: `NW4 Pre-facelift`, `NW4 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on automatic versions | high | critical | transmission | — |
| Infotainment software glitches | low | minor | vehicle | electrical |
| 1.0 TSI timing chain tensioner | medium | moderate | engine | — |

## Škoda Karoq (NU) (2017 - Present)

Matched phases: `NU7 Pre-facelift`, `NU7 Facelift` (method: code-prefix-match)

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| DSG DQ200 mechatronics on 1.0/1.5 TSI | high | critical | transmission | — |
| VarioFlex seat mechanism wear | low | minor | vehicle | interior |
| Infotainment software glitches | low | minor | vehicle | electrical |
| AdBlue failures on diesel | medium | moderate | engine | — |

## Volkswagen Passat B9 Variant (2024 - Present)

Matched phases: `CJ Pre-facelift` (method: year-overlap(no-code-in-name))

| Fault | Legacy severity | → | Proposed component_type | Proposed category |
|---|---|---|---|---|
| Too new for any patterns | low | minor | NOT_A_FAULT | — |
| Touch-heavy interior | medium | moderate | vehicle | interior |

---

## Excluded (no confident live-generation match)

Not migrated here, not classified — these legacy rows' chassis code either isn't seeded at
all, or is a genuinely different generation than what's live:

- **Volkswagen Amarok (2H)** (2010 - 2022) — no catalog_phases row for volkswagen Amarok at all
- **Škoda Superb IV (NX)** (2024 - Present) — catalog has 3V,3V,PY for Superb, not NX
- **Škoda Superb II (3T)** (2008 - 2015) — catalog has 3V,3V,PY for Superb, not 3T
- **Audi A5 Sportback (F5)** (2016 - Present) — no catalog_phases row for audi A5 at all
- **Audi Q7 (4M)** (2015 - Present) — no catalog_phases row for audi Q7 at all
- **Audi A4 (B8)** (2008 - 2015) — catalog has B9,B9 for A4, not B8
- **Audi A6 (C7)** (2011 - 2018) — no catalog_phases row for audi A6 at all
- **Audi A6 (C8)** (2018 - Present) — no catalog_phases row for audi A6 at all
- **Audi Q3 (8U)** (2011 - 2018) — catalog has F3 for Q3, not 8U
- **Audi Q4 e-tron** (2021 - Present) — no catalog_phases row for audi Q4 e-tron at all
- **Audi Q5 (8R)** (2008 - 2017) — no catalog_phases row for audi Q5 at all
- **Audi Q5 (FY)** (2017 - Present) — no catalog_phases row for audi Q5 at all
- **Audi RS4 Avant (B9)** (2017 - Present) — no catalog_phases row for audi RS4 at all
- **SEAT Ibiza V (6F)** (2017 - Present) — catalog has KJ,KJ for Ibiza, not 6F
- **SEAT Leon III (5F)** (2012 - 2020) — no catalog_phases row for seat Leon at all
- **SEAT Leon IV (KL)** (2020 - Present) — no catalog_phases row for seat Leon at all
- **Škoda Citigo (AA)** (2012 - 2020) — no catalog_phases row for škoda Citigo at all
- **Škoda Elroq** (2025 - Present) — no catalog_phases row for škoda Elroq at all
- **Škoda Enyaq iV** (2021 - Present) — no catalog_phases row for škoda Enyaq iV at all
- **Škoda Rapid Spaceback (NH3)** (2013 - 2019) — no catalog_phases row for škoda Rapid at all
- **Škoda Roomster (5J)** (2006 - 2015) — no catalog_phases row for škoda Roomster at all
- **Škoda Yeti (5L)** (2009 - 2017) — no catalog_phases row for škoda Yeti at all
- **Cupra Tavascan** (2024 - Present) — no catalog_phases row for cupra Tavascan at all
- **Volkswagen Golf R (Mk7/Mk8)** (2014 - Present) — no catalog_phases row for volkswagen Golf R (Mk7 at all
- **Volkswagen ID.4** (2021 - Present) — no catalog_phases row for volkswagen ID.4 at all
- **Volkswagen ID.7** (2023 - Present) — no catalog_phases row for volkswagen ID.7 at all
- **Volkswagen Sharan (7N)** (2010 - 2022) — no catalog_phases row for volkswagen Sharan at all
- **Volkswagen up!** (2012 - 2023) — no catalog_phases row for volkswagen up! at all
- **Audi e-tron (GE)** (2019 - 2024) — no catalog_phases row for audi e-tron at all
- **Audi RS6 Avant (C8)** (2019 - Present) — no catalog_phases row for audi RS6 at all
- **Cupra Born** (2021 - Present) — no catalog_phases row for cupra Born at all
- **Škoda Fabia II (5J)** (2007 - 2014) — catalog has NJ,NJ,PJ,PJ for Fabia, not 5J
- **Volkswagen Golf VI (5K)** (2008 - 2013) — catalog has 1J,1J,5G,5G,CD1,CD1 for Golf, not 5K
- **Volkswagen Polo V (6R/6C)** (2009 - 2017) — no catalog_phases row for volkswagen Polo V (6R at all
- **Volkswagen Passat B7 (3C)** (2010 - 2015) — catalog has 3G,3G,CJ for Passat, not 3C
- **Volkswagen Tiguan I (5N)** (2007 - 2016) — catalog has AD1,AD1,CT for Tiguan, not 5N
- **Volkswagen Touareg (CR)** (2018 - Present) — no catalog_phases row for volkswagen Touareg at all
- **Volkswagen Caddy (2K/SA)** (2015 - Present) — no catalog_phases row for volkswagen Caddy (2K at all
- **Volkswagen ID.3** (2020 - Present) — no catalog_phases row for volkswagen ID.3 at all
- **Volkswagen ID. Buzz** (2022 - Present) — no catalog_phases row for volkswagen ID. Buzz at all
- **Volkswagen ID.5** (2022 - Present) — no catalog_phases row for volkswagen ID.5 at all

---

## Summary

- 34 vehicles matched, 129 faults classified (draft).
- 8 fault(s) flagged as not real faults ("too new for patterns" placeholders).
- 2 fault(s) fell through every keyword and need a manual category pick.
