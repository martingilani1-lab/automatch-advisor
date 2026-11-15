-- BMW i3 (I01) completion pass (Martin, 2026-11-12) -- part 1 of 2, additive INSERT only.
-- One new fault, sourced to NHTSA recall 19V-599 (read in full, verified directly from the
-- primary Part 573 report, not just Perplexity's citation of it): the Electric Motor
-- Electronics (EME) module recall affecting MY2019 BMW i3 BEVs built Jan 9 - Feb 25 2019
-- specifically (~27 vehicles), remedied free under warranty. "Critical" per this project's
-- own severity rubric (NHTSA's own text: "increasing the risk of a crash" from loss of
-- high-voltage power / propulsion) -- but note the narrow scope in the fault text itself so
-- it doesn't read as an ongoing pattern across every 120 Ah car.
--
-- Deliberately NOT inserted (see docs/intake/research/bmw-i3-i01-completion.md for why):
--   * A mirrored KLE fault on i3s-94Ah -- plausible given shared charging hardware with
--     i3-94Ah (which already has this fault on file), but no source names i3s-94Ah
--     specifically. Flagged as a question for Martin instead of inserted.
--   * Any gearbox-specific fault -- the one i3-family gearbox/differential failure found
--     (a PMM Online teardown writeup) was on a REx car, out of scope for this BEV-only
--     catalog.
--   * Any new vehicle-level fault -- nothing found beyond what's already on file
--     (suspension / A-C-compressor-contaminates-battery-cooling, both phases).
--
-- Review-only. NOT executed by this session.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  INSERT INTO public.catalog_component_faults (component_type, engine_id, fault, severity)
  SELECT 'engine', e.id,
    'Electric Motor Electronics (EME) module recall (NHTSA 19V-599, Aug 2019): a circuit-board manufacturing defect on cars built 9 Jan - 25 Feb 2019 could cause a loss of high-voltage power while driving. Narrow, dated batch (~27 US-reported vehicles) remedied free under BMW warranty -- not an ongoing pattern, but a real documented defect.',
    'critical'
  FROM public.catalog_engines e
  WHERE e.code = 'i3-120Ah' AND e.power_kw = 125
    AND NOT EXISTS (
      SELECT 1 FROM public.catalog_component_faults f
      WHERE f.engine_id = e.id AND f.fault LIKE 'Electric Motor Electronics (EME) module recall%'
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to insert exactly 1 EME fault row for i3-120Ah@125kW, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
