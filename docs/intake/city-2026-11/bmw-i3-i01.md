# Intake — BMW i3 (I01), BEV — urban commuter

> **Status (live, 2026-11-09):** the i3 is ALREADY SEEDED (`20261105162025`) — BMW brand, 2 phases,
> 5 EV engines, 6 configurations, 8 trims, 3 faults. This document is the source of truth for that car;
> the changes since the seed reach the DB through `20261109223000` (human-run), not a re-import.
> Figures in section J are Martin's finalized set (2026-11-09).
>
> **Engine row = powertrain variant** (motor + battery), keyed on (code, power_kw): one 125 kW motor sat
> on three batteries, so the battery variant is the code (`i3-60Ah`, …).
> **Battery cooling `active_refrigerant`:** the pack is cooled by the A/C refrigerant circuit through
> plates under the modules — active, but not a liquid-coolant loop (`active_liquid` would be wrong).
> **One cycle per configuration row:** a row holds one consumption figure + range on one cycle. The 120 Ah
> rows carry WLTP (15.3 / 16.3 kWh); their NEDC values (13.1 / 14.0 kWh) can't be stored next to them and
> are noted here only.
> **i3 REx** (W20 range extender) is not in this document — an EREV fits neither `HEV` nor a plain
> `electric` row; decide `PHEV` vs. a new value before adding it. Prices / mileage NULL for Martin.

### Pros / cons (go to `catalog_engines.pros` / `cons` via `20261109223000` — the intake parser has no pros/cons section)

Powertrain (all five engine rows):
- **Pro:** actively cooled battery (refrigerant plates) — lower capacity loss with age than passively
  cooled EVs of the same years (Leaf, e-Golf); check the state of health anyway, it is not zero.
- **Pro:** 125 / 135 kW motor with 250 / 270 Nm from standstill — strong 0–60 km/h in town.
- **Pro (94 / 120 Ah):** 11 kW three-phase AC — a full charge overnight on a wallbox.

*(Rear-wheel drive and the 9.86 m turning circle are drivetrain / car facts — CLAUDE.md rule 9 keeps them out of engine content.)*
- **Con:** 50 kW DC peak is slow by current standards (~40 min to 80 %).
- **Con:** 60 Ah: ~190 km NEDC, realistically ~120–150 km — a city-only car.

Car-level — **NOT stored: no vehicle-level pros/cons column exists** (`catalog_models` / `catalog_phases`
have none). Listed for when one is added:
- **Pro:** CFRP passenger cell on an aluminium drive module — light, rigid, rust-free body structure.
- **Con:** rear-hinged coach doors only open after the front door — awkward in tight parking spots and
  for rear passengers alone.
- **Con:** firm, fidgety ride on the i3s's 20-inch wheels; narrow 155 / 175 tyres are costly and less common.
- **Con:** 4 seats only; rear access and boot (260 l) limit it as a family car.
- **Con:** CFRP accident repair needs a BMW i-certified body shop.

## A. CAR
| field | value |
|---|---|
| brand | BMW |
| brand_country | Germany |
| model | i3 |
| segment | B |
| origin_country | german |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | I01 |
| phase_label | Pre-facelift |
| year_from | 2013 |
| year_to | 2017 |
| display_name | i3 (I01) Pre-facelift |
| platform_code | BMW LifeDrive |
| safety_rating | 4 |
| ncap_year | 2013 |
| ncap_adult_pct | 86 |
| ncap_child_pct | 81 |
| ncap_pedestrian_pct | 57 |
| ncap_safety_assist_pct | 55 |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | depreciates_fast |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

### Facelift
| field | value |
|---|---|
| generation_code | I01 |
| phase_label | Facelift |
| year_from | 2017 |
| year_to | 2022 |
| display_name | i3 (I01) Facelift (LCI) |
| platform_code | BMW LifeDrive |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | depreciates_fast |
| chassis_type | monocoque |
| consumption_cycle | WLTP |

INHERIT phase attributes FROM BMW i3 I01 Pre-facelift

*(Euro NCAP 2013: 4★, 86 / 81 / 57 / 55. `towing_capacity_kg` NULL: not homologated for towing. `chassis_type` monocoque = the CFRP "Life" cell — the closer of the two values. The facelift's default cycle is WLTP; its 2017–18 94 Ah rows override it to NEDC in section J.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 3999 | 1775 | 1578 | NULL | NULL | 260 | 1100 | 4 | NULL | NULL | NULL | 2 | false |

### Facelift
INHERIT dimensions FROM BMW i3 I01 Pre-facelift / Hatchback 5-door

*(Coach rear doors — still a 5-door hatch body. No fuel tank: pure EV. Curb weight is per configuration (section J). The i3s is 4006 × 1791 × 1590 mm — a per-version difference the body table can't hold. Euro NCAP 2013: front-passenger ISOFIX not permitted.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| i3-60Ah | 125 | electric | NULL | i3 60 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 18.8 | 7.4 | 50 | active_refrigerant | optional |
| i3-94Ah | 125 | electric | NULL | i3 94 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 27.2 | 11 | 50 | active_refrigerant | optional |
| i3-120Ah | 125 | electric | NULL | i3 120 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 37.9 | 11 | 50 | active_refrigerant | optional |
| i3s-94Ah | 135 | electric | NULL | i3s 94 Ah, 135kW | NULL | NULL | 270 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 27.2 | 11 | 50 | active_refrigerant | optional |
| i3s-120Ah | 135 | electric | NULL | i3s 120 Ah, 135kW | NULL | NULL | 270 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 37.9 | 11 | 50 | active_refrigerant | optional |

*(Battery gross / net: 60 Ah 21.6 / 18.8 kWh · 94 Ah 33.2 / 27.2 kWh · 120 Ah 42.2 / 37.9 kWh. AC: 60 Ah 7.4 kW single-phase; 94 / 120 Ah up to 11 kW three-phase (BMW 2016 data: 11 kW / 16 A ≈ 2 h 45 min to 80 % on the 94 Ah) — the column holds the maximum the variant could have, the charger fitted to a given car still varies. DC 50 kW CCS was optional on early cars. Heat pump: optional on every variant.)*

## E. GEARBOXES
| unit_code |
|---|
| generic:Single-speed EV |

## F. DRIVETRAIN
| drivetrain |
|---|
| RWD |

## G. CONFIG MATRIX

**Pre-facelift (2013 – 2017):**
- Pre-facelift: i3-60Ah 125kW + generic:Single-speed EV + RWD → [Hatchback 5-door]
- Pre-facelift: i3-94Ah 125kW + generic:Single-speed EV + RWD → [Hatchback 5-door]

**Facelift (2017 – 2022):**
- Facelift: i3-94Ah 125kW + generic:Single-speed EV + RWD → [Hatchback 5-door]
- Facelift: i3s-94Ah 135kW + generic:Single-speed EV + RWD → [Hatchback 5-door]
- Facelift: i3-120Ah 125kW + generic:Single-speed EV + RWD → [Hatchback 5-door]
- Facelift: i3s-120Ah 135kW + generic:Single-speed EV + RWD → [Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Atelier | 1 | Pre-facelift, Facelift | Front and side airbags, DSC, ISOFIX on the rear seats, Business navigation with 6.5-inch screen, automatic air conditioning, 19-inch alloy wheels. |
| Loft | 2 | Pre-facelift, Facelift | Grey cloth with recycled fibres, eucalyptus or carbon-look dashboard trim, LED headlights. |
| Lodge | 3 | Pre-facelift, Facelift | Leather / wool upholstery, open-pore eucalyptus dashboard, heated front seats. |
| Suite | 4 | Facelift | Brown full-grain leather, eucalyptus wood trim, Harman Kardon audio. |
| i3s | 3 | Facelift | 135 kW motor, sport suspension (-10 mm), 20-inch alloy wheels, wider track, Sport driving mode. |

*(Equipment options, not trims — the i3 sold them across every trim, so they are NOT seeded as trim rows: **Professional navigation** (10.25-inch screen; Apple CarPlay as an option on iDrive 6 cars — facelift, plus some late-2016 cars, **verify** by option code 6NW; **Android Auto was never offered on the i3**), **heat pump** (option on every variant, never standard), 11 kW three-phase AC charging and 50 kW DC on early cars.)*

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | i3-60Ah | High-voltage electronics (EME) / charging-unit (KLE) failure — no charging or drive; expensive out of warranty. | critical | NULL |
| engine | i3-94Ah | KLE (on-board AC charger) failure — AC charging stops or won't start, DC still works; unit replacement out of warranty. | critical | NULL |
| engine | i3-60Ah | Electric-motor mount wear on early cars — clunk when pulling away or lifting off. | moderate | NULL |
| engine | i3-94Ah | Electric-motor mount wear — clunk when pulling away or lifting off. | moderate | NULL |
| engine | i3-60Ah | 12 V battery drain — "drive train malfunction" warnings, the car won't wake up. | minor | NULL |
| engine | i3-94Ah | 12 V battery and its charging fault messages; the car won't wake up. | minor | NULL |
| engine | i3s-94Ah | 12 V battery drain — "drive train malfunction" warnings, the car won't wake up. | minor | NULL |
| engine | i3-120Ah | 12 V battery drain — "drive train malfunction" warnings, the car won't wake up. | minor | NULL |
| engine | i3s-120Ah | 12 V battery drain — "drive train malfunction" warnings, the car won't wake up. | minor | NULL |
| vehicle | Pre-facelift | Front suspension (lower arm bushes) knocks; steering rack noise. | minor | suspension |

## J. CONFIG FACTS
*(Martin's finalized figures, 2026-11-09. Ranges: [B16] BMW 2016 data (60 / 94 Ah NEDC), ultimatespecs (i3s 94 Ah NEDC), BMW WLTP (120 Ah). 120 Ah NEDC consumption 13.1 / 14.0 kWh not storable — one cycle per row.)*

| phase | engine | gearbox | drivetrain | body | energy_consumption_kwh100km | consumption_cycle | curb_weight_kg | acceleration_0_100 | top_speed_kmh | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | i3-60Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | 12.9 | NEDC | 1280 | 7.2 | 150 | 190 |
| Pre-facelift | i3-94Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | 12.6 | NEDC | 1320 | 7.3 | 150 | 312 |
| Facelift | i3-94Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | 13.1 | NEDC | 1320 | 7.3 | 150 | NULL |
| Facelift | i3s-94Ah@135kW | generic:Single-speed EV | RWD | Hatchback 5-door | 14.3 | NEDC | 1340 | 6.9 | 160 | 280 |
| Facelift | i3-120Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | 15.3 | WLTP | 1345 | 7.3 | 150 | 285 |
| Facelift | i3s-120Ah@135kW | generic:Single-speed EV | RWD | Hatchback 5-door | 16.3 | WLTP | 1365 | 6.9 | 160 | 270 |
