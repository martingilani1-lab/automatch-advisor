<!--
  BLANK INTAKE DOCUMENT — v2 draft (2026-11-10). Copy this file to docs/intake/<batch>/<brand>-<model>-<gen>.md
  and fill it. Full parser reference: scripts/new-car-template/INTAKE.md.

  Items marked [parser: v2] need the intake-parser upgrade proposed alongside this template
  (N/A token, VERIFY: prefix, `source` columns, section K). Until that ships, delete those
  columns / section K before running intake-to-template.mjs.
-->

# Intake — <Brand> <Model> (<generation_code>)

## 0. RULES FOR WHOEVER FILLS THIS IN (human or AI) — read before writing a single value

**R1 — Unknown is `NULL`.** Not a typical value, not "about", not the sibling model's figure, not
an average of two sources. A NULL is a correct answer; a plausible number is a defect that ships
to buyers. If you can't name where a number came from, it is `NULL`.

**R2 — Not applicable is `N/A`** [parser: v2] — a pure EV's `displacement_cc`, a petrol engine's
`has_adblue`… `N/A` is stored as NULL like `NULL`, but tells the completeness audit "nothing to
fill here" so it stops reporting it as a gap.

**R3 — Every non-NULL value needs a source.** Tables with a `source` column take source tags
(`S1`, `S2+S3`) defined in section K. One tag per row; a cell from a different source than the
rest of its row goes in the row note (`source` = `S1; weight S3`).

**R4 — No conversions, no derivations.** Never turn NEDC into WLTP, DIN weight into EU, gross
battery into net, PS into kW by rounding a different variant, or 0–100 from 0–60 mph. If the
source states the figure in another standard than the column asks for, the cell is `NULL` and
the figure goes in the row note.

**R5 — Sources that disagree → `NULL` + note**, unless one is the manufacturer's own document
(then it wins and the other is noted). Example: BMW i3 120 Ah consumption — two BMW pages
disagreed on the cycle, so it stayed NULL until Martin supplied the figure.

**R6 — Unsure but probably right → `VERIFY:` prefix** [parser: v2] (`VERIFY: 1340`). The parser
refuses to convert a document that still contains a `VERIFY:` cell, so nothing unconfirmed reaches
the database by accident.

**R7 — Codes are never guessed.** Engine codes, gearbox codes and drivetrain codes come from a
source that names them (service data, VIN decoder, manufacturer document). A "6-speed manual" is
not a gearbox code. Unknown code → `<Maker> <description> (code TBD)`; the parser STOPs on it,
which is the point.

**R8 — Vocabulary is closed.** Every field in section L's list takes only the values listed
there, spelled exactly. A value that seems to be missing is a schema question for Martin, never
a new spelling.

**R9 — Only factory configurations.** Section G lists combinations that left the factory, for
the market the car is sold in (SK / CZ unless stated). No "probably also available with".

**R10 — Engine content is engine-only.** Pros, cons and faults on an engine row never mention
the gearbox, clutch or AWD system (CLAUDE.md rule 9); a comparison ("more reliable than X") is
never a fault (rule 11).

## STANDARDS — what each measured value means (no column takes any other definition)

| field | standard | not this |
|---|---|---|
| `curb_weight_kg` | **EU mass in running order** (with 75 kg driver, 90 % fuel) — the figure in the CoC / EU price list | DIN / "dry" / "unladen" weight |
| `gross_vehicle_weight_kg`, `payload_kg` | Manufacturer's homologated values | payload computed by you |
| `boot_capacity_liters` | **VDA**, rear seats up, to the parcel shelf / window line | "to the roof", or the seats-slid-forward maximum |
| `boot_max_liters` | **VDA**, rear seats folded, to the roof | |
| `ground_clearance_mm` | Manufacturer figure, unladen | measured at a different load |
| `length_mm` / `width_mm` / `height_mm` | Width **without mirrors**, height without roof rails unless standard | |
| `power_kw` | Manufacturer kW. **Hybrid: SYSTEM output** (the advertised figure), combustion engine's own output in `display_name` | PS converted by you |
| `torque_nm` | Combustion engine (ICE) / motor (EV) | system torque of a hybrid |
| `battery_capacity_net_kwh` | **Net / usable** capacity | gross / nominal (goes in the note) |
| `max_ac_charging_kw` | Highest on-board charger **offered** for that variant (option included) | the wallbox's rating |
| `max_dc_charging_kw` | **Peak** DC power | average / 10–80 % figure |
| consumption, CO₂, `ev_range_km` | The row's `consumption_cycle` (NEDC or WLTP) — **all of a row's figures on one cycle**; the other cycle's figures go in the note | mixing cycles on one row |
| `acceleration_0_100` | 0–100 km/h, manufacturer | 0–60 mph |
| `towing_braked_kg` | Braked trailer, 12 % gradient (EU homologation) | 8 % gradient figures |
| NCAP `%` | Only for tests from **2009 on** (four-box protocol). Pre-2009 tests: stars only, `%` = `N/A` | percentages from a different test year |
| `typical_mileage_range` | Your market data, `<N> - <M> km` | |
| prices `*_eur` | Your SK / CZ market data | new-car list prices |

## A. CAR
| field | value |
|---|---|
| brand | |
| brand_country | |
| model | |
| segment | |
| origin_country | |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | |
| phase_label | Pre-facelift |
| year_from | |
| year_to | |
| display_name | |
| platform_code | |
| safety_rating | |
| ncap_year | |
| ncap_adult_pct | |
| ncap_child_pct | |
| ncap_pedestrian_pct | |
| ncap_safety_assist_pct | |
| price_range_min_eur | |
| avg_market_price_eur | |
| price_range_max_eur | |
| typical_mileage_range | |
| resale_value_rating | |
| towing_capacity_kg | |
| chassis_type | |
| consumption_cycle | |
| source | |

### Facelift
| field | value |
|---|---|
| generation_code | |
| phase_label | Facelift |
| year_from | |
| year_to | |
| display_name | |
| platform_code | |
| price_range_min_eur | |
| avg_market_price_eur | |
| price_range_max_eur | |
| typical_mileage_range | |
| resale_value_rating | |
| chassis_type | |
| consumption_cycle | |
| source | |

INHERIT phase attributes FROM <Brand> <Model> <generation_code> Pre-facelift

*(`safety_rating` 0 = tested and failed (0★); `NULL` = never tested. Prices, mileage and resale never inherit.)*

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | seats_optional_max | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger | boot_sill_height_mm | roof_load_kg | nose_weight_kg | source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | | | | | | | | | | | | | | | | | | | |

### Facelift
INHERIT dimensions FROM <Brand> <Model> <generation_code> Pre-facelift / <body_type>

*(`curb_weight_kg` here = the lightest version of that body; per-configuration weight goes in J. EV / no tank → `fuel_tank_capacity_liters` `N/A`. Off-road columns (`approach_angle_deg`, `departure_angle_deg`, `breakover_angle_deg`, `wading_depth_mm`) only for cars that publish them.)*

## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | injection_type | engine_oil_capacity_liters | timing_replacement_km | has_dpf | has_gpf | has_adblue | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump | distinct_reason | source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | | | | | |

REUSE <code>@<power_kw>kW

*(Diesel: `has_dpf` and `has_adblue` are REQUIRED (`true` / `false`). Petrol: `has_dpf` / `has_adblue` = `false`, `has_gpf` only when known. EV: every combustion column `N/A`; one row per motor × battery variant, battery variant in the code when one motor sat on several batteries (`i3-94Ah`). Same code at two powers = two rows.)*

## E. GEARBOXES
| unit_code |
|---|
| |

*(Live `transmission_units` codes only — new unit = its own reviewed migration first.)*

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |

*(`FWD` / `RWD` sentinels, or a live `drivetrain_systems` code.)*

## G. CONFIG MATRIX

**Pre-facelift (<year_from> – <year_to>):**
- Pre-facelift: <code> <power>kW + <gearbox>[ / <gearbox>] + <drivetrain> → [<body>, <body>]

**Facelift (<year_from> – <year_to>):**
INHERIT configs FROM <Brand> <Model> <generation_code> Pre-facelift

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| | | | |

*(Standard equipment only, comma-separated. An option sold on every trim (heat pump, Professional navigation) is not a trim — list it in the trim note.)*

## I. FAULTS
| component_type | target_code | fault | severity | category | source |
|---|---|---|---|---|---|
| | | | | | |

*(`engine` target = `CODE` or `CODE@kW`; `gearbox` = unit code; `drivetrain` = system code; `vehicle` = this document's phase label + a required `category`. A fault is a concrete defect with its symptom — never a comparison, never a design trait ("harsh ride" is a con).)*

## J. CONFIG FACTS
| phase | engine | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | ev_range_km | co2_emissions_g_km | curb_weight_kg | acceleration_0_100 | top_speed_kmh | towing_braked_kg | towing_unbraked_kg | secondary_fuel_type | secondary_consumption_l100km | source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | |

*(One row per section-G configuration. All of a row's consumption / CO₂ / range figures are on its one `consumption_cycle`.)*

## K. SOURCES [parser: v2]
| tag | source | covers |
|---|---|---|
| S1 | | |

*(Manufacturer price list / technical data / CoC first; Euro NCAP datasheet for NCAP; independent databases (auto-data.net, ultimatespecs) only for what the manufacturer doesn't publish. Two pages from the same database are ONE source. `M` = Martin's own figure.)*

## L. ALLOWED VALUES (generated from scripts/catalog-vocabularies.json + live reference tables, 2026-11-10 — do not edit by hand)

| field | allowed values |
|---|---|
| segment | A, B, C, D, E, F, J, M, S |
| origin_country | lowercase adjective: german, czech, spanish, french, italian, japanese, korean, swedish, british, american, chinese, romanian |
| resale_value_rating | holds_well, average, depreciates_fast |
| chassis_type | monocoque, ladder_frame |
| consumption_cycle | NEDC, WLTP |
| body_type | Cabriolet 2-door, Coupe 2-door, Estate, Estate Cross, Hatchback 3-door, Hatchback 5-door, Hatchback Cross, Liftback, MPV 5-door, Roadster 2-door, Sedan 4-door, SUV 5-door, SUV Coupe 5-door |
| fuel_type | petrol, diesel, electric, lpg, cng |
| hybrid_type | MHEV, HEV, PHEV (or NULL) |
| cylinders | L2, L3, L4, L5, L6, V5, VR5, VR6, V6, V8, V10, V12, W12, B4, B6 |
| emission_standard | Euro1 … Euro6, Euro6c, Euro6d, Euro6e (no space) |
| timing_type | belt, chain, gear |
| injection_type | port, direct, dual, common_rail, pump_injector, distributor_pump |
| battery_thermal_management | active_liquid, active_air, active_refrigerant, passive |
| heat_pump | standard, optional, none |
| has_dpf / has_gpf / has_adblue / isofix_front_passenger | true, false |
| gearbox family (reference rows) | manual, amt, torque_converter, cvt, power_split, dct_dry, dct_wet, dct, single_speed |
| drivetrain type (reference rows) | haldex, torsen, permanent, on_demand, dual_motor, part_time |
| secondary_fuel_type | petrol, lpg, cng |
| fault severity | critical, moderate, minor |
| fault category (vehicle faults only) | electrical, body_rust, suspension, steering, brakes, climate, interior |
