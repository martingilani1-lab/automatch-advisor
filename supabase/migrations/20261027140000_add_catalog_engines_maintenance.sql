-- Engine maintenance window for the Engines tab (Martin, 2026-10-27): service intervals and typical
-- costs per engine, the engine-side counterpart of the gearbox's maintenance note -- but structured,
-- so the page can show intervals/prices as numbers and the comparison can use them.
--
-- Per catalog_engines row (an engine CODE@kW). The same engine in different models costs roughly the
-- same to service (same parts, near-identical labour), so engine level is the right grain; a model
-- where it genuinely differs can say so in maintenance_note.
--
-- PRICE BASIS (all *_eur columns): EUR, parts + labour, independent workshop in SK/CZ, typical range
-- (min/max). Yearly cost assumes ~15,000 km/year, routine servicing only -- no tyres, no repairs.
-- Already existing and reused, not duplicated: timing_type, timing_replacement_km, engine_oil_capacity_liters.
-- NULL = not known yet (never invented). Spark plugs are NULL for diesels; fuel filter NULL for petrols.
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

ALTER TABLE catalog_engines
  ADD COLUMN oil_change_interval_km       integer  CHECK (oil_change_interval_km > 0),
  ADD COLUMN oil_change_interval_months   smallint CHECK (oil_change_interval_months > 0),
  ADD COLUMN oil_spec                     text,
  ADD COLUMN oil_service_cost_eur_min     integer  CHECK (oil_service_cost_eur_min > 0),
  ADD COLUMN oil_service_cost_eur_max     integer  CHECK (oil_service_cost_eur_max > 0),
  ADD COLUMN air_filter_interval_km       integer  CHECK (air_filter_interval_km > 0),
  ADD COLUMN fuel_filter_interval_km      integer  CHECK (fuel_filter_interval_km > 0),
  ADD COLUMN spark_plug_interval_km       integer  CHECK (spark_plug_interval_km > 0),
  ADD COLUMN spark_plug_cost_eur_min      integer  CHECK (spark_plug_cost_eur_min > 0),
  ADD COLUMN spark_plug_cost_eur_max      integer  CHECK (spark_plug_cost_eur_max > 0),
  ADD COLUMN timing_replacement_years     smallint CHECK (timing_replacement_years > 0),
  ADD COLUMN timing_service_cost_eur_min  integer  CHECK (timing_service_cost_eur_min > 0),
  ADD COLUMN timing_service_cost_eur_max  integer  CHECK (timing_service_cost_eur_max > 0),
  ADD COLUMN yearly_maintenance_eur_min   integer  CHECK (yearly_maintenance_eur_min > 0),
  ADD COLUMN yearly_maintenance_eur_max   integer  CHECK (yearly_maintenance_eur_max > 0),
  ADD COLUMN maintenance_note             text;

ALTER TABLE catalog_engines
  ADD CONSTRAINT catalog_engines_oil_cost_range_check     CHECK (oil_service_cost_eur_min <= oil_service_cost_eur_max),
  ADD CONSTRAINT catalog_engines_plug_cost_range_check    CHECK (spark_plug_cost_eur_min <= spark_plug_cost_eur_max),
  ADD CONSTRAINT catalog_engines_timing_cost_range_check  CHECK (timing_service_cost_eur_min <= timing_service_cost_eur_max),
  ADD CONSTRAINT catalog_engines_yearly_cost_range_check  CHECK (yearly_maintenance_eur_min <= yearly_maintenance_eur_max);

COMMIT;
