# Intake — Škoda Fabia II (5J)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Reconcile (live, 2026-11-05):** brand `Škoda` and model `Fabia` are LIVE (generations NJ, PJ) —
> this adds generation `5J` under the existing model. Engines REUSE: `CBZB@77`, `BLS@77`, `CAYC@77`.
> Every other engine below is NEW. Gearboxes all resolve live (`VW MQ200`, `VW DQ200`,
> `Aisin 09G (TF-60SN)`) — **verify** that the 1.9 TDI / 1.6 TDI really use the 5-speed MQ200 family
> (02T/0AF) and not the 02R; if 02R, that is a new `transmission_units` row first.
> Scout is a trim (cladding, standard ride height) — not a `Hatchback Cross` body.
> Prices (`*_eur`) and `typical_mileage_range` are left `NULL` for Martin (market data, not specs).
> `injection_type` needs migration `20261105150000` to have run (column does not exist live yet).
> Diesel DPF flags: BNM = no DPF, BNV = DPF — **verify** both before seeding (required, and a wrong
> `false` would be shown to buyers as a selling point).

## A. CAR
| field | value |
|---|---|
| brand | Škoda |
| brand_country | Czech Republic |
| model | Fabia |
| segment | B |
| origin_country | czech |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | 5J |
| phase_label | Pre-facelift |
| year_from | 2007 |
| year_to | 2010 |
| display_name | Fabia II (5J) Pre-facelift |
| platform_code | PQ24 |
| safety_rating | 4 |
| ncap_year | 2007 |
| ncap_adult_pct | NULL |
| ncap_child_pct | NULL |
| ncap_pedestrian_pct | NULL |
| ncap_safety_assist_pct | NULL |
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
| generation_code | 5J |
| phase_label | Facelift |
| year_from | 2010 |
| year_to | 2014 |
| display_name | Fabia II (5J) Facelift |
| platform_code | PQ24 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

INHERIT phase attributes FROM Škoda Fabia 5J Pre-facelift

*(2007 Euro NCAP used the old star protocol — adult 4★ / child 3★ / pedestrian 3★, no percentages, so the `_pct` fields are honestly NULL.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4000 | 1642 | 1498 | NULL | NULL | 300 | 1163 | 5 | NULL | NULL | 45 | 2 | false |
| Pre-facelift | Estate | 4239 | 1642 | 1498 | NULL | NULL | 480 | 1460 | 5 | NULL | NULL | 45 | 2 | false |

### Facelift
INHERIT dimensions FROM Škoda Fabia 5J Pre-facelift / Hatchback 5-door
INHERIT dimensions FROM Škoda Fabia 5J Pre-facelift / Estate

## D. ENGINES
*(EA111 petrols: the 3-cyl 1.2 HTP and early 1.2 TSI are chain-driven; the 1.4 16V / 1.6 16V BTS are belt. Diesels: 3-cyl 1.4 TDI pump-injector, then EA189 common-rail 1.2 / 1.6 TDI from the facelift.)*

| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type | distinct_reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BBM | 44 | petrol | NULL | 1.2 HTP 6V 44kW | NULL | 1198 | 108 | L3 | Euro4 | chain | NULL | NULL | false | false | false | port | NULL |
| BZG | 51 | petrol | NULL | 1.2 HTP 12V 51kW | NULL | 1198 | 112 | L3 | Euro4 | chain | NULL | NULL | false | false | false | port | NULL |
| CGPA | 44 | petrol | NULL | 1.2 HTP 12V 44kW | NULL | 1198 | 108 | L3 | Euro5 | chain | NULL | NULL | false | false | false | port | NULL |
| CGPB | 51 | petrol | NULL | 1.2 HTP 12V 51kW | NULL | 1198 | 112 | L3 | Euro5 | chain | NULL | NULL | false | false | false | port | NULL |
| BXW | 63 | petrol | NULL | 1.4 16V 63kW | NULL | 1390 | 132 | L4 | Euro4 | belt | NULL | 90000 | false | false | false | port | NULL |
| CGGB | 63 | petrol | NULL | 1.4 16V 63kW | NULL | 1390 | 132 | L4 | Euro5 | belt | NULL | 90000 | false | false | false | port | NULL |
| BTS | 77 | petrol | NULL | 1.6 16V 77kW | NULL | 1598 | 153 | L4 | Euro4 | belt | NULL | 90000 | false | false | false | port | NULL |
| CFNA | 77 | petrol | NULL | 1.6 MPI 77kW | NULL | 1598 | 153 | L4 | Euro5 | chain | NULL | NULL | false | false | false | port | NULL |
| CBZA | 63 | petrol | NULL | 1.2 TSI 63kW | NULL | 1197 | 160 | L4 | Euro5 | chain | NULL | NULL | false | false | false | direct | NULL |
| CAVE | 132 | petrol | NULL | 1.4 TSI RS 132kW (twincharger) | NULL | 1390 | 250 | L4 | Euro5 | chain | NULL | NULL | false | false | false | direct | NULL |
| BNM | 51 | diesel | NULL | 1.4 TDI PD 51kW | NULL | 1422 | 155 | L3 | Euro4 | belt | NULL | NULL | false | NULL | false | pump_injector | NULL |
| BNV | 59 | diesel | NULL | 1.4 TDI PD 59kW | NULL | 1422 | 195 | L3 | Euro4 | belt | NULL | NULL | true | NULL | false | pump_injector | NULL |
| CFWA | 55 | diesel | NULL | 1.2 TDI CR 55kW (GreenLine) | NULL | 1199 | 180 | L3 | Euro5 | belt | NULL | NULL | true | NULL | false | common_rail | NULL |
| CAYA | 55 | diesel | NULL | 1.6 TDI CR 55kW | NULL | 1598 | 195 | L4 | Euro5 | belt | NULL | NULL | true | NULL | false | common_rail | NULL |
| CAYB | 66 | diesel | NULL | 1.6 TDI CR 66kW | NULL | 1598 | 230 | L4 | Euro5 | belt | NULL | NULL | true | NULL | false | common_rail | NULL |

REUSE CBZB@77kW
REUSE BLS@77kW
REUSE CAYC@77kW

## E. GEARBOXES
| unit_code |
|---|
| VW MQ200 |
| VW DQ200 |
| Aisin 09G (TF-60SN) |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2007 – 2010):**
- Pre-facelift: BBM 44kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BZG 51kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BXW 63kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BTS 77kW + VW MQ200 / Aisin 09G (TF-60SN) + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BNM 51kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BNV 59kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Pre-facelift: BLS 77kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]

**Facelift (2010 – 2014):**
- Facelift: CGPA 44kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CGPB 51kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CGGB 63kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CBZA 63kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CBZB 77kW + VW MQ200 / VW DQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CFNA 77kW + Aisin 09G (TF-60SN) + FWD → [Hatchback 5-door, Estate]
- Facelift: CAVE 132kW + VW DQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CFWA 55kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CAYA 55kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CAYB 66kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]
- Facelift: CAYC 77kW + VW MQ200 + FWD → [Hatchback 5-door, Estate]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Classic | 1 | Pre-facelift, Facelift | Driver and passenger airbags, ABS, front passenger airbag deactivation switch, ISOFIX on the rear outer seats, central locking. |
| Ambiente | 2 | Pre-facelift, Facelift | Manual air conditioning, electric front windows, height-adjustable driver seat, radio with CD. |
| Sport | 2 | Pre-facelift | 16-inch alloy wheels, sport seats, sport suspension, three-spoke leather steering wheel. |
| Elegance | 3 | Pre-facelift, Facelift | Climatronic automatic air conditioning, 15-inch alloy wheels, front fog lights, cruise control. |
| Scout | 3 | Pre-facelift, Facelift | Black wheel-arch and sill cladding, silver bumper inserts, roof rails, 16-inch alloy wheels. |
| Monte Carlo | 3 | Facelift | Black roof and mirrors, 16-inch black alloy wheels, tinted rear windows, sport seats. |
| GreenLine | 2 | Facelift | 1.2 TDI CR 55kW, start-stop, brake energy recuperation, low-rolling-resistance tyres, aerodynamic kit. |
| RS | 4 | Facelift | 1.4 TSI 132kW with DSG and paddle shifters, 17-inch alloy wheels, sport chassis, XDS electronic differential lock, sport seats. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | BBM | Timing chain stretch on the 3-cylinder 1.2 HTP — rattle on cold start; a jumped chain bends valves. | critical | NULL |
| engine | BZG | Timing chain stretch on the 3-cylinder 1.2 HTP — rattle on cold start; a jumped chain bends valves. | critical | NULL |
| engine | CGPA | Timing chain and tensioner wear (improved vs. the 6V, still the main risk past 120 000 km). | moderate | NULL |
| engine | CGPB | Timing chain and tensioner wear (improved vs. the 6V, still the main risk past 120 000 km). | moderate | NULL |
| engine | BBM | Ignition coil failures causing misfire on one cylinder. | minor | NULL |
| engine | BXW | Raised oil consumption with age (valve-stem seals / piston rings). | moderate | NULL |
| engine | CBZA | Timing chain stretch on early 1.2 TSI (to ~2012, before the revised chain). | critical | NULL |
| engine | CAVE | Timing chain tensioner failure and piston / ring damage (high oil consumption) on the twincharger 1.4 TSI. | critical | NULL |
| engine | CAVE | Supercharger clutch / water pump (thermostat housing) leaks. | moderate | NULL |
| engine | BNM | Pump-injector wiring loom and injector seal failures; strong 3-cylinder vibration at idle (engine mounts). | moderate | NULL |
| engine | BNV | Pump-injector wiring loom and injector seal failures; DPF clogging on short-trip use. | moderate | NULL |
| engine | CAYB | EGR valve and DPF clogging when driven mostly on short trips. | moderate | NULL |
| engine | CAYA | EGR valve and DPF clogging when driven mostly on short trips. | moderate | NULL |
| vehicle | Pre-facelift | Electric window regulators fail (cable snaps), mainly front doors. | minor | electrical |
| vehicle | Pre-facelift | Rear axle bushes and front anti-roll bar links knock on rough roads. | minor | suspension |
| vehicle | Facelift | Air-conditioning compressor and condenser failures (stone damage behind the bumper). | minor | climate |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | BBM@44kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BBM@44kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BZG@51kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BZG@51kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BXW@63kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BXW@63kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BTS@77kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BTS@77kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BTS@77kW | Aisin 09G (TF-60SN) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BTS@77kW | Aisin 09G (TF-60SN) | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BNM@51kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BNM@51kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BNV@59kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BNV@59kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BLS@77kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | BLS@77kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGPA@44kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGPA@44kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGPB@51kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGPB@51kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGGB@63kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CGGB@63kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZA@63kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZA@63kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZB@77kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZB@77kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZB@77kW | VW DQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CBZB@77kW | VW DQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CFNA@77kW | Aisin 09G (TF-60SN) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CFNA@77kW | Aisin 09G (TF-60SN) | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAVE@132kW | VW DQ200 | FWD | Hatchback 5-door | 6.2 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 148 | NULL |
| Facelift | CAVE@132kW | VW DQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CFWA@55kW | VW MQ200 | FWD | Hatchback 5-door | 3.4 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 89 | NULL |
| Facelift | CFWA@55kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYA@55kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYA@55kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYB@66kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYB@66kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYC@77kW | VW MQ200 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | CAYC@77kW | VW MQ200 | FWD | Estate | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
