-- Adds performance/efficiency and EV columns to catalog_vehicle_configurations.
-- These belong on the configuration (phase x body x engine x transmission x
-- drivetrain), not the phase or engine alone: 0-100 time, top speed, consumption and
-- CO2 all change with the gearbox/drivetrain pairing, and EV range/charging are
-- per-buildable-car figures.
--
-- All nullable: existing configs have no values yet, and NULL must read as "unknown",
-- never 0. The EV-prep columns (battery_capacity_net_kwh, ev_range_wltp_km,
-- max_charging_kw_dc) stay NULL for ICE configs and are only filled for EV/PHEV/
-- hybrid configs that actually have a battery.
--
-- Purely additive (ADD COLUMN only) — nothing dropped or rewritten, no backfill, no
-- CHECKs. The unique index on (phase, body, engine, transmission, drivetrain) is
-- unaffected.
--
-- Schema change: review-only, NOT executed.

alter table catalog_vehicle_configurations
  add column acceleration_0_100         numeric,
  add column top_speed_kmh              integer,
  add column fuel_consumption_combined  numeric,
  add column co2_emissions_g_km         integer,
  add column battery_capacity_net_kwh   numeric,
  add column ev_range_wltp_km           integer,
  add column max_charging_kw_dc         integer;
