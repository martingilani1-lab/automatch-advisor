-- Tag rules, round 3 (Martin, 2026-11-20). Review: docs/tags-review-2026-11-20.md and the preview
-- tables in that session (counts below are the approved preview, live 2026-11-20, 1 684
-- configurations).
--
-- Why: 41 % of configurations had no configuration tag, and six tags had never been set -- not for
-- lack of cars, but because no rule assigned them. This file adds rules for them and replaces the
-- city_commuter / highway_cruiser rules of 20261103090000 (those two branches are removed from that
-- file, so re-running it can't put back what 20261120120500 deletes).
--
-- General rules (Martin):
--   * Coverage cap: no tag on more than 25 % of all configurations. The post-condition at the end
--     raises a NOTICE (not an error) naming every tag above it, so an import that pushes a tag over
--     the cap shows up whenever the rule files are re-run.
--   * NULL is not "no": a missing value never tags a configuration (a NULL comparison simply
--     doesn't match). The guarded DELETE file never untags on a NULL either.
--   * A configuration tag is decided by configuration-level facts -- the one known exception is
--     heavy_tower (phase towing), marked TEMPORARY below.
--
-- The two cruiser tags, explicitly:
--   highway_cruiser = an efficient long-distance car: comfortable at motorway speed with fuel or
--                     range to spare (C / D / E segment, a strong diesel, a strong petrol automatic,
--                     or an EV with >= 350 km).
--   comfort_cruiser = premium comfort: a D / E / F car with an automatic and >= 110 kW. It TAKES
--                     PRECEDENCE: a configuration that qualifies gets only comfort_cruiser, never
--                     both (overlap 0 in the preview).
--
-- CONFIGURATION level (catalog_configuration_tags), after this file + the DELETE file:
--   city_commuter    [133,  7.9 %]  segment A / B AND the body's length_mm <= 4 250 AND petrol / LPG /
--                                   CNG (hybrids count: fuel_type stays petrol). No kW cap. Diesel
--                                   never (DPF + short trips). The EV branch stays in
--                                   20261112140000 (every A / B electric) -- unchanged.
--   highway_cruiser  [412, 24.5 %]  segment C / D / E, NOT comfort-qualifying, AND (diesel >= 100 kW,
--                                   OR petrol / hybrid >= 125 kW with an automatic, OR electric with
--                                   WLTP (else stored) range >= 350 km).
--   comfort_cruiser  [154,  9.1 %]  segment D / E / F AND automatic (any gearbox family but 'manual')
--                                   AND >= 110 kW.
--                    CHANGED 2026-11-20 (Martin, from the Superb 3V 1.4 TSI 110 kW): a dry dual-clutch
--                    (family 'dct_dry', e.g. DQ200) doesn't count -> 142 (8.4 %); the 12 removed rows
--                    go via 20261120160000. 4 D-segment 1.8 TSI DQ200 cars then fall into
--                    highway_cruiser's petrol-automatic branch (412 -> 416, 24.7 %).
--   hot_hatch        [ 65,  3.9 %]  a hatchback that passes the performance test below, petrol or
--                                   electric only (no diesel: the GTD isn't a hot hatch). Adds to the
--                                   kW rule of 20261103090000, which stays.
--   sport            [127,  7.5 %]  every NON-hatchback body that passes the performance test.
--                                   (SUPERSEDED 2026-11-20 by round 4 -- sleeper wins; branch removed.)
--                                   sport and hot_hatch never overlap: a qualifying hatchback gets
--                                   hot_hatch, everything else gets sport.
--     performance test: 0-100 km/h <= 7.5 s (electric <= 6.5 s) where the configuration has it;
--     else power-to-weight <= 9 kg/kW (configuration curb weight, else the body's); only when BOTH
--     are unknown does a badge decide, from an explicit list of variant names: GTI, GTD, RS, R,
--     S1-S8, RS1-RS8, TTS, TT RS, and the pre-2018 SEAT León Cupra. Never a substring "S", never the
--     Cupra brand. (Golf 8 / Octavia 4 have neither figure today: 30 sport + 10 hot_hatch can't be
--     decided -- docs/STATUS.md open item.)
--   drivers_choice   [124,  7.4 %]  manual gearbox + petrol >= 110 kW in a hatchback, coupe, roadster
--                                   or cabrio.
--   heavy_tower      [182, 10.8 %]  TEMPORARY -- phase towing_capacity_kg >= 1 800 AND engine torque
--                                   >= 340 Nm, and NOT a dry dual-clutch gearbox. Uses a phase value
--                                   for a configuration tag because per-configuration towing
--                                   (towing_braked_kg) is still empty; replace with that column once
--                                   it's filled. (63 configurations with no phase towing can't be
--                                   decided.)
--   workhorse        [217, 12.9 %]  diesel, engine AND gearbox reliability >= 4, estate / Estate
--                                   Cross / liftback / MPV / SUV body with boot >= 500 l.
-- MODEL level (catalog_phase_tags):
--   family_ideal     [+1 phase]     NEW branch: the phase has an MPV body AND (safety_rating >= 4 OR
--                                   that body's isofix_count >= 2). Today that adds the Multivan T7;
--                                   Touran and Caddy already have it. The boot + NCAP-child branch of
--                                   20261103090000 stays.
--
-- NOT rule-tagged: value_choice (rejected, see docs/STATUS.md), value_retainer (resale rating too
-- coarse).
--
-- Additive INSERT only, ON CONFLICT DO NOTHING -> re-runnable after every import, like the other
-- tag-rule files (docs/intake/RESEARCH-PROCESS.md, "Tags"). The tier trigger still guards model vs.
-- configuration level. May run via the Supabase MCP after Martin's review.

BEGIN;

-- ---- Configuration level -------------------------------------------------------------------
WITH c AS (
  SELECT vc.id, m.segment, b.name AS body, e.fuel_type AS fuel, e.power_kw AS kw, e.torque_nm AS nm,
         coalesce(e.display_name, e.code) AS engine_name, e.reliability_rating AS engine_rel,
         t.reliability_rating AS gearbox_rel, t.family AS gearbox_family,
         p.towing_capacity_kg AS phase_towing, p.year_from, d.length_mm, d.boot_capacity_liters AS boot,
         coalesce(vc.curb_weight_kg, d.curb_weight_kg) AS curb, vc.acceleration_0_100 AS accel,
         coalesce(vc.ev_range_wltp_km, vc.ev_range_km) AS ev_range,
         br.name AS brand, m.name AS model
  FROM public.catalog_vehicle_configurations vc
  JOIN public.catalog_engines e       ON e.id = vc.engine_id
  JOIN public.catalog_body_types b    ON b.id = vc.body_type_id
  JOIN public.catalog_phases p        ON p.id = vc.phase_id
  JOIN public.catalog_models m        ON m.id = p.model_id
  JOIN public.catalog_brands br       ON br.id = m.brand_id
  JOIN public.transmission_units t    ON t.id = vc.unit_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
),
c2 AS (
  SELECT c.*,
         (engine_name ~ '(^|\s)(GTI|GTD|RS|R|S[1-8]|RS[1-8]|TTS)(\s|$)'
          OR engine_name ~ 'TT RS'
          OR (brand = 'SEAT' AND model = 'León' AND year_from < 2018 AND engine_name ~ '(^|\s)Cupra(\s|$)')) AS badge,
         CASE WHEN accel IS NOT NULL THEN accel <= (CASE WHEN fuel = 'electric' THEN 6.5 ELSE 7.5 END)
              WHEN curb IS NOT NULL AND kw > 0 THEN curb::numeric / kw <= 9
         END AS performance,                       -- NULL = unknown, decided by the badge only
         -- dry DCT (DQ200, rated 2) excluded 2026-11-20 (Martin), as in heavy_tower
         (segment IN ('D', 'E', 'F') AND gearbox_family NOT IN ('manual', 'dct_dry') AND kw >= 110) AS is_comfort
  FROM c
)
INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT id, 'city_commuter' FROM c2
 WHERE segment IN ('A', 'B') AND length_mm <= 4250 AND fuel IN ('petrol', 'lpg', 'cng')
UNION ALL SELECT id, 'highway_cruiser' FROM c2
 WHERE segment IN ('C', 'D', 'E') AND NOT is_comfort
   AND (   (fuel = 'diesel' AND kw >= 100)
        OR (fuel IN ('petrol', 'lpg', 'cng') AND kw >= 125 AND gearbox_family <> 'manual')
        OR (fuel = 'electric' AND ev_range >= 350))
UNION ALL SELECT id, 'comfort_cruiser' FROM c2
 WHERE is_comfort
UNION ALL SELECT id, 'hot_hatch' FROM c2
 WHERE body LIKE 'Hatchback%' AND fuel IN ('petrol', 'electric') AND coalesce(performance, badge)
-- sport branch REMOVED 2026-11-20: superseded by 20261120140500_seed_tag_rules_round4.sql (same
-- performance test, but sleeper wins); clean-up 20261120141000. Left here, a re-run would put the
-- 25 sport + sleeper twins back.
UNION ALL SELECT id, 'drivers_choice' FROM c2
 WHERE gearbox_family = 'manual' AND fuel = 'petrol' AND kw >= 110
   AND body IN ('Hatchback 3-door', 'Hatchback 5-door', 'Coupe 2-door', 'Roadster 2-door', 'Cabriolet 2-door')
UNION ALL SELECT id, 'heavy_tower' FROM c2                      -- TEMPORARY: phase towing
 WHERE phase_towing >= 1800 AND nm >= 340 AND gearbox_family <> 'dct_dry'
UNION ALL SELECT id, 'workhorse' FROM c2
 WHERE fuel = 'diesel' AND engine_rel >= 4 AND gearbox_rel >= 4
   AND body IN ('Estate', 'Estate Cross', 'Liftback', 'MPV 5-door', 'SUV 5-door') AND boot >= 500
ON CONFLICT DO NOTHING;

-- ---- Model level ---------------------------------------------------------------------------
INSERT INTO public.catalog_phase_tags (phase_id, tag_slug)
SELECT DISTINCT p.id, 'family_ideal'
FROM public.catalog_phases p
JOIN public.phase_body_dimensions d ON d.phase_id = p.id
JOIN public.catalog_body_types b    ON b.id = d.body_type_id
WHERE b.name = 'MPV 5-door' AND (p.safety_rating >= 4 OR d.isofix_count >= 2)
ON CONFLICT DO NOTHING;

-- ---- Post-condition: coverage cap (NOTICE only) --------------------------------------------
DO $$
DECLARE total integer; r record; over text := '';
BEGIN
  SELECT count(*) INTO total FROM public.catalog_vehicle_configurations;
  FOR r IN
    SELECT tag_slug, count(*) AS n FROM public.catalog_configuration_tags GROUP BY tag_slug ORDER BY 2 DESC
  LOOP
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
