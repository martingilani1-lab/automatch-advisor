-- Consolidate catalog_transmissions into transmission_units: catalog_vehicle_configurations
-- and catalog_component_faults point directly at a real transmission_units row afterwards,
-- and the intermediate catalog_transmissions table (which only ever existed to hold a
-- catalog-local code/type/speeds triple, now fully covered by transmission_units + alt_codes)
-- is dropped. Depends on 20260930120000_add_alt_codes_to_transmission_units.sql having already
-- run -- this migration joins by transmission_units.code, which that migration is what makes
-- resolvable for all 12 units the catalog uses.
--
-- HARD RULE respected throughout: the legacy `transmissions` table (the flat, pre-catalog_
-- schema the live app currently reads) is NEVER touched by this file. Only catalog_transmissions
-- is consolidated and dropped.
--
-- Whole file is ONE transaction: if any verify step raises, everything rolls back, including
-- the earlier ALTERs/backfills in this same file. NOT run. Run in a fresh SQL editor tab, and
-- only after 20260930120000 has been applied.

BEGIN;

-- ============================================================================
-- STEP 1: point every catalog_transmissions row at its real unit (bridges the existing,
-- currently-all-NULL catalog_transmissions.unit_id column -- this column already existed,
-- just unpopulated).
-- ============================================================================
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW DQ200')             WHERE code = 'DQ200';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW DQ250')             WHERE code = 'DQ250';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW DQ250')             WHERE code = '02E';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW DQ381')             WHERE code = 'DQ381';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW MQ200')             WHERE code = 'MQ200';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW MQ250')             WHERE code = 'MQ250';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW MQ350')             WHERE code = 'MQ350';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW 02J')               WHERE code = '02J';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW 02K')               WHERE code = '02K';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW 02M')               WHERE code = '02M';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'VW 01M')               WHERE code = '01M';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'Jatco 09A (JF506E)')   WHERE code = '09A';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'Aisin 09G (TF-60SN)') WHERE code = '09G';
UPDATE catalog_transmissions SET unit_id = (SELECT id FROM transmission_units WHERE code = 'Aisin 09G (TF-60SN)') WHERE code = 'Aisin 09G';

DO $$
DECLARE
  unmapped_n integer;
BEGIN
  SELECT count(*) INTO unmapped_n FROM catalog_transmissions WHERE unit_id IS NULL;
  IF unmapped_n <> 0 THEN
    RAISE EXCEPTION 'Step 1 failed: % catalog_transmissions row(s) still have no unit_id.', unmapped_n;
  END IF;
END $$;

-- ============================================================================
-- STEP 1b (flagged addition, not one of the 4 requested items -- included because dropping
-- catalog_transmissions otherwise silently loses data): catalog_transmissions.speeds is
-- populated for MQ200/MQ250/MQ350/DQ250/DQ381/02E/09G/Aisin 09G, but most of those units'
-- transmission_units.speeds is still NULL (only VW DQ200 and the 6 brand-new units from the
-- prior migration have speeds set today). Backfill transmission_units.speeds from
-- catalog_transmissions wherever the unit doesn't have one yet, and first verify every
-- catalog_transmissions row mapped to the same unit agrees on speeds (it should, since the
-- mapping is by real gearbox identity) -- abort instead of guessing if two rows disagree.
-- ============================================================================
DO $$
DECLARE
  conflict_n integer;
BEGIN
  SELECT count(*) INTO conflict_n
  FROM (
    SELECT unit_id, count(DISTINCT speeds) AS distinct_speeds
    FROM catalog_transmissions
    WHERE speeds IS NOT NULL
    GROUP BY unit_id
    HAVING count(DISTINCT speeds) > 1
  ) x;
  IF conflict_n <> 0 THEN
    RAISE EXCEPTION 'Step 1b failed: % unit(s) have catalog_transmissions rows disagreeing on speeds.', conflict_n;
  END IF;
END $$;

UPDATE transmission_units tu
SET speeds = ct.speeds
FROM catalog_transmissions ct
WHERE ct.unit_id = tu.id
  AND tu.speeds IS NULL
  AND ct.speeds IS NOT NULL;

-- ============================================================================
-- STEP 2: catalog_vehicle_configurations -- add unit_id, backfill through the now-populated
-- catalog_transmissions.unit_id bridge, verify row count and per-unit counts are unchanged,
-- then drop the old transmission_id column/FK.
-- ============================================================================
ALTER TABLE catalog_vehicle_configurations ADD COLUMN unit_id uuid REFERENCES transmission_units(id);

UPDATE catalog_vehicle_configurations cvc
SET unit_id = ct.unit_id
FROM catalog_transmissions ct
WHERE ct.id = cvc.transmission_id;

DO $$
DECLARE
  total_before integer;
  total_after integer;
  mismatched_n integer;
BEGIN
  SELECT count(*) INTO total_before FROM catalog_vehicle_configurations;
  SELECT count(*) INTO total_after FROM catalog_vehicle_configurations WHERE unit_id IS NOT NULL;
  IF total_before <> total_after THEN
    RAISE EXCEPTION 'Step 2 failed: % configs total but only % got a unit_id.', total_before, total_after;
  END IF;

  -- Per-unit count must equal the sum of the catalog_transmissions rows that fed it (catches a
  -- join going to the wrong unit, not just a NULL).
  SELECT count(*) INTO mismatched_n
  FROM (
    SELECT cvc.unit_id, count(*) AS cvc_count
    FROM catalog_vehicle_configurations cvc
    GROUP BY cvc.unit_id
  ) a
  FULL JOIN (
    SELECT ct.unit_id, count(*) AS ct_config_count
    FROM catalog_transmissions ct
    JOIN catalog_vehicle_configurations cvc2 ON cvc2.transmission_id = ct.id
    GROUP BY ct.unit_id
  ) b ON a.unit_id = b.unit_id
  WHERE a.cvc_count IS DISTINCT FROM b.ct_config_count;
  IF mismatched_n <> 0 THEN
    RAISE EXCEPTION 'Step 2 failed: % unit(s) have a config-count mismatch after backfill.', mismatched_n;
  END IF;
END $$;

ALTER TABLE catalog_vehicle_configurations ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE catalog_vehicle_configurations DROP CONSTRAINT catalog_vehicle_configurations_transmission_id_fkey;
ALTER TABLE catalog_vehicle_configurations DROP COLUMN transmission_id;

-- ============================================================================
-- STEP 3: catalog_component_faults -- same shape. Only rows with component_type = 'transmission'
-- are touched (engine-fault rows have transmission_id NULL already, per the existing CHECK).
-- ============================================================================
ALTER TABLE catalog_component_faults ADD COLUMN unit_id uuid REFERENCES transmission_units(id);

UPDATE catalog_component_faults ccf
SET unit_id = ct.unit_id
FROM catalog_transmissions ct
WHERE ct.id = ccf.transmission_id
  AND ccf.component_type = 'transmission';

DO $$
DECLARE
  total_before integer;
  total_after integer;
BEGIN
  SELECT count(*) INTO total_before FROM catalog_component_faults WHERE component_type = 'transmission';
  SELECT count(*) INTO total_after FROM catalog_component_faults WHERE component_type = 'transmission' AND unit_id IS NOT NULL;
  IF total_before <> total_after THEN
    RAISE EXCEPTION 'Step 3 failed: % transmission fault rows total but only % got a unit_id.', total_before, total_after;
  END IF;
END $$;

-- Replace the transmission_id-based CHECK with the unit_id equivalent before dropping the column
-- (the old CHECK references transmission_id and would otherwise block the DROP COLUMN below).
ALTER TABLE catalog_component_faults DROP CONSTRAINT catalog_component_faults_check;
ALTER TABLE catalog_component_faults ADD CONSTRAINT catalog_component_faults_check
  CHECK (
    (component_type = 'engine' AND engine_id IS NOT NULL AND unit_id IS NULL)
    OR
    (component_type = 'transmission' AND unit_id IS NOT NULL AND engine_id IS NULL)
  );

ALTER TABLE catalog_component_faults DROP CONSTRAINT catalog_component_faults_transmission_id_fkey;
ALTER TABLE catalog_component_faults DROP COLUMN transmission_id;

-- ============================================================================
-- STEP 4: drop catalog_transmissions. If anything still references it (a spot this plan
-- missed), Postgres itself refuses the DROP and the whole transaction rolls back -- that's the
-- real verify here, not a hand-written count.
-- ============================================================================
DROP TABLE catalog_transmissions;

COMMIT;
