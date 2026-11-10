# Intake — Kia Picanto II (TA)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Reconcile (live, 2026-11-05):** brand `Kia` NOT live (reference migration first). Engines NEW,
> except `G3LA@49` which the i10 (IA) doc also declares (same engine: whichever imports first creates
> it). Gearboxes `Hyundai M5EF2` (**unverified** code) / `Hyundai A4CF0` — shared Hyundai-Kia units,
> same reference rows as the i10. The 1.0 LPG bi-fuel version (some EU markets) is left out until
> confirmed for SK/CZ — add it with `secondary_fuel_type` in section J if it was sold.
> Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Kia |
| brand_country | South Korea |
| model | Picanto |
| segment | A |
| origin_country | korean |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | TA |
| phase_label | Pre-facelift |
| year_from | 2011 |
| year_to | 2015 |
| display_name | Picanto II (TA) Pre-facelift |
| platform_code | Hyundai-Kia A (IA/TA) |
| safety_rating | 4 |
| ncap_year | 2011 |
| ncap_adult_pct | 86 |
| ncap_child_pct | 83 |
| ncap_pedestrian_pct | 47 |
| ncap_safety_assist_pct | 43 |
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
| generation_code | TA |
| phase_label | Facelift |
| year_from | 2015 |
| year_to | 2017 |
| display_name | Picanto II (TA) Facelift |
| platform_code | Hyundai-Kia A (IA/TA) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

INHERIT phase attributes FROM Kia Picanto TA Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 3-door | 3595 | 1595 | 1480 | NULL | NULL | 200 | 870 | 4 | NULL | NULL | 35 | 2 | false |
| Pre-facelift | Hatchback 5-door | 3595 | 1595 | 1480 | NULL | NULL | 200 | 870 | 4 | NULL | NULL | 35 | 2 | false |

### Facelift
INHERIT dimensions FROM Kia Picanto TA Pre-facelift / Hatchback 3-door
INHERIT dimensions FROM Kia Picanto TA Pre-facelift / Hatchback 5-door

*(Seats: the TA Picanto is homologated for 4 in most EU markets — **verify** for SK/CZ, some trims list 5.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G3LA | 51 | petrol | NULL | 1.0 MPI 51kW | NULL | 998 | 94 | L3 | Euro5 | chain | NULL | NULL | false | false | false | port |
| G3LA | 49 | petrol | NULL | 1.0 MPI 49kW | NULL | 998 | 95 | L3 | NULL | chain | NULL | NULL | false | false | false | port |
| G4LA | 63 | petrol | NULL | 1.25 MPI 63kW | NULL | 1248 | 121 | L4 | NULL | chain | NULL | NULL | false | false | false | port |

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

**Pre-facelift (2011 – 2015):**
- Pre-facelift: G3LA 51kW + Hyundai M5EF2 + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: G4LA 63kW + Hyundai M5EF2 / Hyundai A4CF0 + FWD → [Hatchback 3-door, Hatchback 5-door]

**Facelift (2015 – 2017):**
- Facelift: G3LA 49kW + Hyundai M5EF2 + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: G4LA 63kW + Hyundai M5EF2 / Hyundai A4CF0 + FWD → [Hatchback 3-door, Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| LX | 1 | Pre-facelift, Facelift | Six airbags, ESC, passenger airbag off switch, ISOFIX on the rear outer seats, electric front windows. |
| EX | 2 | Pre-facelift, Facelift | Manual air conditioning, radio with USB/AUX, steering-wheel audio controls, electric heated mirrors. |
| Spin | 3 | Pre-facelift, Facelift | 14-inch alloy wheels, heated front seats and steering wheel, Bluetooth, LED daytime running lights. |
| Platinum | 4 | Pre-facelift, Facelift | 15-inch alloy wheels, automatic climate control, smart key with push-button start, projector headlights. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | G3LA@51kW | Rough idle / vibration from worn engine mounts on the 3-cylinder. | minor | NULL |
| engine | G4LA | Timing chain rattle at cold start on high-mileage engines. | minor | NULL |
| vehicle | Pre-facelift | Steering column flexible coupling (electric power steering) knocks over bumps. | moderate | steering |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | G3LA@51kW | Hyundai M5EF2 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G3LA@51kW | Hyundai M5EF2 | FWD | Hatchback 5-door | 4.2 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 99 | NULL |
| Pre-facelift | G4LA@63kW | Hyundai M5EF2 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G4LA@63kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G4LA@63kW | Hyundai A4CF0 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G4LA@63kW | Hyundai A4CF0 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G3LA@49kW | Hyundai M5EF2 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G3LA@49kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@63kW | Hyundai M5EF2 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@63kW | Hyundai M5EF2 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@63kW | Hyundai A4CF0 | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G4LA@63kW | Hyundai A4CF0 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
