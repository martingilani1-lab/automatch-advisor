-- Remove city_commuter / highway_cruiser rows that the round-3 rules no longer give (2026-11-20).
--
-- Why: 20261120120000_seed_tag_rules_round3.sql replaces the two rules of
-- 20261103090000_seed_rule_based_tags.sql (whose branches for these two tags are removed from that
-- file, so a re-run can't put the rows back):
--   * city_commuter is now A / B segment only (body length <= 4 250 mm, petrol / LPG / CNG; EVs via
--     20261112140000). The old rule also tagged C-segment hatchbacks <= 81 kW -> 70 rows go
--     (Golf 5G 1.2 TSI, A3 8L 1.6, Golf IV 1.4 16V, León 5F 1.2 TSI ...). Accepted by Martin.
--   * comfort_cruiser takes precedence over highway_cruiser: a D / E / F automatic >= 110 kW gets only
--     comfort_cruiser -> 80 highway_cruiser rows go (A4 Avant 2.0 TDI 140 kW, Passat Variant 2.0 TDI
--     DSG, Superb 2.0 TDI DSG ...). Run 20261120120000 too, or these cars lose the cruiser tag
--     without getting comfort_cruiser.
--
-- NULL never untags: a city_commuter row whose body length is unknown, or a highway_cruiser row on
-- an EV with no range figure, is kept (0 such rows on 2026-11-20).
--
-- DESTRUCTIVE -- Martin runs this himself, in a FRESH SQL editor tab (CLAUDE.md rule 6). One
-- transaction; the counts are checked before and after the delete and anything unexpected rolls the
-- whole file back. The expected counts are from the live preview of 2026-11-20: if the catalog
-- changed since (rule 6b), re-check the counts and rewrite this file rather than editing the guard.

BEGIN;

CREATE TEMP TABLE tag_removals ON COMMIT DROP AS
WITH c AS (
  SELECT vc.id, m.segment, e.fuel_type AS fuel, e.power_kw AS kw, t.family AS gearbox_family,
         d.length_mm, coalesce(vc.ev_range_wltp_km, vc.ev_range_km) AS ev_range
  FROM public.catalog_vehicle_configurations vc
  JOIN public.catalog_engines e       ON e.id = vc.engine_id
  JOIN public.catalog_phases p        ON p.id = vc.phase_id
  JOIN public.catalog_models m        ON m.id = p.model_id
  JOIN public.transmission_units t    ON t.id = vc.unit_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
),
c2 AS (
  SELECT c.*,
         (segment IN ('D', 'E', 'F') AND gearbox_family <> 'manual' AND kw >= 110) AS is_comfort,
         -- the round-3 city rule (combustion) and the EV rule of 20261112140000
         ((segment IN ('A', 'B') AND length_mm <= 4250 AND fuel IN ('petrol', 'lpg', 'cng'))
          OR (fuel = 'electric' AND segment IN ('A', 'B'))) AS city_ok,
         (segment IN ('A', 'B') AND length_mm IS NULL AND fuel IN ('petrol', 'lpg', 'cng')) AS city_unknown
  FROM c
)
SELECT ct.configuration_id, ct.tag_slug
FROM public.catalog_configuration_tags ct
JOIN c2 ON c2.id = ct.configuration_id
WHERE (ct.tag_slug = 'city_commuter' AND NOT c2.city_ok AND NOT c2.city_unknown)
   OR (ct.tag_slug = 'highway_cruiser' AND c2.is_comfort);
-- (highway_cruiser rows that are not comfort-qualifying all still pass the round-3 rule: the old
-- rule -- diesel >= 100 kW, C / D, estate / liftback / sedan / SUV / MPV -- is a subset of it.)

DO $$
DECLARE n_city integer; n_hw integer; n_deleted integer; overlap integer;
BEGIN
  SELECT count(*) FILTER (WHERE tag_slug = 'city_commuter'),
         count(*) FILTER (WHERE tag_slug = 'highway_cruiser')
    INTO n_city, n_hw FROM tag_removals;
  IF n_city <> 70 OR n_hw <> 80 THEN
    RAISE EXCEPTION 'Expected 70 city_commuter + 80 highway_cruiser rows to remove, found % + % -- catalog changed since 2026-11-20, re-check and rewrite this file. Rolled back', n_city, n_hw;
  END IF;

  DELETE FROM public.catalog_configuration_tags ct
  USING tag_removals r
  WHERE ct.configuration_id = r.configuration_id AND ct.tag_slug = r.tag_slug;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> 150 THEN
    RAISE EXCEPTION 'Deleted % rows, expected 150 -- rolled back', n_deleted;
  END IF;

  -- Verify: no configuration carries both cruiser tags (trivially true if round 3 hasn't run yet;
  -- round 3 itself never gives highway_cruiser to a comfort-qualifying configuration).
  SELECT count(*) INTO overlap
  FROM public.catalog_configuration_tags a
  JOIN public.catalog_configuration_tags b ON b.configuration_id = a.configuration_id
  WHERE a.tag_slug = 'highway_cruiser' AND b.tag_slug = 'comfort_cruiser';
  IF overlap <> 0 THEN
    RAISE EXCEPTION '% configurations still carry both highway_cruiser and comfort_cruiser -- rolled back', overlap;
  END IF;

  RAISE NOTICE 'Removed % city_commuter + % highway_cruiser rows', n_city, n_hw;
END $$;

COMMIT;
