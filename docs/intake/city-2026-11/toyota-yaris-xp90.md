# Intake — Toyota Yaris II (XP90)

> **Reconcile (live, 2026-11-05):** brand `Toyota` is NOT live → needs the reference migration
> (`REFERENCE-NEEDED.md`) first. Every engine is NEW. **No Toyota manual / AMT / 4AT / CVT gearbox
> exists in `transmission_units`** — all gearboxes below STOP until the reference rows are reviewed and
> added. Codes C551 / C54 / C53 come from the Toyota C-series application list; EC60, U441E and the
> Multidrive S CVT code are **unverified** — confirm before the reference migration.
> The TS (2ZR-FE) gearbox code is unknown → left as the explicit placeholder `Toyota TS-MT (code TBD)`,
> which STOPs by design. Facelift length inherited from pre-facelift (3750 mm) — **verify** (new bumpers
> may make it ~3785 mm). Prices / mileage NULL for Martin. 1ND-TV DPF: Euro 4 version without DPF —
> **verify** that no Euro 5 DPF version was sold in SK/CZ.

## A. CAR
| field | value |
|---|---|
| brand | Toyota |
| brand_country | Japan |
| model | Yaris |
| segment | B |
| origin_country | japanese |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | XP90 |
| phase_label | Pre-facelift |
| year_from | 2005 |
| year_to | 2008 |
| display_name | Yaris II (XP90) Pre-facelift |
| platform_code | Toyota B (NBC) |
| safety_rating | 5 |
| ncap_year | 2005 |
| ncap_adult_pct | NULL |
| ncap_child_pct | NULL |
| ncap_pedestrian_pct | NULL |
| ncap_safety_assist_pct | NULL |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

### Facelift
| field | value |
|---|---|
| generation_code | XP90 |
| phase_label | Facelift |
| year_from | 2009 |
| year_to | 2011 |
| display_name | Yaris II (XP90) Facelift |
| platform_code | Toyota B (NBC) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

INHERIT phase attributes FROM Toyota Yaris XP90 Pre-facelift

*(2005 Euro NCAP, old protocol: adult 5★, child 4★, pedestrian 3★ — no percentages.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 3-door | 3750 | 1695 | 1530 | NULL | NULL | 272 | 1086 | 5 | NULL | NULL | 42 | 2 | false |
| Pre-facelift | Hatchback 5-door | 3750 | 1695 | 1530 | NULL | NULL | 272 | 1086 | 5 | 1480 | 470 | 42 | 2 | false |

### Facelift
INHERIT dimensions FROM Toyota Yaris XP90 Pre-facelift / Hatchback 3-door
INHERIT dimensions FROM Toyota Yaris XP90 Pre-facelift / Hatchback 5-door

*(Boot 272 l with the sliding rear bench fully back. 5-door GVW / payload from auto-data.net, 1.3 VVT-i.)*

## D. ENGINES
*(Every engine of this generation is chain-driven — `timing_replacement_km` NULL by design.)*

| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1KR-FE | 51 | petrol | NULL | 1.0 VVT-i 51kW | NULL | 998 | 93 | L3 | Euro4 | chain | NULL | NULL | false | false | false | port |
| 2SZ-FE | 64 | petrol | NULL | 1.3 VVT-i 64kW | NULL | 1296 | 121 | L4 | Euro4 | chain | 3.2 | NULL | false | false | false | port |
| 1NR-FE | 74 | petrol | NULL | 1.33 Dual VVT-i 74kW | NULL | 1329 | 132 | L4 | NULL | chain | NULL | NULL | false | false | false | port |
| 2ZR-FE | 98 | petrol | NULL | 1.8 Dual VVT-i TS 98kW | NULL | 1798 | 173 | L4 | Euro4 | chain | NULL | NULL | false | false | false | port |
| 1ND-TV | 66 | diesel | NULL | 1.4 D-4D 66kW | NULL | 1364 | 190 | L4 | Euro4 | chain | NULL | NULL | false | NULL | false | common_rail |

## E. GEARBOXES
| unit_code |
|---|
| Toyota C551 |
| Toyota C54 |
| Toyota C53 |
| Toyota EC60 |
| Toyota MultiMode (MMT) |
| Toyota U441E |
| Toyota Multidrive S CVT |
| Toyota TS-MT (code TBD) |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2005 – 2008):**
- Pre-facelift: 1KR-FE 51kW + Toyota C551 / Toyota MultiMode (MMT) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: 2SZ-FE 64kW + Toyota C54 / Toyota MultiMode (MMT) / Toyota U441E + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: 1ND-TV 66kW + Toyota C53 / Toyota MultiMode (MMT) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: 2ZR-FE 98kW + Toyota TS-MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]

**Facelift (2009 – 2011):**
- Facelift: 1KR-FE 51kW + Toyota C551 / Toyota MultiMode (MMT) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: 1NR-FE 74kW + Toyota EC60 / Toyota Multidrive S CVT + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: 1ND-TV 66kW + Toyota C53 / Toyota MultiMode (MMT) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: 2ZR-FE 98kW + Toyota TS-MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Terra | 1 | Pre-facelift, Facelift | Front and side airbags plus driver knee airbag, ABS with EBD, passenger airbag deactivation switch, ISOFIX on the rear outer seats, sliding and split-folding rear bench. |
| Luna | 2 | Pre-facelift, Facelift | Manual air conditioning, electric front windows, radio with CD and steering-wheel controls, body-coloured mirrors. |
| Sol | 3 | Pre-facelift, Facelift | Automatic climate control, 15-inch alloy wheels, front fog lights, leather steering wheel, curtain airbags. |
| TS | 4 | Pre-facelift, Facelift | 1.8 Dual VVT-i 98kW, 16-inch alloy wheels, sports-tuned suspension, rear disc brakes, body kit with rear spoiler. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | 1ND-TV | Excessive oil consumption from piston-ring / bore wear on 2005–2008 engines; can end in engine replacement. | critical | NULL |
| engine | 1ND-TV | Injector seal leaks and injector failure (black smoke, hard starting). | moderate | NULL |
| engine | 2SZ-FE | Timing chain / tensioner rattle at cold start as mileage grows. | moderate | NULL |
| engine | 1KR-FE | Water pump leak (coolant weep at the pump). | minor | NULL |
| engine | 1NR-FE | Raised oil consumption on some engines (ring sticking) — check level between services. | moderate | NULL |
| gearbox | Toyota MultiMode (MMT) | Clutch actuator and clutch wear; jerky, slow shifts and loss of drive — clutch must be re-learned after every repair. | moderate | NULL |
| vehicle | Pre-facelift | Dashboard and door-card rattles and creaks. | minor | interior |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_wltp_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_wltp_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | 1KR-FE@51kW | Toyota C551 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1KR-FE@51kW | Toyota C551 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1KR-FE@51kW | Toyota MultiMode (MMT) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1KR-FE@51kW | Toyota MultiMode (MMT) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota C54 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota C54 | FWD | Hatchback 5-door | 6.0 | NULL | NULL | NULL | NULL | 7.2 | 5.3 | NULL | NULL | 1010 | 11.5 | 170 | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota MultiMode (MMT) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota MultiMode (MMT) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota U441E | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2SZ-FE@64kW | Toyota U441E | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1ND-TV@66kW | Toyota C53 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1ND-TV@66kW | Toyota C53 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1ND-TV@66kW | Toyota MultiMode (MMT) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 1ND-TV@66kW | Toyota MultiMode (MMT) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2ZR-FE@98kW | Toyota TS-MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | 2ZR-FE@98kW | Toyota TS-MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1KR-FE@51kW | Toyota C551 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1KR-FE@51kW | Toyota C551 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1KR-FE@51kW | Toyota MultiMode (MMT) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1KR-FE@51kW | Toyota MultiMode (MMT) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1NR-FE@74kW | Toyota EC60 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1NR-FE@74kW | Toyota EC60 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1NR-FE@74kW | Toyota Multidrive S CVT | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1NR-FE@74kW | Toyota Multidrive S CVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1ND-TV@66kW | Toyota C53 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1ND-TV@66kW | Toyota C53 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1ND-TV@66kW | Toyota MultiMode (MMT) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 1ND-TV@66kW | Toyota MultiMode (MMT) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 2ZR-FE@98kW | Toyota TS-MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | 2ZR-FE@98kW | Toyota TS-MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
