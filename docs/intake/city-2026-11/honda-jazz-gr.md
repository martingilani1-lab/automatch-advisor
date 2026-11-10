# Intake — Honda Jazz IV (GR, e:HEV)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Reconcile (live, 2026-11-05):** brand `Honda` NOT live. Engines NEW. Gearbox REUSES the live
> `Honda e:HEV eCVT` (family `cvt`). Note for Martin: e:HEV isn't a belt CVT or a power-split —
> it's series drive plus a single fixed-ratio lock-up clutch. `cvt` gives it the belt-CVT reputation it
> doesn't deserve, so re-family it (likely `single_speed`, or a new value) — a decision, not part of
> this import. Crosstar is the **first real use of the `Hatchback Cross` body** (raised, cladded,
> roof rails). Hybrid `power_kw` = SYSTEM output (same convention question as the Yaris IV doc).
> Engine code `LEB` **unverified**. FL (2023) e:HEV 90 kW engine row: same code at a new system power.
> Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Honda |
| brand_country | Japan |
| model | Jazz |
| segment | B |
| origin_country | japanese |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | GR |
| phase_label | Pre-facelift |
| year_from | 2020 |
| year_to | 2023 |
| display_name | Jazz IV (GR) Pre-facelift |
| platform_code | Honda Global Small Car |
| safety_rating | 5 |
| ncap_year | 2020 |
| ncap_adult_pct | 87 |
| ncap_child_pct | 83 |
| ncap_pedestrian_pct | 80 |
| ncap_safety_assist_pct | 76 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

### Facelift
| field | value |
|---|---|
| generation_code | GR |
| phase_label | Facelift |
| year_from | 2023 |
| year_to | NULL |
| display_name | Jazz IV (GR) Facelift |
| platform_code | Honda Global Small Car |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Honda Jazz GR Pre-facelift

*(Euro NCAP 2020 percentages from memory, matching Thatcham's press release headline — **verify** against the datasheet.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4044 | 1694 | 1526 | NULL | NULL | 304 | 1205 | 5 | NULL | NULL | 40 | 2 | false |
| Pre-facelift | Hatchback Cross | 4090 | 1725 | 1556 | NULL | NULL | 298 | 1203 | 5 | NULL | NULL | 40 | 2 | false |

### Facelift
INHERIT dimensions FROM Honda Jazz GR Pre-facelift / Hatchback 5-door
INHERIT dimensions FROM Honda Jazz GR Pre-facelift / Hatchback Cross

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LEB | 80 | petrol | HEV | 1.5 i-MMD e:HEV (engine 72kW / system 80kW) | NULL | 1498 | 131 | L4 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| LEB | 90 | petrol | HEV | 1.5 e:HEV (system 90kW) | NULL | 1498 | NULL | L4 | Euro6e | chain | NULL | NULL | false | NULL | false | port |

## E. GEARBOXES
| unit_code |
|---|
| Honda e:HEV eCVT |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2020 – 2023):**
- Pre-facelift: LEB 80kW + Honda e:HEV eCVT + FWD → [Hatchback 5-door, Hatchback Cross]

**Facelift (2023 – ):**
- Facelift: LEB 90kW + Honda e:HEV eCVT + FWD → [Hatchback 5-door, Hatchback Cross]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Comfort | 1 | Pre-facelift | Ten airbags including front centre and rear-seat knee airbags, Honda Sensing (collision mitigation braking, lane keeping, traffic-sign recognition), passenger airbag off switch, ISOFIX on the rear outer seats, Magic Seats (fold-up rear cushions). |
| Elegance | 2 | Pre-facelift, Facelift | 16-inch alloy wheels, 9-inch Honda Connect touchscreen, automatic climate control, rear parking camera, heated front seats. |
| Executive | 3 | Pre-facelift | Blind-spot information, LED headlights with auto high beam, smart entry, heated steering wheel. |
| Crosstar | 3 | Pre-facelift, Facelift | Raised ride height, wheel-arch cladding, roof rails, water-repellent upholstery, 16-inch alloy wheels. |
| Advance Sport | 3 | Facelift | Sport body kit, 16-inch black alloy wheels, sport seats with yellow stitching. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | LEB@80kW | 12 V auxiliary battery drain after long standing (car won't start the hybrid system). | minor | NULL |
| engine | LEB@90kW | 12 V auxiliary battery drain after long standing (car won't start the hybrid system). | minor | NULL |
| vehicle | Pre-facelift | Infotainment freezes and Apple CarPlay / Android Auto drop-outs on early software. | minor | electrical |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | LEB@80kW | Honda e:HEV eCVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | LEB@80kW | Honda e:HEV eCVT | FWD | Hatchback Cross | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | LEB@90kW | Honda e:HEV eCVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | LEB@90kW | Honda e:HEV eCVT | FWD | Hatchback Cross | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
