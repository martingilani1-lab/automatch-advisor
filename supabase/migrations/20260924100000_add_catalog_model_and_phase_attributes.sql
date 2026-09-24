-- Adds the per-car attribute columns from the old flat `vehicles` table to the
-- catalog_ schema, ahead of migrating/re-authoring that data per car.
--
-- Level choice (from the live vehicles inventory): segment and origin_country are
-- model-constant -> catalog_models. Safety/NCAP, dimensions, weight, boot, seats,
-- towing, prices, mileage and resale are generation-level in the old table (one row
-- per generation) -> catalog_phases, as phase-level REPRESENTATIVE values. They are
-- not per-body precise: per-body values (boot, length) are deliberately deferred.
--
-- NOT added, on purpose:
--   * body_type — already carried per configuration by
--     catalog_vehicle_configurations.body_type_id; a phase-level copy would duplicate
--     it and force one body onto phases that span several.
--   * trunk_opening_height_mm — 0/334 populated in the old table.
--   * equipment_trims — synthetic; superseded by catalog_trims/catalog_trim_features.
--
-- Every column is nullable: existing model/phase rows (Octavia I/II) have no values
-- yet, and NCAP/boot/towing nulls are legitimate for old or pickup cars. A missing
-- value must read as "unknown", never as 0.
--
-- Schema change: review-only, NOT executed. Purely additive (ADD COLUMN only) —
-- nothing is dropped or rewritten. ADD CONSTRAINT CHECKs pass on existing rows
-- because every new column is NULL there (NULL satisfies a CHECK).

alter table catalog_models
  add column segment        text,
  add column origin_country text;  -- lowercase ('german', not 'German'), matches ORIGIN_FLAGS

alter table catalog_phases
  add column safety_rating          integer,
  add column ncap_year              integer,
  add column ncap_adult_pct         integer,
  add column ncap_child_pct         integer,
  add column ncap_pedestrian_pct    integer,
  add column ncap_safety_assist_pct integer,
  add column length_mm              integer,
  add column width_mm               integer,
  add column height_mm              integer,
  add column curb_weight_kg         integer,
  add column ground_clearance_mm    integer,
  add column boot_capacity_liters   integer,
  add column boot_max_liters        integer,
  add column seats_count            integer,
  add column towing_capacity_kg     integer,
  add column avg_market_price_eur   integer,
  add column price_range_min_eur    integer,
  add column price_range_max_eur    integer,
  add column typical_mileage_range  text,   -- corrected spelling; old column is typical_milage_range
  add column resale_value_rating    text;

alter table catalog_phases
  add constraint catalog_phases_safety_rating_check
    check (safety_rating between 1 and 5),
  add constraint catalog_phases_ncap_adult_pct_check
    check (ncap_adult_pct between 0 and 100),
  add constraint catalog_phases_ncap_child_pct_check
    check (ncap_child_pct between 0 and 100),
  add constraint catalog_phases_ncap_pedestrian_pct_check
    check (ncap_pedestrian_pct between 0 and 100),
  add constraint catalog_phases_ncap_safety_assist_pct_check
    check (ncap_safety_assist_pct between 0 and 100),
  -- Frozen vocabulary: the only 3 values present in the old vehicles table.
  add constraint catalog_phases_resale_value_rating_check
    check (resale_value_rating in ('holds_well', 'average', 'depreciates_fast'));
