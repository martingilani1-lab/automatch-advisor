-- Fixes 6 malformed catalog_phases.typical_mileage_range values -- a mangled unit suffix
-- ("...220000000m km" -- an extra "000m" stuck on the end, Audi A4 B9) or a stray comma-
-- thousands/"k" shorthand that doesn't match the column's otherwise-consistent
-- "<min> - <max> km" convention (Škoda Octavia 1Z, Volkswagen Golf 5G).
--
-- Each row is matched by brand + model + generation_code + phase_label AND the exact
-- current (malformed) value, so a row only fires once and a value that's already been
-- fixed (or never had this problem) is never touched.
--
-- Confirmed live via direct query before writing this: these are the ONLY 6 rows (of 88
-- total, 85 non-null) across the entire table whose typical_mileage_range fails
-- '^\d+ ?- ?\d+ km$' -- the postcondition below re-checks this so the migration is
-- self-verifying, not just self-reported.
--
-- Review-only: NOT run by this session.

BEGIN;

DO $$
DECLARE
  updated_n integer := 0;
BEGIN
  UPDATE catalog_phases
  SET typical_mileage_range = '30000 - 120000 km'
  WHERE generation_code = 'B9' AND phase_label = 'Facelift'
    AND typical_mileage_range = '30000 - 120000000m km'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Audi' AND cm.name = 'A4'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Audi A4 B9 Facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET typical_mileage_range = '80000 - 220000 km'
  WHERE generation_code = 'B9' AND phase_label = 'Pre-facelift'
    AND typical_mileage_range = '80000 - 220000000m km'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Audi' AND cm.name = 'A4'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Audi A4 B9 Pre-facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET typical_mileage_range = '180000 - 320000 km'
  WHERE generation_code = '1Z' AND phase_label = 'Pre-facelift'
    AND typical_mileage_range = '180,000 - 320,000 km'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Škoda' AND cm.name = 'Octavia'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Škoda Octavia 1Z Pre-facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET typical_mileage_range = '180000 - 320000 km'
  WHERE generation_code = '1Z' AND phase_label = 'Facelift'
    AND typical_mileage_range = '180,000 - 320,000 km'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Škoda' AND cm.name = 'Octavia'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Škoda Octavia 1Z Facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET typical_mileage_range = '150000 - 300000 km'
  WHERE generation_code = '5G' AND phase_label = 'Pre-facelift'
    AND typical_mileage_range = '150k-300k'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Volkswagen' AND cm.name = 'Golf'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Volkswagen Golf 5G Pre-facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET typical_mileage_range = '80000 - 180000 km'
  WHERE generation_code = '5G' AND phase_label = 'Facelift'
    AND typical_mileage_range = '80k-180k'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Volkswagen' AND cm.name = 'Golf'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Volkswagen Golf 5G Facelift: expected 1 row updated, got %.', updated_n;
  END IF;
END $$;

-- Postcondition: every non-NULL typical_mileage_range in the whole table now matches the
-- "<digits> - <digits> km" shape (optional single space either side of the dash) -- 0 rows
-- should violate it. Self-verifying, not just a count of what this migration touched.
DO $$
DECLARE
  bad_n integer;
BEGIN
  SELECT count(*) INTO bad_n
  FROM catalog_phases
  WHERE typical_mileage_range IS NOT NULL
    AND typical_mileage_range !~ '^\d+ ?- ?\d+ km$';
  IF bad_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_phases rows with a malformed typical_mileage_range after this fix, found %.', bad_n;
  END IF;
END $$;

COMMIT;
