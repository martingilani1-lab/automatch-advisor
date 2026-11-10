# Intake — Suzuki Swift (FZ/NZ, 2010–2017)

> **Data-research instruction:** Act as a strict automotive data researcher. Accuracy is
> critical. DO NOT guess or infer any values. If you cannot find a verified, exact technical
> figure for a specific field (especially weights, dimensions, or exact charging speeds),
> output NULL. I prefer a NULL value that I can fill manually over a hallucinated number.

> **Which Swift:** "Swift III" read as the 2010–2017 FZ/NZ generation (the one in the 1 000–5 000 €
> band; European numbering counts the 1980s/90s Swift as I and the 2004 car as II). If Martin meant
> the 2017+ AZ, this doc is the wrong car — the AZ is 3★ Euro NCAP 2017 (83/75/69/25).
> **Reconcile (live, 2026-11-05):** brand `Suzuki` NOT live. Engines NEW. **No Suzuki gearbox
> exists live and the real codes are not confirmed** — all three are explicit `(code TBD)` placeholders
> that STOP by design. The 4x4 version (FL, viscous centre coupling) needs a new `drivetrain_systems`
> row — placeholder `suzuki_viscous_4wd` (STOPs). Sport (ZC32S) included as an engine of the same
> generation, 3- and 5-door. Prices / mileage NULL for Martin.

## A. CAR
| field | value |
|---|---|
| brand | Suzuki |
| brand_country | Japan |
| model | Swift |
| segment | B |
| origin_country | japanese |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | FZ |
| phase_label | Pre-facelift |
| year_from | 2010 |
| year_to | 2013 |
| display_name | Swift (FZ) Pre-facelift |
| platform_code | Suzuki B (FZ) |
| safety_rating | 5 |
| ncap_year | 2010 |
| ncap_adult_pct | NULL |
| ncap_child_pct | NULL |
| ncap_pedestrian_pct | NULL |
| ncap_safety_assist_pct | NULL |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| towing_capacity_kg | NULL |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

### Facelift
| field | value |
|---|---|
| generation_code | FZ |
| phase_label | Facelift |
| year_from | 2013 |
| year_to | 2017 |
| display_name | Swift (FZ) Facelift |
| platform_code | Suzuki B (FZ) |
| price_range_min_eur | NULL |
| avg_market_price_eur | NULL |
| price_range_max_eur | NULL |
| typical_mileage_range | NULL |
| resale_value_rating | holds_well |
| chassis_type | monocoque |
| consumption_cycle | NEDC |

INHERIT phase attributes FROM Suzuki Swift FZ Pre-facelift

*(Euro NCAP 2010: 5★ confirmed by Suzuki's press release; the four percentages are not in any source reached — NULL.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 3-door | 3850 | 1695 | 1510 | NULL | NULL | 211 | NULL | 5 | NULL | NULL | 42 | 2 | false |
| Pre-facelift | Hatchback 5-door | 3850 | 1695 | 1510 | NULL | NULL | 211 | NULL | 5 | NULL | NULL | 42 | 2 | false |

### Facelift
INHERIT dimensions FROM Suzuki Swift FZ Pre-facelift / Hatchback 3-door
INHERIT dimensions FROM Suzuki Swift FZ Pre-facelift / Hatchback 5-door

*(Swift Sport is 3890 mm long (bumpers) — a per-trim difference the body table can't hold; noted, not a separate body.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | injection_type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| K12B | 69 | petrol | NULL | 1.2 VVT 69kW | NULL | 1242 | 118 | L4 | Euro5 | chain | NULL | NULL | false | false | false | port |
| K12C | 66 | petrol | NULL | 1.2 DualJet 66kW | NULL | 1242 | 120 | L4 | Euro6 | chain | NULL | NULL | false | false | false | port |
| M16A | 100 | petrol | NULL | 1.6 VVT Sport 100kW | NULL | 1586 | 160 | L4 | Euro5 | chain | NULL | NULL | false | false | false | port |
| D13A | 55 | diesel | NULL | 1.3 DDiS 55kW (Fiat Multijet) | NULL | 1248 | 190 | L4 | Euro5 | chain | NULL | NULL | true | NULL | false | common_rail |

## E. GEARBOXES
| unit_code |
|---|
| Suzuki 5MT (code TBD) |
| Suzuki 4AT (code TBD) |
| Suzuki Sport 6MT (code TBD) |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |
| suzuki_viscous_4wd |

## G. CONFIG MATRIX

**Pre-facelift (2010 – 2013):**
- Pre-facelift: K12B 69kW + Suzuki 5MT (code TBD) / Suzuki 4AT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: D13A 55kW + Suzuki 5MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Pre-facelift: M16A 100kW + Suzuki Sport 6MT (code TBD) + FWD → [Hatchback 3-door]

**Facelift (2013 – 2017):**
- Facelift: K12B 69kW + Suzuki 5MT (code TBD) / Suzuki 4AT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: K12B 69kW + Suzuki 5MT (code TBD) + suzuki_viscous_4wd → [Hatchback 5-door]
- Facelift: K12C 66kW + Suzuki 5MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: D13A 55kW + Suzuki 5MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]
- Facelift: M16A 100kW + Suzuki Sport 6MT (code TBD) + FWD → [Hatchback 3-door, Hatchback 5-door]

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| GL | 1 | Pre-facelift, Facelift | Seven airbags including driver knee airbag, ESP, passenger airbag off switch, ISOFIX on the rear outer seats, manual air conditioning. |
| GLX | 2 | Pre-facelift, Facelift | 15-inch alloy wheels, keyless entry and start, automatic climate control, cruise control, fog lights. |
| Sport | 3 | Pre-facelift, Facelift | 1.6 VVT 100kW, 17-inch alloy wheels, HID headlights, sport seats, twin exhaust, stiffer suspension. |

## I. FAULTS
| component_type | target_code | fault | severity | category |
|---|---|---|---|---|
| engine | K12B | Timing chain noise / tensioner wear past ~150 000 km; generally very durable. | minor | NULL |
| engine | D13A | DPF clogging and EGR fouling in short-trip use; timing chain stretch on high-mileage Multijets. | moderate | NULL |
| engine | M16A | Oil consumption under hard driving — check level often. | minor | NULL |
| vehicle | Pre-facelift | Rust on rear wheel arches and the tailgate lower edge. | moderate | body_rust |
| vehicle | Pre-facelift | Rear shock absorber top mounts knock; short rear dampers wear fast on bad roads. | minor | suspension |

## J. CONFIG FACTS
*(Fill-in form: one row per configuration from section G — every real engine × gearbox × drivetrain × body. `NULL` = not known yet; replace with the figure. `consumption_cycle` NULL = the phase default from section B (NEDC / WLTP). `fuel_consumption_l100km` = official combined figure of the engine's own fuel; for EVs use `energy_consumption_kwh100km` + `ev_range_km`. `secondary_fuel_type` + `secondary_consumption_l100km` only for factory bi-fuel (LPG / CNG), both or neither. `towing_unbraked_kg` ≤ `towing_braked_kg`.)*

| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | secondary_fuel_type | secondary_consumption_l100km | fuel_consumption_urban_l100km | fuel_consumption_extra_urban_l100km | towing_braked_kg | towing_unbraked_kg | curb_weight_kg | acceleration_0_100 | top_speed_kmh | co2_emissions_g_km | ev_range_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | K12B@69kW | Suzuki 5MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | K12B@69kW | Suzuki 5MT (code TBD) | FWD | Hatchback 5-door | 5.0 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | K12B@69kW | Suzuki 4AT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | K12B@69kW | Suzuki 4AT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | D13A@55kW | Suzuki 5MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | D13A@55kW | Suzuki 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Pre-facelift | M16A@100kW | Suzuki Sport 6MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12B@69kW | Suzuki 5MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12B@69kW | Suzuki 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12B@69kW | Suzuki 4AT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12B@69kW | Suzuki 4AT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12B@69kW | Suzuki 5MT (code TBD) | suzuki_viscous_4wd | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12C@66kW | Suzuki 5MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | K12C@66kW | Suzuki 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | D13A@55kW | Suzuki 5MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | D13A@55kW | Suzuki 5MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | M16A@100kW | Suzuki Sport 6MT (code TBD) | FWD | Hatchback 3-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Facelift | M16A@100kW | Suzuki Sport 6MT (code TBD) | FWD | Hatchback 5-door | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
