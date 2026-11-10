# Intake — Toyota Yaris IV (XP210)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Reconcile (live, 2026-11-05):** brand `Toyota` NOT live (shared with the Yaris II doc). Engines NEW
> (`1KR-FE@53` is a different power from the Yaris II's `1KR-FE@51`). Hybrid gearbox REUSES the live
> `Toyota Hybrid Synergy eCVT` — after `20261105150000` it should move from family `cvt` to
> `power_split` (a separate one-row UPDATE for Martin, not part of this import). The 1.0 5MT, the 1.5
> 6MT and the 1.5 CVT are not live → `(code TBD)` placeholders STOP.
> **Hybrid power convention:** `power_kw` = SYSTEM output (85 / 96 kW), engine output in `display_name`.
> The live PHEV `DGEA` uses engine output, but here engine output can't be the key: the 2024 Hybrid 130
> keeps the same 68 kW M15A-FXE with a stronger motor, so engine power would collide. Martin to
> confirm the convention. HEV traction battery (~0.7–0.8 kWh) left NULL — `battery_capacity_net_kwh`
> is meant for plug-in / EV buyers. GR Yaris (3-door, G16E, AWD) is a separate homologation, not in
> this doc. Prices / mileage NULL for Martin.

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
| generation_code | XP210 |
| phase_label | Pre-facelift |
| year_from | 2020 |
| year_to | 2024 |
| display_name | Yaris IV (XP210) Pre-facelift |
| platform_code | TNGA-B (GA-B) |
| safety_rating | 5 |
| ncap_year | 2020 |
| ncap_adult_pct | 86 |
| ncap_child_pct | 81 |
| ncap_pedestrian_pct | 78 |
| ncap_safety_assist_pct | 85 |
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
| generation_code | XP210 |
| phase_label | Facelift |
| year_from | 2024 |
| year_to | NULL |
| display_name | Yaris IV (XP210) Facelift |
| platform_code | TNGA-B (GA-B) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Toyota Yaris XP210 Pre-facelift

*(Euro NCAP 2020 datasheet: 86 / 81 / 78 / 85; the rating covers every Yaris variant. Passenger airbag can be switched off.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 3940 | 1745 | 1500 | NULL | NULL | 286 | NULL | 5 | NULL | NULL | 36 | 2 | false |

### Facelift
INHERIT dimensions FROM Toyota Yaris XP210 Pre-facelift / Hatchback 5-door

*(Boot and tank are the hybrid's figures (36 l tank); the petrol-only versions have a 40 l tank — a per-powertrain difference the body table can't hold.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1KR-FE | 53 | petrol | NULL | 1.0 VVT-i 53kW | NULL | 998 | 93 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| M15A-FKS | 92 | petrol | NULL | 1.5 Dynamic Force 92kW | NULL | 1490 | 153 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | dual |
| M15A-FXE | 85 | petrol | HEV | 1.5 Hybrid 116 (engine 68kW / system 85kW) | NULL | 1490 | 120 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| M15A-FXE | 96 | petrol | HEV | 1.5 Hybrid 130 (engine 68kW / system 96kW) | NULL | 1490 | 120 | L3 | Euro6e | chain | NULL | NULL | false | NULL | false | port |

## E. GEARBOXES
| unit_code |
|---|
| Toyota Hybrid Synergy eCVT |
| Toyota 1.0 5MT (code TBD) |
| Toyota 1.5 6MT (code TBD) |
| Toyota 1.5 CVT (code TBD) |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2020 – 2024):**
- Pre-facelift: 1KR-FE 53kW + Toyota 1.0 5MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: M15A-FKS 92kW + Toyota 1.5 6MT (code TBD) / Toyota 1.5 CVT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: M15A-FXE 85kW + Toyota Hybrid Synergy eCVT + FWD → [Hatchback 5-door]

**Facelift (2024 – ):**
- Facelift: M15A-FXE 85kW + Toyota Hybrid Synergy eCVT + FWD → [Hatchback 5-door]
- Facelift: M15A-FXE 96kW + Toyota Hybrid Synergy eCVT + FWD → [Hatchback 5-door]

*(AWD-i is a Yaris Cross option, not offered on the hatchback — FWD only.)*

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Active | 1 | Pre-facelift, Facelift | Front centre airbag, Toyota Safety Sense (pre-collision with pedestrian / cyclist detection, lane trace assist, road-sign assist), passenger airbag off switch, ISOFIX on the rear outer seats, LED headlights. |
| Comfort | 2 | Pre-facelift, Facelift | 15-inch alloy wheels, 8-inch touchscreen, reversing camera, automatic air conditioning, adaptive cruise control. |
| Executive | 3 | Pre-facelift, Facelift | 16/17-inch alloy wheels, 10-inch head-up display, smart entry, heated front seats and steering wheel, blind-spot monitor. |
| GR Sport | 3 | Facelift | GR-tuned suspension, 18-inch alloy wheels, sport seats, GR styling kit. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | M15A-FXE@85kW | 12 V auxiliary battery drains after long standing — the car will not enter READY mode. | minor | NULL |
| engine | M15A-FXE@96kW | 12 V auxiliary battery drains after long standing — the car will not enter READY mode. | minor | NULL |
| engine | M15A-FXE@85kW | Hybrid system cooling-fan intake (under the rear seat) clogs with dust / pet hair, overheating the traction battery. | moderate | NULL |
| engine | M15A-FXE@96kW | Hybrid system cooling-fan intake (under the rear seat) clogs with dust / pet hair, overheating the traction battery. | moderate | NULL |
| vehicle | Pre-facelift | Rear-door and tailgate rattles; thin sound insulation. | minor | interior |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | 1KR-FE@53kW | Toyota 1.0 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | M15A-FKS@92kW | Toyota 1.5 6MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | M15A-FKS@92kW | Toyota 1.5 CVT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | M15A-FXE@85kW | Toyota Hybrid Synergy eCVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | M15A-FXE@85kW | Toyota Hybrid Synergy eCVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | M15A-FXE@96kW | Toyota Hybrid Synergy eCVT | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
