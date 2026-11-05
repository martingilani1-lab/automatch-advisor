# Intake — Hyundai i20 III (BC3)

> **Reconcile (live, 2026-11-05):** brand `Hyundai` NOT live (shared with the i10 doc). Engines NEW.
> No Hyundai manual / iMT / DCT gearbox in `transmission_units` → STOP. `Hyundai D7GF1` (7-speed dry
> DCT) is the known Hyundai-Kia small-car DCT code; the 5MT / 6-speed iMT / i20 N 6MT codes are
> placeholders. Engine codes **unverified**: G4LH (1.2 MPI), G3LE (1.0 T-GDi Smartstream), G4FP (1.6
> T-GDi, i20 N) — confirm before import. The 74 kW T-GDi existed both with and without 48 V MHEV; only
> the plain one is listed (key can't hold both — the MHEV 74 kW needs its own code). GPF on the Euro 6d
> T-GDi engines — **verify**. Euro NCAP 2021 percentages from the official datasheet; stars stated as 4
> (76/82/76/67) — **verify**. Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Hyundai |
| brand_country | South Korea |
| model | i20 |
| segment | B |
| origin_country | korean |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | BC3 |
| phase_label | Pre-facelift |
| year_from | 2020 |
| year_to | 2023 |
| display_name | i20 III (BC3) Pre-facelift |
| platform_code | Hyundai-Kia K2 |
| safety_rating | 4 |
| ncap_year | 2021 |
| ncap_adult_pct | 76 |
| ncap_child_pct | 82 |
| ncap_pedestrian_pct | 76 |
| ncap_safety_assist_pct | 67 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

### Facelift
| field | value |
|---|---|
| generation_code | BC3 |
| phase_label | Facelift |
| year_from | 2023 |
| year_to | NULL |
| display_name | i20 III (BC3) Facelift |
| platform_code | Hyundai-Kia K2 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Hyundai i20 BC3 Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4040 | 1775 | 1450 | NULL | NULL | 352 | 1165 | 5 | NULL | NULL | 40 | 2 | false |

### Facelift
INHERIT dimensions FROM Hyundai i20 BC3 Pre-facelift / Hatchback 5-door

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G4LH | 62 | petrol | NULL | 1.2 MPI 62kW | NULL | 1197 | 118 | L4 | Euro6d | chain | NULL | NULL | false | false | false | port |
| G3LE | 74 | petrol | NULL | 1.0 T-GDi 74kW | NULL | 998 | 172 | L3 | Euro6d | chain | NULL | NULL | false | true | false | direct |
| G3LE | 88 | petrol | MHEV | 1.0 T-GDi 48V 88kW | NULL | 998 | 200 | L3 | Euro6d | chain | NULL | NULL | false | true | false | direct |
| G4FP | 150 | petrol | NULL | 1.6 T-GDi i20 N 150kW | NULL | 1598 | 275 | L4 | Euro6d | chain | NULL | NULL | false | true | false | direct |

## E. GEARBOXES
| unit_code |
|---|
| Hyundai 5MT (code TBD) |
| Hyundai 6iMT (code TBD) |
| Hyundai D7GF1 |
| Hyundai N 6MT (code TBD) |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2020 – 2023):**
- Pre-facelift: G4LH 62kW + Hyundai 5MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: G3LE 74kW + Hyundai 6iMT (code TBD) / Hyundai D7GF1 + FWD → [Hatchback 5-door]
- Pre-facelift: G3LE 88kW + Hyundai 6iMT (code TBD) / Hyundai D7GF1 + FWD → [Hatchback 5-door]
- Pre-facelift: G4FP 150kW + Hyundai N 6MT (code TBD) + FWD → [Hatchback 5-door]

**Facelift (2023 – ):**
INHERIT configs FROM Hyundai i20 BC3 Pre-facelift EXCEPT no G4FP

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Smart | 1 | Pre-facelift, Facelift | Seven airbags including a front centre airbag, forward collision-avoidance assist, lane keeping assist, passenger airbag off switch, ISOFIX on the rear outer seats, manual air conditioning. |
| Comfort | 2 | Pre-facelift, Facelift | 16-inch alloy wheels, 8-inch touchscreen, rear-view camera, cruise control, heated front seats. |
| Style | 3 | Pre-facelift, Facelift | 10.25-inch digital cluster, automatic climate control, LED headlights, wireless phone charging, keyless entry. |
| N Line | 3 | Pre-facelift, Facelift | N Line bumpers and 17-inch alloys, sport seats, metal pedals, twin-tip exhaust. |
| N | 4 | Pre-facelift | 1.6 T-GDi 150kW, 6-speed manual with rev matching, mechanical limited-slip differential (N Corner Carving Differential), 18-inch alloy wheels, N bucket seats. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| gearbox | Hyundai D7GF1 | Dry-clutch DCT: judder when pulling away and clutch wear in stop-and-go traffic; software updates issued. | moderate | NULL |
| engine | G3LE@88kW | 48 V MHEV starter-generator / battery warnings on some cars (software-related). | minor | NULL |
| engine | G4FP | Oil dilution with fuel under repeated short trips (direct injection, turbo). | minor | NULL |

## J. CONFIG FACTS
*(Omitted: no per-configuration WLTP figure confirmed from a source here — fill from the price list.)*
