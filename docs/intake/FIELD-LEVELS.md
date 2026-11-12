<!-- GENERATED from scripts/catalog-field-levels.json by scripts/render-field-levels.mjs -- do not edit by hand. -->

# Field levels for a catalog import

Version 2026-11-12. Which fields an intake must fill before a seed is generated. The research
passes are described in [RESEARCH-PROCESS.md](RESEARCH-PROCESS.md).

| level | meaning |
|---|---|
| **required** | No seed while empty. Not findable → Martin supplies it (source `M`) or approves an exception with a reason (intake section M). Never a reason to guess. |
| **conditional** | Required only when the condition holds; otherwise the intake writes `N/A`. |
| optional | Filled when a source has it; `NULL` is fine. |

## Phase

Table: `catalog_phases`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `generation_code` | **required** |  | 1 identity |  |
| `year_from`, `year_to` | **required** |  | 1 identity | year_to N/A while the phase is still in production |
| `platform_code` | **required** |  | 1 identity |  |
| `chassis_type` | **required** |  | 1 identity |  |
| `consumption_cycle` | **required** |  | 1 identity | template-only default cycle for the phase, not a DB column |
| `safety_rating`, `ncap_year` | **required** |  | 3 safety + equipment | safety_rating 0 = tested and failed (0 stars); never tested by Euro NCAP = N/A for both |
| `ncap_adult_pct`, `ncap_child_pct`, `ncap_pedestrian_pct`, `ncap_safety_assist_pct` | **conditional** | Euro NCAP test from 2009 on (four-box protocol) | 3 safety + equipment |  |
| `price_range_min_eur`, `avg_market_price_eur`, `price_range_max_eur` | **required** |  | 5 market | No seed without market research (Martin, 2026-11-12) |
| `typical_mileage_range` | **required** |  | 5 market | No seed without market research (Martin, 2026-11-12) |
| `resale_value_rating` | **required** |  | 5 market |  |
| `towing_capacity_kg` | **required** |  | 2 technical | 0 = the manufacturer does not permit towing (a fact); NULL = unknown. See RESEARCH-PROCESS.md, towing. |

## Body

Table: `phase_body_dimensions`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `length_mm`, `width_mm`, `height_mm` | **required** |  | 2 technical |  |
| `curb_weight_kg` | **required** |  | 2 technical | lightest version of that body; per-configuration weight goes in section J |
| `gross_vehicle_weight_kg`, `payload_kg` | **required** |  | 2 technical |  |
| `boot_capacity_liters`, `boot_max_liters` | **required** |  | 2 technical |  |
| `seats_count` | **required** |  | 2 technical |  |
| `isofix_count`, `isofix_front_passenger` | **required** |  | 3 safety + equipment |  |
| `fuel_tank_capacity_liters` | **conditional** | not a pure EV | 2 technical |  |
| `boot_sill_height_mm` | **conditional** | Estate, Estate Cross, SUV or MPV body | 2 technical |  |
| `seats_optional_max`, `boot_capacity_7_seats_liters` | **conditional** | a 7-seat option was sold | 2 technical |  |
| `approach_angle_deg`, `departure_angle_deg`, `breakover_angle_deg`, `wading_depth_mm` | **conditional** | off-road category car | 2 technical |  |
| `ground_clearance_mm` | optional |  | 2 technical |  |
| `roof_load_kg`, `nose_weight_kg` | optional |  | 2 technical |  |

## Engine - specification

Table: `catalog_engines`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `code`, `power_kw`, `fuel_type`, `display_name`, `torque_nm` | **required** |  | 2 technical |  |
| `displacement_cc`, `cylinders`, `emission_standard` | **conditional** | combustion engine | 2 technical |  |
| `timing_type`, `injection_type`, `engine_oil_capacity_liters` | **conditional** | combustion engine | 2 technical |  |
| `hybrid_type` | **conditional** | MHEV, HEV or PHEV | 2 technical |  |
| `has_dpf`, `has_adblue` | **conditional** | diesel | 2 technical |  |
| `battery_capacity_net_kwh`, `max_ac_charging_kw`, `max_dc_charging_kw`, `battery_thermal_management`, `heat_pump` | **conditional** | EV or PHEV (max_dc_charging_kw: only where DC charging was offered) | 2 technical |  |
| `has_gpf` | optional |  | 2 technical |  |
| `alt_codes` | optional |  | 2 technical |  |

## Engine - service

Table: `catalog_engines`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `reliability_rating` | **required** |  | 4 reliability + service | with a one-line reason; a rating of 3 or lower needs a listed fault |
| `yearly_maintenance_eur_min`, `yearly_maintenance_eur_max` | **required** |  | 4 reliability + service | SK / CZ independent garage; Martin's own figure (source M) is valid |
| `pros`, `cons` | **required** |  | 4 reliability + service | engine only, never gearbox or AWD (CLAUDE.md rule 9) |
| `maintenance_note` | **required** |  | 4 reliability + service | EV: brake fluid, cabin filter, coolant, 12 V battery |
| `oil_change_interval_km`, `oil_change_interval_months`, `oil_spec` | **conditional** | combustion engine | 4 reliability + service |  |
| `timing_replacement_km`, `timing_replacement_years` | **conditional** | combustion engine with a timing belt | 4 reliability + service |  |
| `oil_service_cost_eur_min`, `oil_service_cost_eur_max`, `timing_service_cost_eur_min`, `timing_service_cost_eur_max` | optional |  | 4 reliability + service |  |
| `air_filter_interval_km`, `fuel_filter_interval_km`, `spark_plug_interval_km`, `spark_plug_cost_eur_min`, `spark_plug_cost_eur_max` | optional |  | 4 reliability + service |  |

## Gearbox

Table: `transmission_units` — shared reference data: a change applies to every car using the row, and is its own reviewed migration.

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `family`, `speeds` | **required** |  | 1 identity |  |
| `maker` | **required** |  | 1 identity | in-house EV reduction gear with no named supplier: exception allowed (BMW i3, 2026-11-12) |
| `reliability_rating` | **required** |  | 4 reliability + service |  |
| `reliability_note`, `maintenance_note` | **required** |  | 4 reliability + service |  |
| `pros`, `cons` | **required** |  | 4 reliability + service |  |
| `service_interval_km`, `service_interval_years`, `service_cost_eur_min`, `service_cost_eur_max` | **conditional** | automatic gearbox (DCT, torque converter, CVT, AMT); 'filled for life' is written in maintenance_note and the interval is N/A | 4 reliability + service |  |
| `faults` | optional |  | 4 reliability + service |  |

## AWD system

Table: `drivetrain_systems` — shared reference data: a change applies to every car using the row, and is its own reviewed migration.

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `reliability_rating` | **required** |  | 4 reliability + service |  |
| `description` | **required** |  | 1 identity |  |
| `service_interval_km` | **conditional** | the system has a serviceable coupling or transfer case (Haldex, Torsen, transfer box) | 4 reliability + service |  |
| `service_cost_eur_min`, `service_cost_eur_max` | optional |  | 4 reliability + service |  |

## Configuration

Table: `catalog_vehicle_configurations`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| fuel_consumption_l100km or energy_consumption_kwh100km, `consumption_cycle` | **required** |  | 2 technical |  |
| `acceleration_0_100`, `top_speed_kmh` | **required** |  | 2 technical |  |
| `curb_weight_kg` | **required** |  | 2 technical |  |
| `ev_range_km` | **conditional** | EV or PHEV | 2 technical |  |
| `co2_emissions_g_km` | **conditional** | combustion engine or PHEV | 2 technical |  |
| `towing_braked_kg`, `towing_unbraked_kg` | **conditional** | the phase permits towing (towing_capacity_kg > 0) | 2 technical |  |
| `secondary_fuel_type`, `secondary_consumption_l100km` | **conditional** | factory LPG / CNG bi-fuel | 2 technical |  |
| `fuel_consumption_urban_l100km`, `fuel_consumption_extra_urban_l100km` | optional |  | 2 technical | WLTP does not publish these in this form |
| tire sizes | optional |  | 2 technical |  |

## Trims

Table: `catalog_trims / catalog_trim_features`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| at least 1 trim per phase | **required** |  | 3 safety + equipment |  |
| feature_group on every feature | **required** |  | 3 safety + equipment |  |
| `safety_feature_slug` | **conditional** | the feature is one of the safety_features vocabulary | 3 safety + equipment |  |

## Faults

Table: `catalog_component_faults`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| at least 1 vehicle fault per phase | **required** |  | 4 reliability + service |  |
| `estimated_cost_eur_min`, `estimated_cost_eur_max`, `probability` | **required** |  | 4 reliability + service | on every fault: the cost calculator's repair buffer reads them. Forum-level figures are acceptable (Martin, 2026-11-12); Martin's own figure = source M. A fixed recall: N/A |
| engine fault | **conditional** | engine reliability_rating <= 3 | 4 reliability + service |  |
| gearbox fault | **conditional** | gearbox reliability_rating <= 3 | 4 reliability + service |  |

## Tags

Table: `catalog_phase_tags / catalog_configuration_tags`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| rule-based tags | **required** |  | derived | re-run every tag-rule migration after the seed (all are ON CONFLICT DO NOTHING); see RESEARCH-PROCESS.md, tags |
| judgement tags | optional |  | 4 reliability + service |  |

## Media

Table: `catalog_media`

| field(s) | level | when | pass | note |
|---|---|---|---|---|
| `photos` | optional |  | later | deferred: licensing, separate step |
