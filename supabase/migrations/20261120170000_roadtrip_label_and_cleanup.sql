-- roadtrip_camper: label "Road trip" + remove the rows the stricter rule no longer gives (Martin, 2026-11-20).
--
-- Why:
--   (1) Label. "Roadtrip/Camper" mixed two kinds of car. Camping now has its own tag (camper,
--       20261120170500, Multivan-type cars), so this one is just "Road trip". The slug stays
--       roadtrip_camper -- every rule file, the tier trigger and the app key on the slug. Mirrors
--       app/catalog/lib/tags.ts (TAG_DEFINITIONS), changed in the same commit.
--   (2) Rule. Road trip (20261120140500_seed_tag_rules_round4.sql) now also needs the car to pull a full
--       load: power_kw / gross weight >= 45 kW per tonne AND torque_nm / gross weight >= 130 Nm per
--       tonne (the body's gross_vehicle_weight_kg). 102 live rows fail it: the 1.0 - 1.8 TSI, 1.5 eTSI
--       and 1.6 TDI estates / SUVs / MPVs (Superb 3V / PY 1.4 - 1.8 TSI and 1.5 eTSI, Passat B8 1.4 /
--       1.5 / 1.8 TSI and 1.6 TDI, Tiguan AD1 1.4 / 1.5 TSI and 2.0 TDI 85 kW, Kodiaq NS7 1.4 / 1.5 TSI,
--       Touran, Golf 7 Variant 1.2 / 1.4 TSI and 1.6 TDI, Octavia 5E Combi 1.2 TSI and 1.6 TDI, all
--       Caddy ...). 163 stay (9.7 %).
--
-- NULL never untags: a row goes only when the gross weight, torque, power AND range are all known and
-- the car fails; unknown keeps the tag (0 such rows today).
--
-- UPDATE + DELETE: Martin runs this himself, in a FRESH SQL editor tab. One transaction, guarded; the
-- expected counts are the live state of 2026-11-20 after rounds 3 / 4 were re-run (rule 6b: if they
-- changed, re-check and rewrite this file rather than editing the guard).

BEGIN;

CREATE TEMP TABLE roadtrip_removals ON COMMIT DROP AS
WITH c AS (
  SELECT vc.id, e.fuel_type AS fuel, coalesce(e.hybrid_type, '') AS hybrid, e.power_kw AS kw, e.torque_nm AS nm,
         d.gross_vehicle_weight_kg AS gross_kg,
         coalesce(vc.fuel_tank_capacity_liters, d.fuel_tank_capacity_liters) AS tank,
         vc.fuel_consumption_l100km AS l100, coalesce(vc.ev_range_wltp_km, vc.ev_range_km) AS ev_range
  FROM public.catalog_vehicle_configurations vc
  JOIN public.catalog_engines e ON e.id = vc.engine_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
),
c2 AS (
  SELECT c.*,
         kw::numeric / nullif(gross_kg, 0) * 1000 AS kw_per_t,
         nm::numeric / nullif(gross_kg, 0) * 1000 AS nm_per_t,
         CASE WHEN hybrid IN ('PHEV', 'EREV') THEN NULL
              WHEN fuel = 'electric' THEN ev_range
              WHEN tank IS NOT NULL AND l100 > 0 THEN tank / l100 * 100
         END AS range_km
  FROM c
)
SELECT ct.configuration_id
FROM public.catalog_configuration_tags ct
JOIN c2 ON c2.id = ct.configuration_id
WHERE ct.tag_slug = 'roadtrip_camper'
  AND c2.kw_per_t IS NOT NULL AND c2.nm_per_t IS NOT NULL AND c2.range_km IS NOT NULL   -- all known
  AND NOT (c2.kw_per_t >= 45 AND c2.nm_per_t >= 130
           AND c2.range_km >= (CASE WHEN c2.fuel = 'electric' THEN 400 ELSE 700 END));

DO $$
DECLARE n integer; live integer;
BEGIN
  SELECT count(*) INTO live FROM public.catalog_configuration_tags WHERE tag_slug = 'roadtrip_camper';
  SELECT count(*) INTO n FROM roadtrip_removals;
  IF live <> 265 OR n <> 102 THEN
    RAISE EXCEPTION 'Expected 265 live roadtrip_camper rows and 102 to remove, found % and % -- re-check and rewrite this file. Rolled back', live, n;
  END IF;

  UPDATE public.catalog_tags SET label = 'Road trip' WHERE slug = 'roadtrip_camper' AND label = 'Roadtrip/Camper';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Label update touched % rows, expected 1 (label already changed?) -- rolled back', n; END IF;

  DELETE FROM public.catalog_configuration_tags ct
  USING roadtrip_removals r
  WHERE ct.configuration_id = r.configuration_id AND ct.tag_slug = 'roadtrip_camper';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 102 THEN RAISE EXCEPTION 'Deleted % rows, expected 102 -- rolled back', n; END IF;

  SELECT count(*) INTO live FROM public.catalog_configuration_tags WHERE tag_slug = 'roadtrip_camper';
  IF live <> 163 THEN RAISE EXCEPTION '% roadtrip_camper rows left, expected 163 -- rolled back', live; END IF;

  RAISE NOTICE 'roadtrip_camper labelled "Road trip"; 102 rows removed, 163 left';
END $$;

COMMIT;
