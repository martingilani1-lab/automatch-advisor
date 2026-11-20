-- Remove live tag rows that the round-4 rules no longer give (2026-11-20).
--
-- Why: 20261120140500_seed_tag_rules_round4.sql replaces these rules (their old branches are
-- removed from 20261102233000 / 20261103090000 / 20261120120000, so a re-run can't put the rows back):
--   sport            25 rows -- sleeper wins: every one of them is also a sleeper and keeps that tag
--                    (A4 Avant 2.0 TFSI 185 kW, Passat 2.0 TSI 200 kW, Arteon 2.0 TSI 200 kW, Superb 206 kW ...)
--   winter_ready     12 rows -- AWD but ground clearance < 130 mm (the A3 8L quattros)
--   roadtrip_camper   7 rows -- range < 700 km (Tiguan R, Tiguan CT 2.0 TSI 195 kW, Kodiaq RS,
--                    Golf R Variant, Cupra León ST 245 kW ...)
--   ultra_efficient  26 rows -- NEDC 4.3 - 4.5 l/100 km, above the new NEDC line of 4.2 (2.0 TDI
--                    A3 8V / León 5F / Octavia 5E / Golf 7)
-- Model level: nothing to remove (representative 10 -> 15, stroller_friendly 42 -> 42).
--
-- NULL never untags: a row is removed only where the deciding value is KNOWN and fails -- unknown
-- clearance, unknown tank / consumption, or an unknown consumption cycle keeps the tag.
--
-- DESTRUCTIVE -- Martin runs this himself, in a FRESH SQL editor tab. One transaction; the counts are
-- checked before and after and anything unexpected rolls the whole file back. Expected counts are
-- from the live preview of 2026-11-20: if the catalog changed since (rule 6b), re-check and rewrite
-- this file rather than editing the guard.

BEGIN;

CREATE TEMP TABLE tag_removals ON COMMIT DROP AS
WITH c AS (
  SELECT vc.id, m.segment, b.name AS body, e.fuel_type AS fuel, coalesce(e.hybrid_type, '') AS hybrid,
         e.power_kw AS kw, coalesce(e.display_name, e.code) AS engine_name,
         vc.drivetrain_id, d.ground_clearance_mm AS clearance, d.boot_capacity_liters AS boot,
         coalesce(vc.fuel_tank_capacity_liters, d.fuel_tank_capacity_liters) AS tank,
         vc.fuel_consumption_l100km AS l100, vc.energy_consumption_kwh100km AS kwh100, vc.consumption_cycle AS cycle,
         coalesce(vc.ev_range_wltp_km, vc.ev_range_km) AS ev_range
  FROM public.catalog_vehicle_configurations vc
  JOIN public.catalog_engines e       ON e.id = vc.engine_id
  JOIN public.catalog_body_types b    ON b.id = vc.body_type_id
  JOIN public.catalog_phases p        ON p.id = vc.phase_id
  JOIN public.catalog_models m        ON m.id = p.model_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
),
c2 AS (
  SELECT c.*,
         (body IN ('Estate', 'Estate Cross', 'Liftback', 'Sedan 4-door') AND kw >= 180 AND segment <> 'S'
          AND engine_name !~ '(^|\s)(RS\d?|R|S\d)(\s|$)') AS is_sleeper,
         CASE WHEN hybrid IN ('PHEV', 'EREV') THEN NULL
              WHEN fuel = 'electric' THEN ev_range
              WHEN tank IS NOT NULL AND l100 > 0 THEN tank / l100 * 100
         END AS range_km,
         CASE WHEN hybrid IN ('PHEV', 'EREV') THEN false
              WHEN fuel = 'electric' THEN CASE cycle WHEN 'NEDC' THEN kwh100 <= 13 WHEN 'WLTP' THEN kwh100 <= 15 END
              ELSE                        CASE cycle WHEN 'NEDC' THEN l100 <= 4.2  WHEN 'WLTP' THEN l100 <= 5.0  END
         END AS efficient
  FROM c
)
SELECT ct.configuration_id, ct.tag_slug
FROM public.catalog_configuration_tags ct
JOIN c2 ON c2.id = ct.configuration_id
WHERE (ct.tag_slug = 'sport'           AND c2.is_sleeper)
   OR (ct.tag_slug = 'winter_ready'    AND c2.clearance < 130)
   OR (ct.tag_slug = 'roadtrip_camper' AND c2.range_km < (CASE WHEN c2.fuel = 'electric' THEN 400 ELSE 700 END))
   OR (ct.tag_slug = 'ultra_efficient' AND c2.efficient IS FALSE);

DO $$
DECLARE n_sport integer; n_winter integer; n_road integer; n_ultra integer; n_deleted integer; overlap integer;
BEGIN
  SELECT count(*) FILTER (WHERE tag_slug = 'sport'),
         count(*) FILTER (WHERE tag_slug = 'winter_ready'),
         count(*) FILTER (WHERE tag_slug = 'roadtrip_camper'),
         count(*) FILTER (WHERE tag_slug = 'ultra_efficient')
    INTO n_sport, n_winter, n_road, n_ultra FROM tag_removals;
  IF n_sport <> 25 OR n_winter <> 12 OR n_road <> 7 OR n_ultra <> 26 THEN
    RAISE EXCEPTION 'Expected 25 sport + 12 winter_ready + 7 roadtrip_camper + 26 ultra_efficient rows, found % + % + % + % -- catalog changed since 2026-11-20, re-check and rewrite this file. Rolled back',
      n_sport, n_winter, n_road, n_ultra;
  END IF;

  DELETE FROM public.catalog_configuration_tags ct
  USING tag_removals r
  WHERE ct.configuration_id = r.configuration_id AND ct.tag_slug = r.tag_slug;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> 70 THEN
    RAISE EXCEPTION 'Deleted % rows, expected 70 -- rolled back', n_deleted;
  END IF;

  -- Verify: no configuration carries both sport and sleeper.
  SELECT count(*) INTO overlap
  FROM public.catalog_configuration_tags a
  JOIN public.catalog_configuration_tags b ON b.configuration_id = a.configuration_id
  WHERE a.tag_slug = 'sport' AND b.tag_slug = 'sleeper';
  IF overlap <> 0 THEN
    RAISE EXCEPTION '% configurations still carry both sport and sleeper -- rolled back', overlap;
  END IF;

  RAISE NOTICE 'Removed % sport + % winter_ready + % roadtrip_camper + % ultra_efficient rows', n_sport, n_winter, n_road, n_ultra;
END $$;

COMMIT;
