-- Automatic configuration-level tags (Martin, 2026-11-02): the tags that follow OBJECTIVELY from
-- catalog data, so 920+ engine/body combinations don't have to be hand-tagged. The judgement
-- tags (Hot-hatch, Sleeper, Representative, Head-turner, City commuter, ...) are NOT set here --
-- those stay a human call.
--
-- Each rule is a plain SELECT over live data, so this file is the documentation of WHY a car
-- carries the tag. Row counts as of 2026-11-02 (1 550 configurations) in brackets:
--
--   green_zone              [  8]  engine is electric, or a plug-in hybrid (hybrid_type 'PHEV').
--                                  Mild hybrids (MHEV, e.g. eTSI) are NOT green-zone cars.
--   (winter_ready and ultra_efficient below: SUPERSEDED 2026-11-20 by 20261120140500, branches removed)
--   winter_ready            [346]  the configuration has an AWD drivetrain system
--                                  (Haldex / quattro / 4MOTION -- drivetrain_id set).
--   seven_seater            [  3]  phase_body_dimensions.seats_count >= 7 for that body.
--                                  NB: optional 3rd rows (Kodiaq, Tarraco) aren't in the data as
--                                  7 seats, so they get no tag until seats data says so.
--   ultra_efficient         [137]  official combined fuel_consumption_l100km <= 4.5 (petrol/diesel,
--                                  not PHEV) -- roughly the thriftiest 10 % of the catalog. These
--                                  are the manufacturer figures as stored (older NEDC cars read
--                                  lower than WLTP ones).
--   bulletproof_reliability [ 78]  engine reliability_rating = 5 AND gearbox rating >= 4 AND (no
--                                  AWD, or AWD rating >= 4) -- i.e. your own ratings say every
--                                  driveline part is strong. Today that is the 1.9 TDI / SDI with
--                                  the 02J / 02M manuals.
--
-- Deliberately left out: heavy_tower. Towing capacity is only stored per PHASE
-- (catalog_phases.towing_capacity_kg), and it really depends on engine + gearbox -- tagging every
-- configuration of a phase would mark a 1.0 TSI as a heavy tower. Needs per-configuration
-- towing data first.
--
-- Additive INSERT only (ON CONFLICT DO NOTHING -> safe to re-run after new cars are imported).
-- Run AFTER 20261102230000_create_catalog_tags.sql. Review-only until Martin signs off.

BEGIN;

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT c.id, 'green_zone'
FROM public.catalog_vehicle_configurations c
JOIN public.catalog_engines e ON e.id = c.engine_id
WHERE e.fuel_type = 'electric' OR e.hybrid_type = 'PHEV'
ON CONFLICT DO NOTHING;

-- winter_ready REMOVED 2026-11-20: superseded by 20261120140500_seed_tag_rules_round4.sql
-- (AWD AND ground clearance >= 130 mm); the rows it gave that the new rule doesn't are deleted by
-- 20261120141000. Left here, a re-run would put them back.

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT c.id, 'seven_seater'
FROM public.catalog_vehicle_configurations c
JOIN public.phase_body_dimensions d ON d.phase_id = c.phase_id AND d.body_type_id = c.body_type_id
WHERE d.seats_count >= 7
ON CONFLICT DO NOTHING;

-- ultra_efficient REMOVED 2026-11-20: superseded by 20261120140500_seed_tag_rules_round4.sql
-- (one threshold per test cycle, EV branch); the rows it gave that the new rule doesn't are
-- deleted by 20261120141000. Left here, a re-run would put them back.

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT c.id, 'bulletproof_reliability'
FROM public.catalog_vehicle_configurations c
JOIN public.catalog_engines e ON e.id = c.engine_id
JOIN public.transmission_units t ON t.id = c.unit_id
LEFT JOIN public.drivetrain_systems d ON d.id = c.drivetrain_id
WHERE e.reliability_rating = 5
  AND t.reliability_rating >= 4
  AND (c.drivetrain_id IS NULL OR d.reliability_rating >= 4)
ON CONFLICT DO NOTHING;

COMMIT;
