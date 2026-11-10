<!--
  GEMINI RESEARCH PACK — v1 (2026-11-10)
  How to use:
    1. Open Gemini (Deep Research, or a chat with Google Search on).
    2. Paste PART 1 (the prompt), replacing <CAR> and <PHASE>.
    3. Paste PART 2 (the template) right after it.
    4. ONE car, ONE phase per request. Second phase = a new request with the first one's
       section C / D pasted as context.
    5. Send the result to Claude unchanged. Claude checks it (quotes vs. sources, import script)
       before anything is seeded — nothing Gemini writes goes straight to the database.
-->

# PART 1 — PROMPT (paste first)

You are filling a vehicle intake document for a used-car database (Slovak / Czech market). The
data will be shown to car buyers. A wrong number is worse than a missing one.

**Car:** <CAR> — e.g. "BMW i3 (I01)"
**Phase:** <PHASE> — e.g. "Facelift (LCI), 2017–2022"
**Market:** EU, Slovakia / Czech Republic versions only.

Hard rules — breaking any of them makes the whole document unusable:

1. **Unknown → `NULL`.** Never estimate, average, round from a similar version, or carry over a
   value from another model, phase, engine, market or model year.
2. **Not applicable → `N/A`** (e.g. displacement of an electric motor, AdBlue on a petrol engine).
3. **Every filled value needs evidence** in section K: the exact URL and a short verbatim quote
   (max ~20 words) that contains the number. If you can't quote it, it's `NULL`.
4. **No conversions.** Don't convert PS→kW, mph→km/h, NEDC↔WLTP, DIN↔EU weight, gross↔net
   battery. If the source gives the wrong standard for the column (see STANDARDS), write `NULL`
   and put the figure in section M with its standard.
5. **Source priority:** (1) manufacturer price list / technical data / press kit for that model
   year, (2) Euro NCAP datasheet (safety), (3) independent spec databases (auto-data.net,
   ultimatespecs.com, cars-data.com) only for values the manufacturer doesn't publish. Pages
   from the same database count as ONE source. Forums only for faults (section I).
6. **Sources disagree → `NULL`**, list both in section M — unless one is the manufacturer, then
   use the manufacturer and still list the other.
7. **Codes are never guessed.** Engine codes, gearbox codes, platform codes only when a source
   names them. Otherwise `NULL` (engines: write the description in `display_name`).
8. **Closed vocabularies.** Fields listed in section L accept only the listed values, spelled
   exactly. If none fits, write `NULL` and explain in section M.
9. **Only factory configurations** sold in the EU (section G). No "probably also available".
10. **Keep the format exactly.** Same section letters, same table headers, same column order.
    Markdown tables only, no extra prose outside the sections. Fill every cell (`NULL` / `N/A`
    if empty).
11. **Variants matter.** If a figure differs by wheel size, battery or body, it belongs on the
    matching row only — never the "best" figure on every row.
12. At the end, section M lists every `NULL` you think *should* exist somewhere (with where you
    looked) and everything you were unsure about. Be honest; a long section M is fine.

**Research order** (each step narrows the next):
1. B — phase years, platform, Euro NCAP (euroncap.com datasheet for this model and test year).
2. G — which engine × gearbox × drivetrain × body combinations existed (manufacturer price lists
   for the phase's years are best).
3. D — every engine in G: code, power, torque, injection, timing drive, emission standard,
   after-treatment (DPF / GPF / AdBlue), battery / charging for EVs.
4. C — dimensions per body.
5. J — per configuration: consumption + cycle, range (EV), CO₂, 0–100, top speed, EU weight,
   towing.
6. H — trims and their standard equipment.
7. I — known faults (owner forums, TÜV / ADAC reports, recalls), with symptom.

---

# PART 2 — TEMPLATE (paste after the prompt)

## STANDARDS — every value must match this definition

| field | definition | if the source gives something else |
|---|---|---|
| curb_weight_kg | EU mass in running order (75 kg driver + 90 % fuel) | DIN / dry weight → `NULL`, note in M |
| boot_capacity_liters | VDA, rear seats up, to parcel shelf | "to roof" → `NULL` |
| boot_max_liters | VDA, rear seats folded, to roof | |
| width_mm | without mirrors | |
| ground_clearance_mm | manufacturer, unladen | |
| power_kw | manufacturer kW. Hybrid: SYSTEM output | PS only → `NULL` (no conversion) |
| torque_nm | combustion engine (ICE) or electric motor (EV) | hybrid system torque → note in M |
| battery_capacity_net_kwh | net / usable | gross only → `NULL`, gross in M |
| max_ac_charging_kw | highest on-board charger offered (option counts) | |
| max_dc_charging_kw | peak DC | |
| consumption / CO₂ / ev_range_km | all on the row's consumption_cycle (NEDC or WLTP) | other cycle → M |
| acceleration_0_100 | 0–100 km/h | 0–60 mph → `NULL` |
| towing_braked_kg | braked, 12 % gradient | |
| NCAP % | tests from 2009 on only; earlier tests: stars only, % = `N/A` | |
| safety_rating | Euro NCAP stars, 0–5 (0 = tested and failed; `NULL` = not tested) | |

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
| safety_rating | | |
| ncap_year | | |
| ncap_adult_pct | | |
| ncap_child_pct | | |
| ncap_pedestrian_pct | | |
| ncap_safety_assist_pct | | |
| towing_capacity_kg | | |
| chassis_type | | |
| consumption_cycle | | |

*(Prices, mileage, resale are Martin's market data — not researched.)*

## C. BODIES
| body_type | length_mm | width_mm | height_mm | wheelbase_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | seats_optional_max | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger | roof_load_kg | nose_weight_kg | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | |

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | injection_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | | | |

*(One row per engine × power. Diesel: has_dpf and has_adblue must be true / false — never NULL. EV: one row per motor × battery variant.)*

## E. GEARBOXES
| gearbox_code | maker | type | speeds | used_with_engines | evidence |
|---|---|---|---|---|---|
| | | | | | |

*(gearbox_code only if a source names it (e.g. "DQ200", "Aisin AW TF-60SN"); otherwise `NULL` and describe it in type + speeds. Claude maps it to the database's gearbox list.)*

## F. DRIVETRAIN
| drivetrain | system_name | evidence |
|---|---|---|
| | | |

*(FWD, RWD, or AWD with the system's name — e.g. "Haldex gen 5", "xDrive".)*

## G. CONFIGURATIONS
| engine (code@kW) | gearbox | drivetrain | bodies | years_available | evidence |
|---|---|---|---|---|---|
| | | | | | |

## H. TRIMS
| trim | tier (1 = base) | standard_equipment (comma-separated) | notable_options | evidence |
|---|---|---|---|---|
| | | | | |

*(Standard equipment only in standard_equipment. Options (heat pump, navigation, CarPlay…) in notable_options with the trims they were offered on.)*

## I. FAULTS
| component | target (engine code@kW / gearbox / body) | fault + symptom | severity | category | evidence |
|---|---|---|---|---|---|
| | | | | | |

*(severity: critical = engine / gearbox / battery failure or safety risk; moderate = costly repair, car still drives; minor = annoyance, cheap fix. A fault is a concrete defect — never a comparison ("worse than X") and never a design trait ("harsh ride" goes in pros/cons). category only for component = vehicle.)*

## J. CONFIGURATION FACTS
| engine (code@kW) | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | ev_range_km | co2_emissions_g_km | curb_weight_kg | acceleration_0_100 | top_speed_kmh | towing_braked_kg | towing_unbraked_kg | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | |

*(One row per configuration in G. A figure that differs by wheel size: use the smallest standard wheel and say so in M.)*

## K. EVIDENCE
| ref | url | verbatim quote (contains the number) |
|---|---|---|
| E1 | | |

*(The `evidence` cells above contain refs like `E1` or `E1, E4`. Every non-NULL value must be covered by a quote here.)*

## L. ALLOWED VALUES
| field | allowed values |
|---|---|
| segment | A, B, C, D, E, F, J, M, S |
| origin_country | german, czech, spanish, french, italian, japanese, korean, swedish, british, american, chinese, romanian |
| body_type | Cabriolet 2-door, Coupe 2-door, Estate, Estate Cross, Hatchback 3-door, Hatchback 5-door, Hatchback Cross, Liftback, MPV 5-door, Roadster 2-door, Sedan 4-door, SUV 5-door, SUV Coupe 5-door |
| chassis_type | monocoque, ladder_frame |
| consumption_cycle | NEDC, WLTP |
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
| severity | critical, moderate, minor |
| category (vehicle faults) | electrical, body_rust, suspension, steering, brakes, climate, interior |

## M. GAPS & DOUBTS
| item | what was missing / unclear | where you looked |
|---|---|---|
| | | |
