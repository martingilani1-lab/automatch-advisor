# Intake — Mazda 2 III (DJ)

> **Reconcile (live, 2026-11-05):** brand `Mazda` NOT live. Engines NEW. Gearbox
> `Mazda Skyactiv-Drive 6AT` IS live (torque converter; a family name, not a factory code — reused as the
> catalog already does). The two Skyactiv-MT manuals are NOT live → STOP; codes **unverified**, given as
> explicit `(code TBD)` placeholders. Engine codes P5-VPS / P5-VPR / S5-DPTS are **unverified** —
> confirm (VIN / service data) before the import. The 2020+ "M Hybrid" (24 V) versions of the 66 / 85 kW
> engines would need their own codes — the key (code, power_kw) can't hold both a plain and an MHEV
> variant — so they are left out until Martin gives the codes. The 2022+ "Mazda2 Hybrid" is a rebadged
> Yaris IV, a different car (not part of this doc). Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Mazda |
| brand_country | Japan |
| model | 2 |
| segment | B |
| origin_country | japanese |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | DJ |
| phase_label | Pre-facelift |
| year_from | 2015 |
| year_to | 2019 |
| display_name | Mazda 2 (DJ) Pre-facelift |
| platform_code | Skyactiv (DJ) |
| safety_rating | 4 |
| ncap_year | 2015 |
| ncap_adult_pct | 86 |
| ncap_child_pct | 78 |
| ncap_pedestrian_pct | 84 |
| ncap_safety_assist_pct | 64 |
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
| generation_code | DJ |
| phase_label | Facelift |
| year_from | 2020 |
| year_to | 2024 |
| display_name | Mazda 2 (DJ) Facelift |
| platform_code | Skyactiv (DJ) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Mazda 2 DJ Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4060 | 1695 | 1495 | NULL | NULL | 280 | 950 | 5 | NULL | NULL | 44 | 2 | false |

### Facelift
INHERIT dimensions FROM Mazda 2 DJ Pre-facelift / Hatchback 5-door

## D. ENGINES
*(Skyactiv-G: high-compression direct-injection petrol, chain. Skyactiv-D 1.5: low-compression common-rail diesel with DPF, Euro 6 without SCR.)*

| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P5-VPS | 55 | petrol | NULL | 1.5 Skyactiv-G 55kW | NULL | 1496 | 135 | L4 | Euro6 | chain | NULL | NULL | false | false | false | direct |
| P5-VPS | 66 | petrol | NULL | 1.5 Skyactiv-G 66kW | NULL | 1496 | 148 | L4 | Euro6 | chain | NULL | NULL | false | false | false | direct |
| P5-VPR | 85 | petrol | NULL | 1.5 Skyactiv-G 85kW | NULL | 1496 | 148 | L4 | Euro6 | chain | NULL | NULL | false | false | false | direct |
| S5-DPTS | 77 | diesel | NULL | 1.5 Skyactiv-D 77kW | NULL | 1499 | 220 | L4 | Euro6 | chain | NULL | NULL | true | NULL | false | common_rail |

## E. GEARBOXES
| unit_code |
|---|
| Mazda Skyactiv-MT 5-speed (code TBD) |
| Mazda Skyactiv-MT 6-speed (code TBD) |
| Mazda Skyactiv-Drive 6AT |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2015 – 2019):**
- Pre-facelift: P5-VPS 55kW + Mazda Skyactiv-MT 5-speed (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: P5-VPS 66kW + Mazda Skyactiv-MT 5-speed (code TBD) / Mazda Skyactiv-Drive 6AT + FWD → [Hatchback 5-door]
- Pre-facelift: P5-VPR 85kW + Mazda Skyactiv-MT 6-speed (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: S5-DPTS 77kW + Mazda Skyactiv-MT 6-speed (code TBD) + FWD → [Hatchback 5-door]

**Facelift (2020 – 2024):**
- Facelift: P5-VPS 55kW + Mazda Skyactiv-MT 5-speed (code TBD) + FWD → [Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Emotion | 1 | Pre-facelift | Six airbags, ESC, passenger airbag cut-off switch, ISOFIX on the rear outer seats, manual air conditioning, City Brake Support. |
| Challenge | 2 | Pre-facelift | 15-inch alloy wheels, MZD Connect with 7-inch touchscreen, cruise control, heated mirrors. |
| Attraction | 3 | Pre-facelift | 16-inch alloy wheels, automatic climate control, head-up Active Driving Display, rear parking sensors. |
| Revolution | 4 | Pre-facelift | LED headlights, keyless entry, heated seats, blind-spot monitoring. |
| Prime-Line | 1 | Facelift | Six airbags, Smart City Brake Support, lane-departure warning, LED headlights. |
| Center-Line | 2 | Facelift | 15-inch alloy wheels, MZD Connect 7-inch touchscreen, cruise control, rear parking sensors. |
| Exclusive-Line | 3 | Facelift | 16-inch alloy wheels, automatic climate control, head-up display, heated seats and steering wheel. |
| Homura | 3 | Facelift | Black 16-inch alloy wheels, red accents, reversing camera, keyless entry. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | S5-DPTS | Oil level rises from diesel dilution during DPF regenerations on short trips — check the dipstick often, change oil early. | moderate | NULL |
| engine | S5-DPTS | DPF and EGR clogging in city-only use. | moderate | NULL |
| engine | P5-VPS@55kW | Carbon build-up on intake valves (direct injection) on low-revving city cars. | minor | NULL |
| engine | P5-VPS@66kW | Carbon build-up on intake valves (direct injection) on low-revving city cars. | minor | NULL |
| vehicle | Pre-facelift | Thin paint and stone chips on the bonnet and front edge; early surface rust where chipped. | minor | body_rust |
| vehicle | Pre-facelift | Rear suspension (torsion beam) bush and front strut top-mount knock. | minor | suspension |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | P5-VPS@55kW | Mazda Skyactiv-MT 5-speed (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | P5-VPS@66kW | Mazda Skyactiv-MT 5-speed (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | P5-VPS@66kW | Mazda Skyactiv-Drive 6AT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | P5-VPR@85kW | Mazda Skyactiv-MT 6-speed (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | S5-DPTS@77kW | Mazda Skyactiv-MT 6-speed (code TBD) | FWD | Hatchback 5-door | 3.4 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | P5-VPS@55kW | Mazda Skyactiv-MT 5-speed (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
