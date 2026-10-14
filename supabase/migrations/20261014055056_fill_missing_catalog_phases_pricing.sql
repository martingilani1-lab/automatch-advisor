-- NULL-only fill of avg_market_price_eur/price_range_min_eur/price_range_max_eur/
-- typical_mileage_range for 3 catalog_phases rows that had all 4 columns NULL -- confirmed
-- live via direct query before writing this (Škoda Octavia NX Pre-facelift and both
-- Volkswagen Golf CD1 phases). COALESCE-guarded (never overwrites a non-NULL value), same
-- convention as every other NULL-only fill in this pipeline.
--
-- Each row is matched by brand + model + generation_code + phase_label, same discipline as
-- the sibling typical_mileage_range fix migration (20261014055031).
--
-- Review-only: NOT run by this session.

BEGIN;

DO $$
DECLARE
  updated_n integer := 0;
BEGIN
  UPDATE catalog_phases
  SET
    avg_market_price_eur = COALESCE(avg_market_price_eur, 18500),
    price_range_min_eur = COALESCE(price_range_min_eur, 13000),
    price_range_max_eur = COALESCE(price_range_max_eur, 28000),
    typical_mileage_range = COALESCE(typical_mileage_range, '60000 - 180000 km')
  WHERE generation_code = 'NX' AND phase_label = 'Pre-facelift'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Škoda' AND cm.name = 'Octavia'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Škoda Octavia NX Pre-facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET
    avg_market_price_eur = COALESCE(avg_market_price_eur, 19000),
    price_range_min_eur = COALESCE(price_range_min_eur, 14000),
    price_range_max_eur = COALESCE(price_range_max_eur, 29000),
    typical_mileage_range = COALESCE(typical_mileage_range, '50000 - 150000 km')
  WHERE generation_code = 'CD1' AND phase_label = 'Pre-facelift'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Volkswagen' AND cm.name = 'Golf'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Volkswagen Golf CD1 Pre-facelift: expected 1 row updated, got %.', updated_n;
  END IF;

  UPDATE catalog_phases
  SET
    avg_market_price_eur = COALESCE(avg_market_price_eur, 28000),
    price_range_min_eur = COALESCE(price_range_min_eur, 23000),
    price_range_max_eur = COALESCE(price_range_max_eur, 45000),
    typical_mileage_range = COALESCE(typical_mileage_range, '10000 - 50000 km')
  WHERE generation_code = 'CD1' AND phase_label = 'Facelift'
    AND model_id = (
      SELECT cm.id FROM catalog_models cm JOIN catalog_brands cb ON cb.id = cm.brand_id
      WHERE cb.name = 'Volkswagen' AND cm.name = 'Golf'
    );
  GET DIAGNOSTICS updated_n = ROW_COUNT;
  IF updated_n <> 1 THEN
    RAISE EXCEPTION 'Volkswagen Golf CD1 Facelift: expected 1 row updated, got %.', updated_n;
  END IF;
END $$;

-- Postcondition: all 3 target rows now have all 4 columns filled, and still match the same
-- typical_mileage_range shape the sibling fix migration enforces table-wide.
DO $$
DECLARE
  filled_n integer;
  bad_shape_n integer;
BEGIN
  SELECT count(*) INTO filled_n
  FROM catalog_phases cp
  JOIN catalog_models cm ON cm.id = cp.model_id
  JOIN catalog_brands cb ON cb.id = cm.brand_id
  WHERE (cb.name = 'Škoda' AND cm.name = 'Octavia' AND cp.generation_code = 'NX' AND cp.phase_label = 'Pre-facelift')
     OR (cb.name = 'Volkswagen' AND cm.name = 'Golf' AND cp.generation_code = 'CD1' AND cp.phase_label IN ('Pre-facelift', 'Facelift'))
  AND cp.avg_market_price_eur IS NOT NULL
  AND cp.price_range_min_eur IS NOT NULL
  AND cp.price_range_max_eur IS NOT NULL
  AND cp.typical_mileage_range IS NOT NULL;
  IF filled_n <> 3 THEN
    RAISE EXCEPTION 'Expected all 3 target rows fully filled, found %.', filled_n;
  END IF;

  SELECT count(*) INTO bad_shape_n
  FROM catalog_phases
  WHERE typical_mileage_range IS NOT NULL
    AND typical_mileage_range !~ '^\d+ ?- ?\d+ km$';
  IF bad_shape_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_phases rows with a malformed typical_mileage_range, found %.', bad_shape_n;
  END IF;
END $$;

COMMIT;
