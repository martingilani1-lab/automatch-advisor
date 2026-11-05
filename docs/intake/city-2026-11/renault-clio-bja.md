# Intake — Renault Clio V (BJA) incl. E-Tech hybrid

> **Reconcile (live, 2026-11-05):** brand `Renault` NOT live (shared with the Zoe doc). Engines NEW.
> Gearboxes REUSED: `Renault EDC 7-speed (dry)` (TCe 130) and `Renault E-TECH Multi-mode` (E-Tech).
> The multi-mode is a clutchless dog-clutch box (no friction clutch at all), but it's live as
> `dct_wet` — a family question for Martin, not part of this import. Manual gearboxes JH3 (5MT), JT4
> (6MT, petrol) and TL4 (6MT, diesel) are the Renault codes as far as I know — **verify**, then add
> them as reference rows; they STOP until then.
> **Covers every fuel the batch has to test:** petrol, turbo petrol + dry DCT, Blue dCi diesel with DPF
> **and** AdBlue (`has_adblue = true`), full hybrid (`HEV`, system-power convention as in the Yaris IV
> doc). The **TCe 100 LPG (Eco-G) bi-fuel** is held back: it shares code H4D and 74 kW with the petrol
> TCe 100, so the (code, power_kw) key can't hold both. It needs its real Renault type code (H4D 4xx),
> then it goes in with `fuel_type = lpg`, `secondary_fuel_type = petrol` in section J.
> **ISOFIX on the front passenger seat = true** (Clio V has three ISOFIX points) — **verify**.
> Engine type codes only at family level (H4D / H5H / K9K / H4M). Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Renault |
| brand_country | France |
| model | Clio |
| segment | B |
| origin_country | french |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | BJA |
| phase_label | Pre-facelift |
| year_from | 2019 |
| year_to | 2023 |
| display_name | Clio V (BJA) Pre-facelift |
| platform_code | CMF-B |
| safety_rating | 5 |
| ncap_year | 2019 |
| ncap_adult_pct | 96 |
| ncap_child_pct | 89 |
| ncap_pedestrian_pct | 60 |
| ncap_safety_assist_pct | 75 |
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
| generation_code | BJA |
| phase_label | Facelift |
| year_from | 2023 |
| year_to | NULL |
| display_name | Clio V (BJA) Facelift |
| platform_code | CMF-B |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Renault Clio BJA Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4050 | 1798 | 1440 | NULL | NULL | 391 | 1069 | 5 | NULL | NULL | 42 | 3 | true |

### Facelift
INHERIT dimensions FROM Renault Clio BJA Pre-facelift / Hatchback 5-door

*(The E-Tech's battery under the boot floor cuts the boot to ~300 l and the tank to 39 l — per powertrain, not per body; noted, not stored.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H4D | 49 | petrol | NULL | 1.0 SCe 65 49kW | NULL | 999 | 95 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| H4D | 74 | petrol | NULL | 1.0 TCe 100 74kW | NULL | 999 | 160 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| H4D | 67 | petrol | NULL | 1.0 TCe 90 67kW | NULL | 999 | 160 | L3 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| H5H | 96 | petrol | NULL | 1.3 TCe 130 96kW | NULL | 1333 | 240 | L4 | Euro6d | chain | NULL | NULL | false | true | false | direct |
| K9K | 63 | diesel | NULL | 1.5 Blue dCi 85 63kW | NULL | 1461 | 220 | L4 | Euro6d | belt | NULL | NULL | true | NULL | true | common_rail |
| K9K | 85 | diesel | NULL | 1.5 Blue dCi 115 85kW | NULL | 1461 | 260 | L4 | Euro6d | belt | NULL | NULL | true | NULL | true | common_rail |
| H4M | 103 | petrol | HEV | E-Tech 140 (1.6 engine 67kW / system 103kW) | NULL | 1598 | 144 | L4 | Euro6d | chain | NULL | NULL | false | NULL | false | port |
| H4M | 105 | petrol | HEV | E-Tech full hybrid 145 (system 105kW) | NULL | 1598 | 148 | L4 | Euro6e | chain | NULL | NULL | false | NULL | false | port |

## E. GEARBOXES
| unit_code |
|---|
| Renault JH3 |
| Renault JT4 |
| Renault TL4 |
| Renault EDC 7-speed (dry) |
| Renault E-TECH Multi-mode |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2019 – 2023):**
- Pre-facelift: H4D 49kW + Renault JH3 + FWD → [Hatchback 5-door]
- Pre-facelift: H4D 74kW + Renault JH3 + FWD → [Hatchback 5-door]
- Pre-facelift: H4D 67kW + Renault JT4 + FWD → [Hatchback 5-door]
- Pre-facelift: H5H 96kW + Renault EDC 7-speed (dry) + FWD → [Hatchback 5-door]
- Pre-facelift: K9K 63kW + Renault TL4 + FWD → [Hatchback 5-door]
- Pre-facelift: K9K 85kW + Renault TL4 + FWD → [Hatchback 5-door]
- Pre-facelift: H4M 103kW + Renault E-TECH Multi-mode + FWD → [Hatchback 5-door]

**Facelift (2023 – ):**
- Facelift: H4D 49kW + Renault JH3 + FWD → [Hatchback 5-door]
- Facelift: H4D 67kW + Renault JT4 + FWD → [Hatchback 5-door]
- Facelift: H4M 105kW + Renault E-TECH Multi-mode + FWD → [Hatchback 5-door]

*(The 2019–2020 TCe 100 manual was replaced by the TCe 90 (6MT) — confirm the switch year for SK/CZ. A Blue dCi 100 was listed for the facelift in some markets — left out until confirmed.)*

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Life | 1 | Pre-facelift | Six airbags, active emergency braking, lane-departure warning, passenger airbag off switch, ISOFIX on the rear outer seats and the front passenger seat, LED headlights. |
| Zen | 2 | Pre-facelift | Manual air conditioning, 7-inch Easy Link touchscreen, cruise control, rear parking sensors. |
| Intens | 3 | Pre-facelift | 16-inch alloy wheels, automatic climate control, 9.3-inch screen with navigation, reversing camera, keyless entry. |
| R.S. Line | 4 | Pre-facelift | 17-inch alloy wheels, R.S. Line bumpers, sport seats, carbon-look trim, 10-inch digital cluster. |
| Initiale Paris | 4 | Pre-facelift | Leather upholstery, Bose audio, 17-inch diamond-cut wheels, heated seats. |
| Evolution | 1 | Facelift | Active emergency braking, lane-keeping assist, 7-inch touchscreen, LED headlights. |
| Techno | 2 | Facelift | 16-inch alloy wheels, 9.3-inch Easy Link with navigation, automatic climate control, reversing camera. |
| Esprit Alpine | 3 | Facelift | 17-inch alloy wheels, Alpine-branded sport seats, ambient lighting, adaptive cruise control. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| gearbox | Renault EDC 7-speed (dry) | Dry-clutch judder pulling away and hesitant low-speed shifts in city traffic; clutch pack wear. | moderate | NULL |
| gearbox | Renault E-TECH Multi-mode | Jerky changes between electric and hybrid modes at low speed; software updates issued. | minor | NULL |
| engine | H5H | Oil consumption on some early 1.3 TCe; check the level between services. | moderate | NULL |
| engine | K9K@63kW | AdBlue system faults (NOx sensor, AdBlue pump / heater) triggering the engine-start countdown warning. | moderate | NULL |
| engine | K9K@85kW | AdBlue system faults (NOx sensor, AdBlue pump / heater) triggering the engine-start countdown warning. | moderate | NULL |
| engine | K9K@63kW | DPF clogging in short-trip use. | moderate | NULL |
| engine | K9K@85kW | DPF clogging in short-trip use. | moderate | NULL |
| vehicle | Pre-facelift | Easy Link infotainment freezes / reboots; 12 V battery drain from modules not sleeping. | minor | electrical |
| vehicle | Pre-facelift | Rattles from the dashboard and door cards. | minor | interior |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_wltp_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_wltp_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | H4D@49kW | Renault JH3 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | H4D@74kW | Renault JH3 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | H4D@67kW | Renault JT4 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | H5H@96kW | Renault EDC 7-speed (dry) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | K9K@63kW | Renault TL4 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | K9K@85kW | Renault TL4 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | H4M@103kW | Renault E-TECH Multi-mode | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | H4D@49kW | Renault JH3 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | H4D@67kW | Renault JT4 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | H4M@105kW | Renault E-TECH Multi-mode | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
