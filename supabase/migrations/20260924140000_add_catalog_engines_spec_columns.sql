-- Adds engine spec columns to catalog_engines (torque, cylinder layout, emission
-- standard, timing drive, oil capacity, timing replacement interval).
--
-- All nullable: existing engine rows have no values yet, and NULL must read as
-- "unknown", never 0 or a guessed default. Purely additive — nothing is dropped or
-- rewritten; no backfill in this file.
--
-- timing_type uses a CHECK, not a Postgres enum: easier to alter later
-- (DROP/ADD CONSTRAINT) and matches this repo's frozen-vocabulary pattern.
-- cylinders and emission_standard stay free text ('L4', 'V6' / 'Euro 3', 'Euro 6d') —
-- open-ended labels, not a closed list worth freezing yet.
--
-- FOLLOW-UP, NOT DONE HERE: the existing engines were split BY EMISSION GENERATION
-- (AHF Euro 2 / ASV Euro 3, AGR / ALH, APK / AZH, AGP Euro 2 / AQM Euro 3) — i.e.
-- emission_standard is exactly the column that justifies those splits. Once these
-- columns exist, backfill emission_standard on those split engines to match their
-- split rationale (a separate reviewed UPDATE against existing rows; verify each
-- pair's real standard before writing it, don't infer from code order).
--
-- Schema change: review-only, NOT executed.

alter table catalog_engines
  add column torque_nm                  integer,
  add column cylinders                  text,
  add column emission_standard          text,
  add column timing_type                text,
  add column engine_oil_capacity_liters numeric,
  add column timing_replacement_km      integer;

alter table catalog_engines
  add constraint catalog_engines_timing_type_check
    check (timing_type in ('belt', 'chain', 'gear'));
