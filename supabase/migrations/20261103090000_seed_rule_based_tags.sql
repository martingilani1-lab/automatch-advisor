-- Rule-based tags, round 2 (Martin, 2026-11-03): tags that follow from facts visible on every
-- car page -- segment, body types, boot size, NCAP child score, power, fuel, engine badge --
-- instead of a hand-filled list. Each rule is a SELECT over live data, so this file documents
-- WHY a car has the tag. Counts as of 2026-11-03 in brackets.
--
-- MODEL level (catalog_phase_tags, per generation/facelift):
--   representative    [10 phases]  segment D, and not an SUV/MPV-only car
--                                  (A4, Arteon, Passat, Superb).
--   family_ideal      [31 phases]  largest boot >= 550 l AND Euro NCAP child occupant >= 75 %.
--                                  (Phases with no NCAP child score -- mostly pre-2008 -- don't get it.)
--   stroller_friendly [42 phases]  largest boot >= 500 l (a pram/buggy fits flat).
--   head_turner       [ 6 phases]  segment S, or a car sold ONLY as 2-door coupe/cabrio/roadster
--                                  or 4-seat 3-door (TT, New Beetle).
--   cargo_van         [ 1 phase ]  largest boot >= 1 000 l (Caddy).
--
-- CONFIGURATION level (catalog_configuration_tags):
--   city_commuter     [118]  hatchback, or a B-segment SUV, with <= 81 kW, petrol or electric.
--   highway_cruiser   [244]  diesel >= 100 kW in a C/D-segment estate, liftback, sedan, SUV or MPV.
--   roadtrip_camper   [243]  estate / SUV / MPV body with boot >= 600 l.
--   hot_hatch         [ 52]  petrol hatchback, >= 147 kW in a B-segment car (Polo/A1 GTI) or
--                            >= 162 kW in a C-segment car (Golf GTI and up). Plug-in hybrids excluded.
--   sleeper           [ 25]  estate / liftback / sedan with >= 180 kW, not a sports-segment car,
--                            and no RS / R / S3-S4 badge in the engine name (it must look ordinary).
--
-- NOT automated -- no fact in the data decides them: isofix_3x (no ISOFIX data in trims),
-- value_retainer (resale rating is 'holds_well' for 70 of 88 phases -- too coarse to mean
-- anything), comfort_cruiser, value_choice, workhorse, drivers_choice, sport, true_offroad,
-- heavy_tower (towing is per phase only, not per engine).
--
-- Additive INSERT only, ON CONFLICT DO NOTHING (safe to re-run after imports). The tier trigger
-- guarantees model tags only land on phases and configuration tags only on configurations.
-- Review-only until Martin signs off.

BEGIN;

-- ---- Model level ---------------------------------------------------------------------------
WITH ph AS (
  SELECT p.id, m.segment, p.ncap_child_pct AS child,
         (SELECT max(d.boot_capacity_liters) FROM public.phase_body_dimensions d WHERE d.phase_id = p.id) AS boot,
         (SELECT bool_and(b.name IN ('SUV 5-door', 'MPV 5-door', 'SUV Coupe 5-door'))
            FROM public.phase_body_dimensions d JOIN public.catalog_body_types b ON b.id = d.body_type_id
           WHERE d.phase_id = p.id) AS suv_mpv_only,
         (SELECT bool_and(b.name IN ('Cabriolet 2-door', 'Coupe 2-door', 'Roadster 2-door', 'Hatchback 3-door') AND coalesce(d.seats_count, 5) <= 4)
            FROM public.phase_body_dimensions d JOIN public.catalog_body_types b ON b.id = d.body_type_id
           WHERE d.phase_id = p.id) AS style_only
  FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
)
INSERT INTO public.catalog_phase_tags (phase_id, tag_slug)
SELECT id, 'representative'    FROM ph WHERE segment = 'D' AND NOT coalesce(suv_mpv_only, false)
UNION ALL SELECT id, 'family_ideal'      FROM ph WHERE boot >= 550 AND child >= 75
UNION ALL SELECT id, 'stroller_friendly' FROM ph WHERE boot >= 500
UNION ALL SELECT id, 'head_turner'       FROM ph WHERE segment = 'S' OR style_only
UNION ALL SELECT id, 'cargo_van'         FROM ph WHERE boot >= 1000
ON CONFLICT DO NOTHING;

-- ---- Configuration level -------------------------------------------------------------------
WITH c AS (
  SELECT c.id, e.power_kw AS kw, e.fuel_type AS fuel, e.hybrid_type AS hybrid, coalesce(e.display_name, e.code) AS engine_name,
         b.name AS body, m.segment, d.boot_capacity_liters AS boot
  FROM public.catalog_vehicle_configurations c
  JOIN public.catalog_engines e ON e.id = c.engine_id
  JOIN public.catalog_phases p ON p.id = c.phase_id
  JOIN public.catalog_models m ON m.id = p.model_id
  JOIN public.catalog_body_types b ON b.id = c.body_type_id
  LEFT JOIN public.phase_body_dimensions d ON d.phase_id = c.phase_id AND d.body_type_id = c.body_type_id
)
INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT id, 'city_commuter' FROM c
 WHERE (body LIKE 'Hatchback%' OR (body = 'SUV 5-door' AND segment = 'B')) AND kw <= 81 AND fuel IN ('petrol', 'electric')
UNION ALL SELECT id, 'highway_cruiser' FROM c
 WHERE fuel = 'diesel' AND kw >= 100 AND segment IN ('C', 'D') AND body IN ('Estate', 'Liftback', 'Sedan 4-door', 'SUV 5-door', 'MPV 5-door')
UNION ALL SELECT id, 'roadtrip_camper' FROM c
 WHERE body IN ('Estate', 'SUV 5-door', 'MPV 5-door') AND boot >= 600
UNION ALL SELECT id, 'hot_hatch' FROM c
 WHERE body LIKE 'Hatchback%' AND fuel = 'petrol' AND coalesce(hybrid, '') <> 'PHEV'
   AND ((segment = 'B' AND kw >= 147) OR (segment = 'C' AND kw >= 162))
UNION ALL SELECT id, 'sleeper' FROM c
 WHERE body IN ('Estate', 'Liftback', 'Sedan 4-door') AND kw >= 180 AND segment <> 'S'
   AND engine_name !~ '(^|\s)(RS\d?|R|S\d)(\s|$)'
ON CONFLICT DO NOTHING;

COMMIT;
