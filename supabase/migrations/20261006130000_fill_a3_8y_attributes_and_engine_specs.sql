-- Fills real source data for Audi A3 (8Y)'s phase attributes, dimensions, and 11
-- MQB Evo engine spec rows -- the "attributes + engine specs pending" gap flagged in
-- docs/STATUS.md's A3 8Y open item. Every value below was supplied by Martin after
-- sourcing (not fabricated -- rule 7 is satisfied by HAVING real data now, not by
-- leaving it NULL forever).
--
-- DEVIATIONS FROM THE LITERAL REQUEST, both confirmed against live state before writing:
--
-- 1. catalog_engines.cylinders is TEXT (confirmed live:
--    information_schema.columns), not integer -- and every one of the ~111 other
--    non-NULL cylinders values in this table already uses the 'L3'/'L4'/'L5'/'V6'/'VR6'
--    layout-code convention (confirmed live: SELECT DISTINCT cylinders). The request
--    asked for cylinders stored as a bare integer (4, 3). Writing 'L4'/'L3' instead,
--    matching the live column type and the 100%-consistent existing convention, rather
--    than introducing the only bare-integer values in the column. Flagging this instead
--    of silently complying with a premise that doesn't match live reality.
-- 2. Sedan 4-door boot_max_liters is left NULL on purpose (per the explicit instruction
--    this migration was written against), which supersedes an earlier boot_max_liters=425
--    figure that had been floated for the sedan body -- there's no real seats-folded
--    figure for a 4-door sedan boot (it isn't a liftback/hatch), so NULL is the honest
--    value here, not a gap.
--
-- Every UPDATE uses `col = coalesce(col, <value>)` -- fills only where the column is
-- currently NULL, never overwrites anything already set. Two columns in the request were
-- skipped entirely because they're already correctly non-NULL live, not because they
-- were missed: `catalog_engines.DLAA@81kW.torque_nm` (already 200) and
-- `catalog_engines.DNPA@150kW.emission_standard` (already 'Euro6e') -- confirmed live
-- before writing this file, consistent with the request's own per-engine field lists
-- (neither of those two fields appears in this request's DLAA/DNPA@150 lists).
--
-- Guarded: a precondition DO block asserts the exact count of currently-NULL target
-- cells (106 = 22 phases + 30 dimensions + 54 engines, matching the three figures in the
-- request) before touching anything; a postcondition DO block asserts all 106 of those
-- same cells are non-NULL afterward. One transaction -- any mismatch rolls back
-- everything.
--
-- UPDATE of existing hand-authored data: file-only, human-run, NOT executed here.

BEGIN;

-- ============================================================================
-- PRECONDITION: exactly 106 target cells are NULL right now (22 + 30 + 54).
-- ============================================================================
DO $$
DECLARE
  phases_null_n integer;
  dims_null_n integer;
  engines_null_n integer;
  engines_row_n integer;
BEGIN
  SELECT sum(
    (avg_market_price_eur is null)::int + (ncap_adult_pct is null)::int + (ncap_child_pct is null)::int +
    (ncap_pedestrian_pct is null)::int + (ncap_safety_assist_pct is null)::int + (ncap_year is null)::int +
    (price_range_min_eur is null)::int + (price_range_max_eur is null)::int + (resale_value_rating is null)::int +
    (towing_capacity_kg is null)::int + (typical_mileage_range is null)::int
  ) INTO phases_null_n
  FROM catalog_phases
  WHERE id IN ('59a996de-0e11-419d-b1fe-5d1d9668b823', '830ac70d-f68c-4416-8561-5a2ffe291b4e');
  IF phases_null_n <> 22 THEN
    RAISE EXCEPTION 'Expected 22 NULL phase-attribute cells for A3 8Y, found % -- aborting, live state has drifted from what this migration assumes.', phases_null_n;
  END IF;

  SELECT
    (SELECT sum(
      (boot_capacity_liters is null)::int + (boot_max_liters is null)::int + (curb_weight_kg is null)::int +
      (fuel_tank_capacity_liters is null)::int + (gross_vehicle_weight_kg is null)::int + (ground_clearance_mm is null)::int +
      (payload_kg is null)::int + (seats_count is null)::int
    ) FROM phase_body_dimensions WHERE id IN ('65b1393a-08ad-43f5-a6da-24f684a3dbaf', '6cc4973d-51dc-45d2-9491-7a19a6ee7f7f'))
    +
    (SELECT sum(
      (boot_capacity_liters is null)::int + (curb_weight_kg is null)::int +
      (fuel_tank_capacity_liters is null)::int + (gross_vehicle_weight_kg is null)::int + (ground_clearance_mm is null)::int +
      (payload_kg is null)::int + (seats_count is null)::int
    ) FROM phase_body_dimensions WHERE id IN ('ea8b392b-0a4c-49aa-8f2b-a738bcb3ec06', '15a4c1ff-ea67-49f9-9830-ea18c2b03ac3'))
  INTO dims_null_n;
  IF dims_null_n <> 30 THEN
    RAISE EXCEPTION 'Expected 30 NULL dimension cells for A3 8Y, found % -- aborting.', dims_null_n;
  END IF;

  SELECT count(*), sum(
    CASE
      WHEN code = 'DFYA' AND power_kw = 110 THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DGEA' AND power_kw = 110 THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DKZA' AND power_kw = 150 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DLAA' AND power_kw = 81  THEN (cylinders is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int
      WHEN code = 'DLAB' AND power_kw = 81  THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFB' AND power_kw = 245 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFC' AND power_kw = 228 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFC' AND power_kw = 245 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNPA' AND power_kw = 150 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNPA' AND power_kw = 195 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNWC' AND power_kw = 294 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
    END
  ) INTO engines_row_n, engines_null_n
  FROM catalog_engines
  WHERE (code, power_kw) IN (
    ('DFYA',110), ('DGEA',110), ('DKZA',150), ('DLAA',81), ('DLAB',81),
    ('DNFB',245), ('DNFC',228), ('DNFC',245), ('DNPA',150), ('DNPA',195), ('DNWC',294)
  );
  IF engines_row_n <> 11 THEN
    RAISE EXCEPTION 'Expected exactly 11 catalog_engines rows to match, found % -- aborting (duplicate or missing (code, power_kw)).', engines_row_n;
  END IF;
  IF engines_null_n <> 54 THEN
    RAISE EXCEPTION 'Expected 54 NULL engine-spec cells for these 11 engines, found % -- aborting.', engines_null_n;
  END IF;
END $$;

-- ============================================================================
-- PHASES (22 cells: 11 columns x 2 phases). year_to is untouched -- Facelift's is
-- genuinely still NULL (still in current production), not part of this fill.
-- ============================================================================
UPDATE catalog_phases SET
  avg_market_price_eur   = coalesce(avg_market_price_eur, 25000),
  ncap_adult_pct          = coalesce(ncap_adult_pct, 89),
  ncap_child_pct          = coalesce(ncap_child_pct, 81),
  ncap_pedestrian_pct     = coalesce(ncap_pedestrian_pct, 68),
  ncap_safety_assist_pct  = coalesce(ncap_safety_assist_pct, 73),
  ncap_year               = coalesce(ncap_year, 2020),
  price_range_min_eur     = coalesce(price_range_min_eur, 18000),
  price_range_max_eur     = coalesce(price_range_max_eur, 35000),
  resale_value_rating     = coalesce(resale_value_rating, 'holds_well'),
  towing_capacity_kg      = coalesce(towing_capacity_kg, 1500),
  typical_mileage_range   = coalesce(typical_mileage_range, '40000 - 120000 km')
WHERE id = '59a996de-0e11-419d-b1fe-5d1d9668b823'; -- Pre-facelift

UPDATE catalog_phases SET
  avg_market_price_eur   = coalesce(avg_market_price_eur, 35000),
  ncap_adult_pct          = coalesce(ncap_adult_pct, 89),
  ncap_child_pct          = coalesce(ncap_child_pct, 81),
  ncap_pedestrian_pct     = coalesce(ncap_pedestrian_pct, 68),
  ncap_safety_assist_pct  = coalesce(ncap_safety_assist_pct, 73),
  ncap_year               = coalesce(ncap_year, 2020),
  price_range_min_eur     = coalesce(price_range_min_eur, 28000),
  price_range_max_eur     = coalesce(price_range_max_eur, 50000),
  resale_value_rating     = coalesce(resale_value_rating, 'holds_well'),
  towing_capacity_kg      = coalesce(towing_capacity_kg, 1500),
  typical_mileage_range   = coalesce(typical_mileage_range, '10000 - 40000 km')
WHERE id = '830ac70d-f68c-4416-8561-5a2ffe291b4e'; -- Facelift

-- ============================================================================
-- DIMENSIONS (30 cells: Hatchback 8 cols x 2 phases = 16, Sedan 7 cols x 2 phases = 14).
-- Sedan's boot_max_liters stays NULL on purpose (no seats-folded figure for a sedan).
-- ============================================================================
UPDATE phase_body_dimensions SET
  boot_capacity_liters        = coalesce(boot_capacity_liters, 380),
  boot_max_liters              = coalesce(boot_max_liters, 1200),
  curb_weight_kg                = coalesce(curb_weight_kg, 1280),
  fuel_tank_capacity_liters      = coalesce(fuel_tank_capacity_liters, 50),
  gross_vehicle_weight_kg        = coalesce(gross_vehicle_weight_kg, 1835),
  ground_clearance_mm            = coalesce(ground_clearance_mm, 140),
  payload_kg                      = coalesce(payload_kg, 555),
  seats_count                      = coalesce(seats_count, 5)
WHERE id IN ('65b1393a-08ad-43f5-a6da-24f684a3dbaf', '6cc4973d-51dc-45d2-9491-7a19a6ee7f7f'); -- Hatchback 5-door, both phases

UPDATE phase_body_dimensions SET
  boot_capacity_liters        = coalesce(boot_capacity_liters, 425),
  curb_weight_kg                = coalesce(curb_weight_kg, 1285),
  fuel_tank_capacity_liters      = coalesce(fuel_tank_capacity_liters, 50),
  gross_vehicle_weight_kg        = coalesce(gross_vehicle_weight_kg, 1840),
  ground_clearance_mm            = coalesce(ground_clearance_mm, 140),
  payload_kg                      = coalesce(payload_kg, 555),
  seats_count                      = coalesce(seats_count, 5)
WHERE id IN ('ea8b392b-0a4c-49aa-8f2b-a738bcb3ec06', '15a4c1ff-ea67-49f9-9830-ea18c2b03ac3'); -- Sedan 4-door, both phases

-- ============================================================================
-- ENGINES (54 cells across 11 (code, power_kw) rows). cylinders written as 'L3'/'L4'
-- (text, matching the live column type and every other row's convention -- see header).
-- ============================================================================
UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 4.3),
  timing_replacement_km       = coalesce(timing_replacement_km, 120000),
  timing_type                  = coalesce(timing_type, 'belt'),
  torque_nm                     = coalesce(torque_nm, 250)
WHERE code = 'DFYA' AND power_kw = 110;

UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 4.0),
  timing_replacement_km       = coalesce(timing_replacement_km, 120000),
  timing_type                  = coalesce(timing_type, 'belt'),
  torque_nm                     = coalesce(torque_nm, 250)
WHERE code = 'DGEA' AND power_kw = 110;

UPDATE catalog_engines SET
  cylinders                   = coalesce(cylinders, 'L4'),
  displacement_cc               = coalesce(displacement_cc, 1984),
  display_name                   = coalesce(display_name, '2.0 TSI 150kW'),
  emission_standard                = coalesce(emission_standard, 'Euro 6d'),
  engine_oil_capacity_liters          = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                           = coalesce(timing_type, 'chain'),
  torque_nm                               = coalesce(torque_nm, 320)
  -- hybrid_type and timing_replacement_km untouched: target is NULL, already NULL live.
WHERE code = 'DKZA' AND power_kw = 150;

UPDATE catalog_engines SET
  cylinders                   = coalesce(cylinders, 'L3'),
  display_name                   = coalesce(display_name, '1.0 TSI 81kW'),
  emission_standard                = coalesce(emission_standard, 'Euro 6d'),
  engine_oil_capacity_liters          = coalesce(engine_oil_capacity_liters, 4.0),
  timing_replacement_km                 = coalesce(timing_replacement_km, 120000),
  timing_type                              = coalesce(timing_type, 'belt')
  -- hybrid_type untouched: target NULL, already NULL live. torque_nm untouched: already
  -- 200 live, not part of this request's field list for DLAA.
WHERE code = 'DLAA' AND power_kw = 81;

UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 4.0),
  timing_replacement_km       = coalesce(timing_replacement_km, 120000),
  timing_type                  = coalesce(timing_type, 'belt'),
  torque_nm                     = coalesce(torque_nm, 200)
WHERE code = 'DLAB' AND power_kw = 81;

UPDATE catalog_engines SET
  cylinders                   = coalesce(cylinders, 'L4'),
  displacement_cc               = coalesce(displacement_cc, 1984),
  display_name                   = coalesce(display_name, '2.0 TSI 245kW'),
  emission_standard                = coalesce(emission_standard, 'Euro 6d'),
  engine_oil_capacity_liters          = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                           = coalesce(timing_type, 'chain'),
  torque_nm                               = coalesce(torque_nm, 420)
WHERE code = 'DNFB' AND power_kw = 245;

UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                  = coalesce(timing_type, 'chain'),
  torque_nm                     = coalesce(torque_nm, 400)
WHERE code = 'DNFC' AND power_kw = 228;

UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                  = coalesce(timing_type, 'chain'),
  torque_nm                     = coalesce(torque_nm, 420)
WHERE code = 'DNFC' AND power_kw = 245;

UPDATE catalog_engines SET
  cylinders                   = coalesce(cylinders, 'L4'),
  displacement_cc               = coalesce(displacement_cc, 1984),
  display_name                   = coalesce(display_name, '2.0 TSI 150kW'),
  engine_oil_capacity_liters        = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                         = coalesce(timing_type, 'chain'),
  torque_nm                             = coalesce(torque_nm, 320)
  -- emission_standard untouched: already 'Euro6e' live, not part of this request's
  -- field list for DNPA@150kW.
WHERE code = 'DNPA' AND power_kw = 150;

UPDATE catalog_engines SET
  cylinders                   = coalesce(cylinders, 'L4'),
  displacement_cc               = coalesce(displacement_cc, 1984),
  display_name                   = coalesce(display_name, '2.0 TSI 195kW'),
  emission_standard                = coalesce(emission_standard, 'Euro 6d'),
  engine_oil_capacity_liters          = coalesce(engine_oil_capacity_liters, 5.7),
  timing_type                           = coalesce(timing_type, 'chain'),
  torque_nm                               = coalesce(torque_nm, 400)
WHERE code = 'DNPA' AND power_kw = 195;

UPDATE catalog_engines SET
  engine_oil_capacity_liters = coalesce(engine_oil_capacity_liters, 7.1),
  timing_type                  = coalesce(timing_type, 'chain'),
  torque_nm                     = coalesce(torque_nm, 500)
WHERE code = 'DNWC' AND power_kw = 294;

-- ============================================================================
-- POSTCONDITION: all 106 target cells are now non-NULL (same shape as the precondition,
-- asserting 0 remaining NULLs instead of 106).
-- ============================================================================
DO $$
DECLARE
  phases_null_n integer;
  dims_null_n integer;
  engines_null_n integer;
BEGIN
  SELECT sum(
    (avg_market_price_eur is null)::int + (ncap_adult_pct is null)::int + (ncap_child_pct is null)::int +
    (ncap_pedestrian_pct is null)::int + (ncap_safety_assist_pct is null)::int + (ncap_year is null)::int +
    (price_range_min_eur is null)::int + (price_range_max_eur is null)::int + (resale_value_rating is null)::int +
    (towing_capacity_kg is null)::int + (typical_mileage_range is null)::int
  ) INTO phases_null_n
  FROM catalog_phases
  WHERE id IN ('59a996de-0e11-419d-b1fe-5d1d9668b823', '830ac70d-f68c-4416-8561-5a2ffe291b4e');
  IF phases_null_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 NULL phase-attribute cells for A3 8Y after update, found %.', phases_null_n;
  END IF;

  SELECT
    (SELECT sum(
      (boot_capacity_liters is null)::int + (boot_max_liters is null)::int + (curb_weight_kg is null)::int +
      (fuel_tank_capacity_liters is null)::int + (gross_vehicle_weight_kg is null)::int + (ground_clearance_mm is null)::int +
      (payload_kg is null)::int + (seats_count is null)::int
    ) FROM phase_body_dimensions WHERE id IN ('65b1393a-08ad-43f5-a6da-24f684a3dbaf', '6cc4973d-51dc-45d2-9491-7a19a6ee7f7f'))
    +
    (SELECT sum(
      (boot_capacity_liters is null)::int + (curb_weight_kg is null)::int +
      (fuel_tank_capacity_liters is null)::int + (gross_vehicle_weight_kg is null)::int + (ground_clearance_mm is null)::int +
      (payload_kg is null)::int + (seats_count is null)::int
    ) FROM phase_body_dimensions WHERE id IN ('ea8b392b-0a4c-49aa-8f2b-a738bcb3ec06', '15a4c1ff-ea67-49f9-9830-ea18c2b03ac3'))
  INTO dims_null_n;
  IF dims_null_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 NULL dimension cells for A3 8Y after update, found %.', dims_null_n;
  END IF;

  SELECT sum(
    CASE
      WHEN code = 'DFYA' AND power_kw = 110 THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DGEA' AND power_kw = 110 THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DKZA' AND power_kw = 150 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DLAA' AND power_kw = 81  THEN (cylinders is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int
      WHEN code = 'DLAB' AND power_kw = 81  THEN (engine_oil_capacity_liters is null)::int + (timing_replacement_km is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFB' AND power_kw = 245 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFC' AND power_kw = 228 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNFC' AND power_kw = 245 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNPA' AND power_kw = 150 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNPA' AND power_kw = 195 THEN (cylinders is null)::int + (displacement_cc is null)::int + (display_name is null)::int + (emission_standard is null)::int + (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
      WHEN code = 'DNWC' AND power_kw = 294 THEN (engine_oil_capacity_liters is null)::int + (timing_type is null)::int + (torque_nm is null)::int
    END
  ) INTO engines_null_n
  FROM catalog_engines
  WHERE (code, power_kw) IN (
    ('DFYA',110), ('DGEA',110), ('DKZA',150), ('DLAA',81), ('DLAB',81),
    ('DNFB',245), ('DNFC',228), ('DNFC',245), ('DNPA',150), ('DNPA',195), ('DNWC',294)
  );
  IF engines_null_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 NULL engine-spec cells for these 11 engines after update, found %.', engines_null_n;
  END IF;
END $$;

COMMIT;
