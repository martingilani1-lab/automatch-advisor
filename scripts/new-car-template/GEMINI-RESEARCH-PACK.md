<!--
  GEMINI RESEARCH PACK — v2 (2026-11-10). The one document Gemini fills for a new car: every value
  the database and the website need, nothing left for "later passes".

  HOW TO USE
    1. Copy everything from "PART 1" to the end of this file.
    2. Replace <CAR> and <PHASE> in PART 1 (Claude can do this for you: "Gemini prompt for X").
    3. Paste into a NEW Gemini chat with Deep Research on. One car, ONE phase per chat.
    4. Paste Gemini's answer to Claude Code unchanged. Claude checks every quote against its
       source, maps gearbox / drivetrain names to the database, applies the rule-based tags,
       and writes the seed file for your review. Gemini's text never goes straight to Supabase.

  NOT in this document, on purpose:
    - Rule-based tags (city_commuter, winter_ready, green_zone, family_ideal, stroller_friendly,
      ultra_efficient, hot_hatch, sleeper, roadtrip_camper, highway_cruiser, representative,
      head_turner, cargo_van, seven_seater, bulletproof_reliability) — Claude computes them from
      the data after seeding, the same rules as every other car.
    - Photos — licensing; separate media step.
    - Database codes for gearboxes / drivetrains — Gemini reports what it finds, Claude maps.
-->

# PART 1 — INSTRUCTIONS

You are filling a vehicle intake document for a used-car advice website for the Slovak and Czech
market. Buyers make purchase decisions on this data. **A wrong value is worse than a missing one.**

- **Car:** <CAR>  (e.g. "BMW i3 (I01)")
- **Phase:** <PHASE>  (e.g. "Facelift (LCI), 2017–2022")
- **Market:** EU versions as sold in Slovakia / Czech Republic.

## Hard rules — breaking one makes the whole document unusable

1. **Unknown → `NULL`.** Never estimate, average, round, or carry a value over from another model,
   phase, engine, body, market or model year.
2. **Does not apply → `N/A`** (oil capacity of an EV, AdBlue on a petrol engine, NCAP % before 2009).
3. **Every filled value has evidence.** Each table row has an `evidence` cell with refs (`E1`, `E1, E4`)
   to section Q, where each ref is a URL plus a verbatim quote (max ~25 words) that contains the
   value. No quote → `NULL`.
4. **No conversions.** No PS→kW, mph→km/h, NEDC↔WLTP, DIN↔EU weight, gross↔net battery. If the source
   uses a different standard than the STANDARDS table, write `NULL` and put the figure in section R.
5. **Source priority.** (1) Manufacturer price lists / technical data / press kits for that model
   year; (2) Euro NCAP datasheet for safety; (3) spec databases (auto-data.net, ultimatespecs.com,
   cars-data.com) only for values the manufacturer doesn't publish — pages of one database are ONE
   source; (4) owner forums, ADAC / TÜV reports, recall databases for faults and reliability;
   (5) SK / CZ classified sites for market data (section B2 only).
6. **Sources disagree → `NULL`** and both go in section R — unless one is the manufacturer: use it,
   still list the other.
7. **Codes are never guessed** (engine, gearbox, platform). Only when a source names the code;
   otherwise `NULL` and describe the unit in words.
8. **Closed vocabularies.** Fields listed in section P accept only the listed values, exactly
   spelled. Nothing fits → `NULL` + section R.
9. **Only factory configurations** sold in the EU (section G). No "probably also available".
10. **Variants matter.** A value that differs by wheel size, battery, body or model year belongs on
    the matching row only.
11. **Format is fixed.** Same section letters, same headers, same column order, markdown tables only,
    every cell filled (`NULL` / `N/A` when empty). No prose outside the sections.
12. **Section R is mandatory and honest:** every value you looked for and didn't find, every doubt.
    A long section R is a good result.

## Research order (each step narrows the next)

1. B — phase years, platform, Euro NCAP (euroncap.com datasheet for this model and test year).
2. G — engine × gearbox × drivetrain × body combinations actually offered (manufacturer price lists
   from the phase's years).
3. D — every engine in G; then D2 (service and reliability) for each.
4. E / F — every gearbox and AWD system in G, with service and reliability.
5. C — dimensions per body.
6. J — per configuration facts.
7. H — trims and every standard feature; options separately.
8. I — known faults, with symptom and affected years.
9. B2 — market data from current SK / CZ listings.
10. O — judgement tags (only those listed, only with a reason).

## Market data method (section B2)

Search current listings for this exact generation + phase on autobazar.sk, autobazar.eu, sauto.cz,
bazos.sk / bazos.cz, mobile.de (EU reference). Exclude damaged / export / parts cars and obvious
outliers (lowest and highest ~10 %).
- `price_range_min_eur` / `price_range_max_eur` = cheapest / most expensive normal listing after the cut.
- `avg_market_price_eur` = median of those listings.
- `typical_mileage_min_km` / `typical_mileage_max_km` = mileage range of those listings.
- Record in `market_sample`: date checked, number of listings, sites used.
- Fewer than 10 listings → all market fields `NULL`, explain in R.
- `resale_value_rating`: `holds_well` = clearly above segment average for its age, `depreciates_fast`
  = clearly below (EVs with small batteries, luxury cars), else `average`. Give the reason in evidence.

## Reliability rating rubric (D2, E, F) — whole numbers 1–5

| rating | meaning |
|---|---|
| 5 | No known critical fault; commonly reaches 300 000 km with normal servicing |
| 4 | Known moderate / minor issues only, cheap or preventable |
| 3 | A known moderate issue most owners will meet, or a critical one limited to some years |
| 2 | A known critical fault that is common (e.g. timing-chain stretch, mechatronic failure) |
| 1 | Widespread critical failures; avoid |

The rating must follow from the faults you list in section I — a 2 with no critical fault listed
is inconsistent. Explain each rating in one line in `rating_reason`.

---

# PART 2 — DOCUMENT TO FILL

## STANDARDS — every value must match this definition

| field | definition | source gives something else → |
|---|---|---|
| curb_weight_kg | EU mass in running order (75 kg driver + 90 % fuel) | DIN / dry → `NULL`, note in R |
| boot_capacity_liters | VDA, rear seats up, to parcel shelf | "to roof" → `NULL` |
| boot_max_liters | VDA, rear seats folded, to roof | |
| width_mm | without mirrors | |
| ground_clearance_mm | manufacturer, unladen | |
| power_kw | manufacturer kW. Hybrid: SYSTEM output | PS only → `NULL` |
| torque_nm | combustion engine, or electric motor for an EV | |
| battery_capacity_net_kwh | net / usable | gross only → `NULL`, gross in R |
| max_ac_charging_kw | highest on-board charger offered (option counts) | |
| max_dc_charging_kw | peak DC | |
| consumption / CO₂ / ev_range_km | all on the row's consumption_cycle (NEDC or WLTP) | other cycle → R |
| acceleration_0_100 | 0–100 km/h | 0–60 mph → `NULL` |
| towing_braked_kg | braked trailer, 12 % gradient | |
| safety_rating | Euro NCAP stars 0–5 (0 = tested and failed, `NULL` = never tested) | |
| ncap_*_pct | tests from 2009 on; earlier tests → `N/A` | |
| service costs (EUR) | independent garage in SK / CZ, parts + labour, current | main-dealer price → R |

## A. CAR
| field | value | evidence |
|---|---|---|
| brand | | |
| model | | |
| segment | | |
| origin_country | | |

## B. PHASE
| field | value | evidence |
|---|---|---|
| generation_code | | |
| phase_label | | |
| year_from | | |
| year_to | | |
| platform_code | | |
| chassis_type | | |
| consumption_cycle | | |
| safety_rating | | |
| ncap_year | | |
| ncap_adult_pct | | |
| ncap_child_pct | | |
| ncap_pedestrian_pct | | |
| ncap_safety_assist_pct | | |
| towing_capacity_kg | | |

## B2. MARKET DATA (SK / CZ)
| field | value | evidence |
|---|---|---|
| price_range_min_eur | | |
| avg_market_price_eur | | |
| price_range_max_eur | | |
| typical_mileage_min_km | | |
| typical_mileage_max_km | | |
| resale_value_rating | | |
| market_sample | (date, n listings, sites) | |

## C. BODIES
| body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | boot_sill_height_mm | seats_count | seats_optional_max | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger | roof_load_kg | nose_weight_kg | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | |

*(curb_weight_kg here = lightest version of that body. `isofix_count` = all ISOFIX positions including the front passenger seat.)*

## D. ENGINES — specification
| code | power_kw | fuel_type | hybrid_type | display_name | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | injection_type | engine_oil_capacity_liters | has_dpf | has_gpf | has_adblue | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | | |

*(One row per engine × power. Diesel: has_dpf / has_adblue always true or false. Petrol: has_dpf and has_adblue = false. EV: one row per motor × battery variant; combustion columns `N/A`.)*

## D2. ENGINES — service, reliability, pros / cons
| engine (code@kW) | reliability_rating | rating_reason | oil_change_interval_km | oil_change_interval_months | oil_spec | oil_service_cost_eur_min | oil_service_cost_eur_max | air_filter_interval_km | fuel_filter_interval_km | spark_plug_interval_km | spark_plug_cost_eur_min | spark_plug_cost_eur_max | timing_replacement_km | timing_replacement_years | timing_service_cost_eur_min | timing_service_cost_eur_max | yearly_maintenance_eur_min | yearly_maintenance_eur_max | maintenance_note | pros | cons | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | | | | |

*(pros / cons: 2–4 each, separated by " ; ". Engine only — never the gearbox, clutch or AWD system. EV: oil / plugs / timing `N/A`; maintenance_note covers brake fluid, cabin filter, coolant, 12 V battery.)*

## E. GEARBOXES
| gearbox_code | maker | type | speeds | used_with (engine code@kW) | reliability_rating | rating_reason | service_interval_km | service_interval_years | service_cost_eur_min | service_cost_eur_max | maintenance_note | pros | cons | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | |

*(gearbox_code only if a source names it (e.g. "DQ200", "Aisin TF-60SN"). Service = oil / fluid change.)*

## F. DRIVETRAIN
| drivetrain | system_name | maker | reliability_rating | rating_reason | service_interval_km | maintenance_note | evidence |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

*(FWD / RWD rows: only `drivetrain` filled, the rest `N/A`. AWD: the system's name, e.g. "Haldex gen 5", "xDrive".)*

## G. CONFIGURATIONS
| engine (code@kW) | gearbox | drivetrain | bodies | years_available | evidence |
|---|---|---|---|---|---|
| | | | | | |

## H. TRIMS
| trim | tier (1 = base) | evidence |
|---|---|---|
| | | |

## H2. TRIM FEATURES
| trim | feature | availability | feature_group | safety_feature_slug | evidence |
|---|---|---|---|---|---|
| | | | | | |

*(One row per feature per trim. availability = `standard` or `optional`. feature_group and safety_feature_slug from section P, `NULL` if none fits. Write each feature once, short ("Heated front seats", "LED headlights"). Infotainment: name the screen size and whether Apple CarPlay / Android Auto are standard, optional or not offered.)*

## I. FAULTS
| component | target (engine code@kW / gearbox / drivetrain / body) | fault + symptom | affected_years | severity | category | evidence |
|---|---|---|---|---|---|---|
| | | | | | | |

*(severity: critical = engine / gearbox / battery failure or safety risk; moderate = costly repair, car still drives; minor = annoyance, cheap fix. A fault is a concrete defect — never a comparison ("worse than X") and never a design trait ("harsh ride" → pros / cons). category only for component = vehicle. Engine faults never describe the gearbox or AWD system.)*

## J. CONFIGURATION FACTS
| engine (code@kW) | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | ev_range_km | co2_emissions_g_km | curb_weight_kg | acceleration_0_100 | top_speed_kmh | towing_braked_kg | towing_unbraked_kg | secondary_fuel_type | secondary_consumption_l100km | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | |

*(One row per configuration in G. A figure that differs by wheel size: smallest standard wheel, note in R. Bi-fuel (LPG / CNG) only: secondary_fuel_type + secondary_consumption_l100km.)*

## K. CAR-LEVEL PROS / CONS
| type | text | evidence |
|---|---|---|
| pro | | |
| con | | |

*(Body, space, ride, practicality, build — not engine. 3–5 each.)*

## O. JUDGEMENT TAGS (only these, only with a reason)
| tag | level | reason | evidence |
|---|---|---|---|
| | | | |

*(Allowed: `comfort_cruiser`, `drivers_choice`, `sport`, `value_choice`, `workhorse` (model or configuration), `true_offroad`, `heavy_tower` (configuration — give the engine code@kW), `value_retainer`, `isofix_3x` (model). Leave the table empty if none clearly applies.)*

## P. ALLOWED VALUES
| field | allowed values |
|---|---|
| segment | A, B, C, D, E, F, J, M, S |
| origin_country | german, czech, spanish, french, italian, japanese, korean, swedish, british, american, chinese, romanian |
| body_type | Cabriolet 2-door, Coupe 2-door, Estate, Estate Cross, Hatchback 3-door, Hatchback 5-door, Hatchback Cross, Liftback, MPV 5-door, Roadster 2-door, Sedan 4-door, SUV 5-door, SUV Coupe 5-door |
| chassis_type | monocoque, ladder_frame |
| consumption_cycle | NEDC, WLTP |
| resale_value_rating | holds_well, average, depreciates_fast |
| fuel_type | petrol, diesel, electric, lpg, cng |
| hybrid_type | MHEV, HEV, PHEV, NULL |
| cylinders | L2, L3, L4, L5, L6, V5, VR5, VR6, V6, V8, V10, V12, W12, B4, B6 |
| emission_standard | Euro1, Euro2, Euro3, Euro4, Euro5, Euro6, Euro6c, Euro6d, Euro6e |
| timing_type | belt, chain, gear |
| injection_type | port, direct, dual, common_rail, pump_injector, distributor_pump |
| battery_thermal_management | active_liquid, active_air, active_refrigerant, passive |
| heat_pump | standard, optional, none |
| has_dpf / has_gpf / has_adblue / isofix_front_passenger | true, false |
| gearbox type | manual, amt, torque_converter, cvt, power_split, dct_dry, dct_wet, single_speed |
| reliability_rating | 1, 2, 3, 4, 5 |
| severity | critical, moderate, minor |
| fault category (vehicle) | electrical, body_rust, suspension, steering, brakes, climate, interior |
| availability | standard, optional |
| feature_group | airbags, ambient_lighting, armrests, bumpers, climate, cruise, fog_lights, headlights, infotainment, instruments, interior_trim, light_rain_sensors, locking, mirrors, parking, rear_spoiler, roof_rails, seat_adjustment, seat_comfort, seats, sliding_doors, smartphone, sound, steering_wheel, suspension, wheels, windows |
| safety_feature_slug | abs, adaptive_cruise_control, adaptive_matrix_headlights, aeb, airbags, blind_spot_monitoring, camera_360, driver_drowsiness_attention_warning, emergency_lane_keeping, emergency_stop_signal, esc, event_data_recorder, head_up_display, isa, lane_centering, parking_assist, rear_cross_traffic_alert, reversing_detection, seatbelt_reminders, tyre_pressure_monitoring |

## Q. EVIDENCE
| ref | url | verbatim quote (contains the value) |
|---|---|---|
| E1 | | |

## R. GAPS & DOUBTS
| item | what is missing / unclear | where you looked |
|---|---|---|
| | | |
