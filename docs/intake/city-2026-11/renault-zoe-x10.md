# Intake — Renault Zoe Phase 2 (X10, Z.E. 50)

> **Reconcile (live, 2026-11-05):** brand `Renault` NOT live. Engines NEW (EV powertrains — same code
> convention as the i3 doc: motor name as code, R110 / R135, unique by power here since Phase 2 has
> one battery). Gearbox REUSES `generic:Single-speed EV`. FWD. Needs migration `20261105150000`.
> Only Phase 2 was asked for → one phase (`Phase 2`); Phase 1 (2012–2019, 22 / 41 kWh) is not in
> this doc. **Battery cooling `active_air`** — the Zoe pack is heated / cooled by air from the cabin HVAC
> (a better test of the vocabulary than a liquid-cooled EV). Battery rental (BaaS) cars exist: the
> battery may not be owned by the car's owner — a con to flag at sale, not a column.
> Front-passenger ISOFIX: **verify** (left false). Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Renault |
| brand_country | France |
| model | Zoe |
| segment | B |
| origin_country | french |

## B. PHASES

### Phase 2
| field | value |
|---|---|
| generation_code | X10 |
| phase_label | Phase 2 |
| year_from | 2019 |
| year_to | 2024 |
| display_name | Zoe (X10) Phase 2 Z.E. 50 |
| platform_code | Renault-Nissan B (Zoe) |
| safety_rating | 0 |
| ncap_year | 2021 |
| ncap_adult_pct | 43 |
| ncap_child_pct | 52 |
| ncap_pedestrian_pct | 41 |
| ncap_safety_assist_pct | 14 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | depreciates_fast |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

*(**BLOCKER — live `catalog_phases_safety_rating_check` is `1..5`, so `safety_rating = 0` is rejected by the database.** A real 0★ result needs that CHECK widened to `0..5` (a reviewed migration) — storing NULL instead would read as "not tested", which is wrong. Euro NCAP 2021: **0 stars**, 43 / 52 / 41 / 14 — the facelift swapped the head-and-thorax side airbag for a thorax-only one. A real 0, not "unrated" — checks that the app shows 0★ rather than treating it as missing.)*

## C. BODIES × PHASE

### Phase 2
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Phase 2 | Hatchback 5-door | 4087 | 1787 | 1562 | NULL | NULL | 338 | 1225 | 5 | NULL | NULL | NULL | 2 | false |

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R110 | 80 | electric | NULL | R110 Z.E. 50, 80kW | NULL | NULL | 225 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 52 | 22 | 50 | active_air | yes |
| R135 | 100 | electric | NULL | R135 Z.E. 50, 100kW | NULL | NULL | 245 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 52 | 22 | 50 | active_air | yes |

*(DC 50 kW CCS was an option on R110, standard on R135 — the column holds the capability, not whether a given car has the socket.)*

## E. GEARBOXES
| unit_code |
|---|
| generic:Single-speed EV |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Phase 2 (2019 – 2024):**
- Phase 2: R110 80kW + generic:Single-speed EV + FWD → [Hatchback 5-door]
- Phase 2: R135 100kW + generic:Single-speed EV + FWD → [Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Life | 1 | Phase 2 | Front and side airbags, passenger airbag off switch, ISOFIX on the rear outer seats, 22 kW AC charging, heat pump, 7-inch touchscreen. |
| Zen | 2 | Phase 2 | 16-inch alloy wheels, automatic climate control, rear parking sensors, 10-inch digital cluster. |
| Intens | 3 | Phase 2 | 9.3-inch Easy Link portrait screen with navigation, reversing camera, 50 kW CCS on R135, B-mode one-pedal driving. |
| R.S. Line / Iconic | 3 | Phase 2 | Sport-look interior, 16/17-inch alloy wheels, full LED headlights, wireless phone charging. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | R135 | Onboard "Chameleon" charger faults — AC charging stops or won't start on some wallboxes (earth / leakage sensitivity). | moderate | NULL |
| engine | R110 | Onboard "Chameleon" charger faults — AC charging stops or won't start on some wallboxes (earth / leakage sensitivity). | moderate | NULL |
| engine | R110 | 12 V battery drain — the car won't wake up although the traction battery is full. | minor | NULL |
| vehicle | Phase 2 | Heat-pump / AC refrigerant leaks; heating falls back to the weaker resistive heater. | minor | climate |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_wltp_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_wltp_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Phase 2 | R110@80kW | generic:Single-speed EV | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 395 |
| Phase 2 | R135@100kW | generic:Single-speed EV | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 386 |
