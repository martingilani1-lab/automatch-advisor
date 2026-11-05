# Intake — BMW i3 (I01)

> **Reconcile (live, 2026-11-05):** brand `BMW` NOT live. Engines NEW — **the first pure EV in the
> catalog**. Gearbox REUSES the live `generic:Single-speed EV` (single reduction gear, no real code to
> match). **RWD** — first real use of the RWD sentinel. Needs migration `20261105150000` for the battery
> / charging / heat-pump columns.
> **Code convention decision for Martin:** the engine row is the powertrain variant (motor + battery),
> keyed on (code, power_kw). The i3 kept one motor at 125 kW across three batteries (60 / 94 / 120 Ah),
> so a motor code can't be the key. The battery-variant name is used as the code (`i3-60Ah`, …). If you'd
> rather have a different convention, decide it before the import — it will apply to every EV after this.
> **Battery cooling `active_refrigerant`:** the pack is cooled directly by the A/C refrigerant circuit (value added by
> `20261105180000`).
> **i3 REx** (W20 range extender, 647 cc) is left out: an EREV fits neither `HEV` nor a plain `electric`
> row (fuel_type / hybrid_type can't say "EV with a petrol generator"). Decide whether REx is `PHEV` before
> adding it. Prices / mileage NULL for Martin.

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

*(Euro NCAP 2013 report: front-passenger ISOFIX not permitted; passenger airbag deactivation optional. `chassis_type` monocoque = the CFRP "Life" passenger cell on the aluminium "Drive" module — the closest of the two values.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 5-door | 3999 | 1775 | 1578 | NULL | NULL | 260 | 1100 | 4 | NULL | NULL | NULL | 2 | false |

### Facelift
INHERIT dimensions FROM BMW i3 I01 Pre-facelift / Hatchback 5-door

*(Rear-hinged "coach" rear doors — still a 5-door hatch body. `fuel_tank_capacity_liters` NULL: pure EV. The i3s is 4006 × 1791 × 1590 mm — a per-version difference the body table can't hold.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| i3-60Ah | 125 | electric | NULL | i3 60 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 18.8 | 7.4 | 50 | active_refrigerant | optional |
| i3-94Ah | 125 | electric | NULL | i3 94 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 27.2 | 7.4 | 50 | active_refrigerant | optional |
| i3-120Ah | 125 | electric | NULL | i3 120 Ah, 125kW | NULL | NULL | 250 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 37.9 | 11 | 50 | active_refrigerant | optional |
| i3s-94Ah | 135 | electric | NULL | i3s 94 Ah, 135kW | NULL | NULL | 270 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 27.2 | 7.4 | 50 | active_refrigerant | optional |
| i3s-120Ah | 135 | electric | NULL | i3s 120 Ah, 135kW | NULL | NULL | 270 | NULL | NULL | NULL | NULL | NULL | false | false | false | NULL | 37.9 | 11 | 50 | active_refrigerant | optional |

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
| Atelier | 1 | Pre-facelift, Facelift | Front and side airbags, DSC, ISOFIX on the rear seats, Professional or Business navigation, automatic air conditioning, 19-inch alloy wheels. |
| Loft | 2 | Pre-facelift, Facelift | Grey cloth with recycled fibres, eucalyptus or carbon-look dashboard trim, LED headlights. |
| Lodge | 3 | Pre-facelift, Facelift | Leather / wool upholstery, open-pore eucalyptus dashboard, heated seats. |
| Suite | 4 | Facelift | Brown full-grain leather, eucalyptus wood trim, Harman Kardon audio. |
| i3s | 3 | Facelift | 135 kW motor, sport suspension (-10 mm), 20-inch alloy wheels, wider track, Sport driving mode. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | i3-60Ah | High-voltage electronics (EME) / charging-unit (KLE) failure — no charging or drive; expensive out of warranty. | critical | NULL |
| engine | i3-94Ah | 12 V battery and its charging fault messages; the car won't wake up. | minor | NULL |
| vehicle | Pre-facelift | Front suspension (lower arm bushes) knocks; steering rack noise. | minor | suspension |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_wltp_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_wltp_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | i3-60Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | i3-94Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | i3-94Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | i3s-94Ah@135kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | i3-120Ah@125kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 285 |
| Facelift | i3s-120Ah@135kW | generic:Single-speed EV | RWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 270 |
