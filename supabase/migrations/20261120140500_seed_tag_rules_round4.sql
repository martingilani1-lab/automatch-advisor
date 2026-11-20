-- Tag rules, round 4 (Martin, 2026-11-20). Same general rules as round 3
-- (20261120120000_seed_tag_rules_round3.sql): no tag on more than 25 % of configurations (the
-- NOTICE check at the end), NULL never tags or untags, no twin tags. Counts are the approved
-- preview (live 2026-11-20, 1 684 configurations, 94 phases), after this file + the clean-up file
-- 20261120141000 + the tier move 20261120140000.
--
-- This file now owns these rules; their old branches are REMOVED from the earlier rule files so a
-- re-run can't put back what the clean-up deletes:
--   winter_ready, ultra_efficient           <- were in 20261102233000
--   roadtrip_camper, representative,
--   stroller_friendly, head_turner (phase)  <- were in 20261103090000
--   sport                                   <- was in 20261120120000 (round 3)
--
-- CONFIGURATION level:
--   sport            [102, 6.1 %]  round-3 performance test, NON-hatchback body -- and NOT a sleeper:
--                                  sleeper wins (Martin). The sleeper test below is a copy of the
--                                  sleeper rule in 20261103090000 -- change both together.
--   winter_ready     [352, 20.9 %] an AWD system (drivetrain_id set) AND the body's
--                                  ground_clearance_mm >= 130. Unknown clearance keeps the AWD-only
--                                  behaviour (0 such configurations today). Drops the low A3 8L quattros.
--   roadtrip_camper  [236, 14.0 %] estate / Estate Cross / SUV / MPV with boot >= 600 l AND range
--                                  >= 700 km: tank (configuration, else the body's) / combined
--                                  l/100 km * 100; an EV needs WLTP (else stored) range >= 400 km.
--                                  Weighted PHEV / EREV figures are not a range -> never decides.
--                                  (22 configurations have no tank or consumption: undecidable.)
--                    CHANGED 2026-11-20 (Martin, from the Superb 3V liftback, 625 l): the boot decides,
--                    not the body -- boot >= 600 l on any body except 2- / 3-door ones (coupe, cabrio,
--                    roadster, 3-door hatch); the range test stays. 236 -> 265 (15.7 %): +29, all
--                    Superb 3V liftbacks; nothing removed.
--                    CHANGED again 2026-11-20 (Martin): label "Road trip" (slug unchanged), and the car
--                    must pull a full load -- power_kw / gross weight >= 45 kW per tonne AND torque_nm /
--                    gross weight >= 130 Nm per tonne (gross_vehicle_weight_kg of the body; unknown
--                    gross weight or torque = undecidable, 0 today). kW/t alone ranked a Superb 1.4 TSI
--                    (55) above a Passat 2.0 TDI (52); the torque line separates them. 265 -> 163
--                    (9.7 %): the 1.0-1.8 TSI, 1.5 eTSI and 1.6 TDI estates / SUVs / MPVs and the
--                    Caddy go (clean-up 20261120170000); the 2.0 TDI / 2.0 TSI cars stay.
--   ultra_efficient  [158, 9.4 %]  one threshold per test cycle: combustion NEDC <= 4.2, WLTP <= 5.0
--                                  l/100 km; electric NEDC <= 13, WLTP <= 15 kWh/100 km. Weighted
--                                  PHEV / EREV figures never count. consumption_cycle NULL = can't
--                                  decide (500 configurations today -- docs/STATUS.md data task).
--   head_turner      [105, 6.2 %]  now CONFIGURATION level (tier moved by 20261120140000): a coupe /
--                                  cabrio / roadster body, or a segment-S car. Inserted only once the
--                                  tier allows it, so this file is safe to run before the tier move.
-- MODEL level:
--   representative   [15 phases]   a premium brand (Audi, BMW, Mercedes-Benz, Volvo, Lexus, Jaguar)
--                                  in segment C or above with a sedan / liftback / estate / SUV body,
--                                  OR any brand in segment D / E / F with a sedan / liftback / estate
--                                  body. Never for an MPV or van. Adds A3 8V, A3 8Y, Q3 F3.
--   stroller_friendly [42 phases]  a body with boot >= 500 l that isn't a 2- or 3-door (coupe,
--                                  cabrio, roadster, 3-door hatch) AND, where known,
--                                  boot_sill_height_mm <= 750. (Golf 8 / Octavia 4: no boot figure.)
--
-- Unchanged, still in their own files: bulletproof_reliability (engine 5, gearbox >= 4, AWD >= 4 --
-- Martin kept it as it is, 90 configurations), green_zone, seven_seater, true_offroad, cargo_van,
-- isofix_3x. value_choice / value_retainer: no rule, hidden from UI filters (docs/STATUS.md).
--
-- Additive INSERT only, ON CONFLICT DO NOTHING -> re-runnable after every import. May run via the
-- Supabase MCP after Martin's review.

BEGIN;

-- ---- Configuration level -------------------------------------------------------------------
WITH c AS (
  SELECT vc.id, m.segment, b.name AS body, e.fuel_type AS fuel, coalesce(e.hybrid_type, '') AS hybrid,
         e.power_kw AS kw, coalesce(e.display_name, e.code) AS engine_name,
         vc.drivetrain_id, d.ground_clearance_mm AS clearance, d.boot_capacity_liters AS boot,
         coalesce(vc.fuel_tank_capacity_liters, d.fuel_tank_capacity_liters) AS tank,
         vc.fuel_consumption_l100km AS l100, vc.energy_consumption_kwh100km AS kwh100, vc.consumption_cycle AS cycle,
         coalesce(vc.ev_range_wltp_km, vc.ev_range_km) AS ev_range,
         coalesce(vc.curb_weight_kg, d.curb_weight_kg) AS curb, vc.acceleration_0_100 AS accel,
         e.torque_nm AS nm, d.gross_vehicle_weight_kg AS gross_kg,
         p.year_from, br.name AS brand, m.name AS model
  FROM public.catalog_vehicle_configurations vc
  JOIN public.catalog_engines e       ON e.id = vc.engine_id
  JOIN public.catalog_body_types b    ON b.id = vc.body_type_id
  JOIN public.catalog_phases p        ON p.id = vc.phase_id
  JOIN public.catalog_models m        ON m.id = p.model_id
  JOIN public.catalog_brands br       ON br.id = m.brand_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
),
c2 AS (
  SELECT c.*,
         hybrid IN ('PHEV', 'EREV') AS weighted,
         -- Road trip pulling power, per tonne of the body's gross weight (NULL if either is unknown)
         kw::numeric / nullif(gross_kg, 0) * 1000 AS kw_per_t,
         nm::numeric / nullif(gross_kg, 0) * 1000 AS nm_per_t,
         -- round-3 performance test (unchanged)
         CASE WHEN accel IS NOT NULL THEN accel <= (CASE WHEN fuel = 'electric' THEN 6.5 ELSE 7.5 END)
              WHEN curb IS NOT NULL AND kw > 0 THEN curb::numeric / kw <= 9
         END AS performance,
         (engine_name ~ '(^|\s)(GTI|GTD|RS|R|S[1-8]|RS[1-8]|TTS)(\s|$)'
          OR engine_name ~ 'TT RS'
          OR (brand = 'SEAT' AND model = 'León' AND year_from < 2018 AND engine_name ~ '(^|\s)Cupra(\s|$)')) AS badge,
         -- sleeper rule of 20261103090000 (keep in sync)
         (body IN ('Estate', 'Estate Cross', 'Liftback', 'Sedan 4-door') AND kw >= 180 AND segment <> 'S'
          AND engine_name !~ '(^|\s)(RS\d?|R|S\d)(\s|$)') AS is_sleeper,
         CASE WHEN hybrid IN ('PHEV', 'EREV') THEN NULL                          -- weighted: not a range
              WHEN fuel = 'electric' THEN ev_range
              WHEN tank IS NOT NULL AND l100 > 0 THEN tank / l100 * 100
         END AS range_km,
         CASE WHEN hybrid IN ('PHEV', 'EREV') THEN false
              WHEN fuel = 'electric' THEN CASE cycle WHEN 'NEDC' THEN kwh100 <= 13 WHEN 'WLTP' THEN kwh100 <= 15 END
              ELSE                        CASE cycle WHEN 'NEDC' THEN l100 <= 4.2  WHEN 'WLTP' THEN l100 <= 5.0  END
         END AS efficient                                                         -- NULL = cycle / figure unknown
  FROM c
)
INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT id, 'sport' FROM c2
 WHERE body NOT LIKE 'Hatchback%' AND coalesce(performance, badge) AND NOT is_sleeper
UNION ALL SELECT id, 'winter_ready' FROM c2
 WHERE drivetrain_id IS NOT NULL AND (clearance >= 130 OR clearance IS NULL)
UNION ALL SELECT id, 'roadtrip_camper' FROM c2                 -- boot decides, not body (2026-11-20)
 WHERE body NOT IN ('Coupe 2-door', 'Cabriolet 2-door', 'Roadster 2-door', 'Hatchback 3-door') AND boot >= 600
   AND range_km >= (CASE WHEN fuel = 'electric' THEN 400 ELSE 700 END)
   AND kw_per_t >= 45 AND nm_per_t >= 130                     -- loaded pulling power (2026-11-20)
UNION ALL SELECT id, 'ultra_efficient' FROM c2
 WHERE efficient
UNION ALL SELECT id, 'head_turner' FROM c2
 WHERE (body IN ('Coupe 2-door', 'Cabriolet 2-door', 'Roadster 2-door') OR segment = 'S')
   AND EXISTS (SELECT 1 FROM public.catalog_tags t WHERE t.slug = 'head_turner' AND t.tier <> 'model')
ON CONFLICT DO NOTHING;

-- ---- Model level ---------------------------------------------------------------------------
WITH pb AS (
  SELECT p.id, m.segment, br.name AS brand, b.name AS body,
         d.boot_capacity_liters AS boot, d.boot_sill_height_mm AS sill
  FROM public.catalog_phases p
  JOIN public.catalog_models m        ON m.id = p.model_id
  JOIN public.catalog_brands br       ON br.id = m.brand_id
  JOIN public.phase_body_dimensions d ON d.phase_id = p.id
  JOIN public.catalog_body_types b    ON b.id = d.body_type_id
)
INSERT INTO public.catalog_phase_tags (phase_id, tag_slug)
SELECT DISTINCT id, 'representative' FROM pb
 WHERE (brand IN ('Audi', 'BMW', 'Mercedes-Benz', 'Volvo', 'Lexus', 'Jaguar') AND segment IN ('C', 'D', 'E', 'F')
        AND body IN ('Sedan 4-door', 'Liftback', 'Estate', 'Estate Cross', 'SUV 5-door', 'SUV Coupe 5-door'))
    OR (segment IN ('D', 'E', 'F') AND body IN ('Sedan 4-door', 'Liftback', 'Estate', 'Estate Cross'))
UNION
SELECT DISTINCT id, 'stroller_friendly' FROM pb
 WHERE boot >= 500 AND body NOT IN ('Coupe 2-door', 'Cabriolet 2-door', 'Roadster 2-door', 'Hatchback 3-door')
   AND (sill <= 750 OR sill IS NULL)
ON CONFLICT DO NOTHING;

-- ---- Post-condition: coverage cap (NOTICE only, same check as round 3) ---------------------
DO $$
DECLARE total integer; r record; over text := '';
BEGIN
  SELECT count(*) INTO total FROM public.catalog_vehicle_configurations;
  FOR r IN SELECT tag_slug, count(*) AS n FROM public.catalog_configuration_tags GROUP BY tag_slug LOOP
    IF r.n > total * 0.25 THEN
      over := over || format(' %s %s/%s (%s %%);', r.tag_slug, r.n, total, round(100.0 * r.n / total, 1));
    END IF;
  END LOOP;
  IF over <> '' THEN
    RAISE NOTICE 'Tag coverage cap (25 %%) exceeded:%', over;
  ELSE
    RAISE NOTICE 'Tag coverage cap (25 %%): no tag above it (% configurations)', total;
  END IF;
END $$;

COMMIT;
