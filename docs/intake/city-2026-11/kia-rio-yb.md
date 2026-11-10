# Intake — Kia Rio IV (YB)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Reconcile (live, 2026-11-05):** brand `Kia` NOT live (shared with the Picanto doc). Engines NEW
> (G4LA here is 62 kW, not the Picanto's 63 kW). Gearboxes: `Hyundai D7GF1` (7DCT) and the 5MT / 6MT /
> 6iMT placeholders are the same Hyundai-Kia reference rows as the i20; the 4AT behind the 1.4 MPI is
> `Hyundai A4CF1` — **unverified** (A4CF0 = 1.0/1.2 units). Engine codes G4LC, G3LC, D4FC are the
> usual Kappa / U-II codes — **verify**. Euro NCAP 2017: rating stated 4★ from memory, percentages not
> reachable → NULL, **verify**. FL (2020) MHEV T-GDi and 1.2 MPI (G4LF) left out until codes confirmed.
> 1.4 CRDi DPF = true (Euro 6, no SCR) — **verify**. Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Kia |
| brand_country | South Korea |
| model | Rio |
| segment | B |
| origin_country | korean |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | YB |
| phase_label | Pre-facelift |
| year_from | 2017 |
| year_to | 2020 |
| display_name | Rio IV (YB) Pre-facelift |
| platform_code | Hyundai-Kia PB/GB |
| safety_rating | 4 |
| ncap_year | 2017 |
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
| generation_code | YB |
| phase_label | Facelift |
| year_from | 2020 |
| year_to | 2023 |
| display_name | Rio IV (YB) Facelift |
| platform_code | Hyundai-Kia PB/GB |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | average |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM Kia Rio YB Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 4065 | 1725 | 1450 | NULL | NULL | 325 | 980 | 5 | NULL | NULL | 45 | 2 | false |

### Facelift
INHERIT dimensions FROM Kia Rio YB Pre-facelift / Hatchback 5-door

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G4LA | 62 | petrol | NULL | 1.25 MPI 62kW | NULL | 1248 | 122 | L4 | Euro6 | chain | NULL | NULL | false | false | false | port |
| G4LC | 73 | petrol | NULL | 1.4 MPI 73kW | NULL | 1368 | 133 | L4 | Euro6 | chain | NULL | NULL | false | false | false | port |
| G3LC | 74 | petrol | NULL | 1.0 T-GDi 74kW | NULL | 998 | 172 | L3 | Euro6 | chain | NULL | NULL | false | false | false | direct |
| G3LC | 88 | petrol | NULL | 1.0 T-GDi 88kW | NULL | 998 | 172 | L3 | Euro6 | chain | NULL | NULL | false | false | false | direct |
| D4FC | 57 | diesel | NULL | 1.4 CRDi 57kW | NULL | 1396 | 240 | L4 | Euro6 | chain | NULL | NULL | true | NULL | false | common_rail |
| D4FC | 66 | diesel | NULL | 1.4 CRDi 66kW | NULL | 1396 | 240 | L4 | Euro6 | chain | NULL | NULL | true | NULL | false | common_rail |

## E. GEARBOXES
| unit_code |
|---|
| Hyundai 5MT (code TBD) |
| Hyundai 6MT (code TBD) |
| Hyundai A4CF1 |
| Hyundai D7GF1 |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

## G. CONFIG MATRIX

**Pre-facelift (2017 – 2020):**
- Pre-facelift: G4LA 62kW + Hyundai 5MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: G4LC 73kW + Hyundai A4CF1 + FWD → [Hatchback 5-door]
- Pre-facelift: G3LC 74kW + Hyundai 5MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: G3LC 88kW + Hyundai 6MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: D4FC 57kW + Hyundai 6MT (code TBD) + FWD → [Hatchback 5-door]
- Pre-facelift: D4FC 66kW + Hyundai 6MT (code TBD) + FWD → [Hatchback 5-door]

**Facelift (2020 – 2023):**
- Facelift: G3LC 74kW + Hyundai D7GF1 + FWD → [Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| LX | 1 | Pre-facelift, Facelift | Six airbags, ESC with hill-start assist, passenger airbag off switch, ISOFIX on the rear outer seats, manual air conditioning. |
| EX | 2 | Pre-facelift, Facelift | 15-inch alloy wheels, 7-inch touchscreen, rear-view camera, cruise control, Bluetooth. |
| TX | 3 | Pre-facelift, Facelift | 16-inch alloy wheels, automatic climate control, heated seats and steering wheel, autonomous emergency braking, navigation. |
| GT-Line | 3 | Pre-facelift, Facelift | GT-Line bumpers, 17-inch alloy wheels, flat-bottom steering wheel, LED fog lights. |

## I. FAULTS
*(The D7GF1 gearbox fault is filed once, in the i20 doc — gearbox faults attach to the shared unit, a second copy would duplicate it.)*

| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | G3LC@74kW | Turbo wastegate actuator rattle and intake carbon build-up on high-mileage city cars. | minor | NULL |
| engine | G3LC@88kW | Turbo wastegate actuator rattle and intake carbon build-up on high-mileage city cars. | minor | NULL |
| engine | D4FC@57kW | DPF clogging and EGR valve fouling in short-trip use. | moderate | NULL |
| engine | D4FC@66kW | DPF clogging and EGR valve fouling in short-trip use. | moderate | NULL |
| vehicle | Pre-facelift | Steering column flexible coupling (electric power steering) knocks over bumps. | moderate | steering |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | G4LA@62kW | Hyundai 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G4LC@73kW | Hyundai A4CF1 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G3LC@74kW | Hyundai 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | G3LC@88kW | Hyundai 6MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | D4FC@57kW | Hyundai 6MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | D4FC@66kW | Hyundai 6MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | G3LC@74kW | Hyundai D7GF1 | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
