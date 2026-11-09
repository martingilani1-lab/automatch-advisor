# Intake — Hyundai i10 II (IA)

> **Reconcile (live, 2026-11-05):** brand `Hyundai` NOT live (reference migration first). Both
> engines NEW. Gearboxes: no Hyundai 5MT / 4AT in `transmission_units` — `Hyundai A4CF0` (4AT) is
> the known Hyundai-Kia code; the 5-speed manual code `M5EF2` is **unverified**. Both STOP until the
> reference rows exist. `G3LA@49` / `G4LA@64` are shared with the Picanto (TA) doc — whichever is
> imported first creates them, the second then resolves them as REUSE automatically.
> Emission standard left NULL on purpose: the same code/power ran Euro 5 (2013–15) and Euro 6
> (2015–19) and the key (code, power_kw) can't hold both. Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Hyundai |
| brand_country | South Korea |
| model | i10 |
| segment | A |
| origin_country | korean |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | IA |
| phase_label | Pre-facelift |
| year_from | 2013 |
| year_to | 2016 |
| display_name | i10 II (IA) Pre-facelift |
| platform_code | Hyundai-Kia A (IA/TA) |
| safety_rating | 4 |
| ncap_year | 2014 |
| ncap_adult_pct | 79 |
| ncap_child_pct | 80 |
| ncap_pedestrian_pct | 71 |
| ncap_safety_assist_pct | 56 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

### Facelift
| field | value |
|---|---|
| generation_code | IA |
| phase_label | Facelift |
| year_from | 2016 |
| year_to | 2019 |
| display_name | i10 II (IA) Facelift |
| platform_code | Hyundai-Kia A (IA/TA) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

INHERIT phase attributes FROM Hyundai i10 IA Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 3665 | 1660 | 1500 | NULL | NULL | 252 | 1046 | 5 | NULL | NULL | 40 | 2 | false |

### Facelift
INHERIT dimensions FROM Hyundai i10 IA Pre-facelift / Hatchback 5-door

*(Euro NCAP 2014 report: ISOFIX on the rear outboard seats; passenger airbag has a manual off switch.)*

## D. ENGINES
*(Kappa family — chain-driven, port injection.)*

| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G3LA | 49 | petrol | NULL | 1.0 MPI 49kW | NULL | 998 | 95 | L3 | NULL | chain | NULL | NULL | false | false | false | port |
| G4LA | 64 | petrol | NULL | 1.2 MPI 64kW | NULL | 1248 | 121 | L4 | NULL | chain | NULL | NULL | false | false | false | port |

## E. GEARBOXES
| unit_code |
|---|
| Hyundai M5EF2 |
| Hyundai A4CF0 |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2013 – 2016):**
- Pre-facelift: G3LA 49kW + Hyundai M5EF2 + FWD → [Hatchback 5-door]
- Pre-facelift: G4LA 64kW + Hyundai M5EF2 / Hyundai A4CF0 + FWD → [Hatchback 5-door]

**Facelift (2016 – 2019):**
INHERIT configs FROM Hyundai i10 IA Pre-facelift

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Life | 1 | Pre-facelift, Facelift | Six airbags, ESC with hill-start assist, passenger airbag off switch, ISOFIX on the rear outer seats, electric front windows. |
| Comfort | 2 | Pre-facelift, Facelift | Manual air conditioning, radio with USB/AUX and Bluetooth, steering-wheel audio controls, electric heated mirrors. |
| Style | 3 | Pre-facelift, Facelift | 14-inch alloy wheels, heated front seats and steering wheel, LED daytime running lights, cruise control. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | G3LA | Rough idle / vibration from worn engine mounts on the 3-cylinder. | minor | NULL |
| engine | G4LA | Timing chain rattle at cold start on high-mileage engines. | minor | NULL |
| gearbox | Hyundai A4CF0 | Old 4-speed design: high fuel use and slow shifts; fluid overheating in heavy traffic if never changed. | minor | NULL |
| vehicle | Pre-facelift | Steering column flexible coupling (electric power steering) knocks over bumps. | moderate | steering |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | G3LA@49kW | Hyundai M5EF2 | FWD | Hatchback 5-door | 4.7 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 108 | NULL |
| Pre-facelift | G4LA@64kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G4LA@64kW | Hyundai A4CF0 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G3LA@49kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@64kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@64kW | Hyundai A4CF0 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
