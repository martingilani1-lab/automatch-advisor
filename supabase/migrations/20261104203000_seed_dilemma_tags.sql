-- Tags that the new dilemma columns finally make automatable (Martin, 2026-11-04). Until now
-- these four were hand-only because no fact in the data decided them (see the "NOT automated"
-- list in 20261103090000_seed_rule_based_tags.sql):
--
--   MODEL level (catalog_phase_tags)
--     isofix_3x     some body of the phase has isofix_count >= 3
--   CONFIGURATION level (catalog_configuration_tags)
--     seven_seater  seats_count >= 7 OR seats_optional_max >= 7 -- a 5+2 Kodiaq counts: the
--                   buyer can get the third row on that configuration's body
--     heavy_tower   towing_braked_kg >= 2000 -- caravan / car-trailer / horsebox territory
--                   (threshold PROPOSED, Martin to confirm)
--     true_offroad  the AWD system has a low range, OR the phase is ladder-frame -- the two
--                   hardware facts that separate a real off-roader from a raised road car
--
-- Requires 20261104200500 / 201000 / 201500 (the columns). Matches nothing until those columns
-- are filled for a car -- safe to re-run after every import (ON CONFLICT DO NOTHING; the tier
-- trigger still guards model vs. configuration level). Additive INSERT: review first, then it
-- may run via MCP.

BEGIN;

INSERT INTO public.catalog_phase_tags (phase_id, tag_slug)
SELECT DISTINCT d.phase_id, 'isofix_3x'
FROM public.phase_body_dimensions d
WHERE d.isofix_count >= 3
ON CONFLICT DO NOTHING;

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT c.id, 'seven_seater'
FROM public.catalog_vehicle_configurations c
JOIN public.phase_body_dimensions d ON d.phase_id = c.phase_id AND d.body_type_id = c.body_type_id
WHERE d.seats_count >= 7 OR d.seats_optional_max >= 7
UNION ALL
SELECT c.id, 'heavy_tower'
FROM public.catalog_vehicle_configurations c
WHERE c.towing_braked_kg >= 2000
UNION ALL
SELECT c.id, 'true_offroad'
FROM public.catalog_vehicle_configurations c
JOIN public.catalog_phases p ON p.id = c.phase_id
LEFT JOIN public.drivetrain_systems s ON s.id = c.drivetrain_id
WHERE s.has_low_range IS TRUE OR p.chassis_type = 'ladder_frame'
ON CONFLICT DO NOTHING;

COMMIT;
