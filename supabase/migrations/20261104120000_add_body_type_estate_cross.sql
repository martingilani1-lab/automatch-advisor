-- New shared body type "Estate Cross" (Martin, 2026-11-04): a raised, cladded estate sold under the
-- regular model -- Škoda Octavia Scout first; later VW Passat / Golf Alltrack, Audi A4 / A6
-- allroad, SEAT Leon X-Perience. Distinct from "Estate" because it has its own dimensions (height,
-- ground clearance, length), curb weights and official consumption, which need their own
-- phase_body_dimensions row and their own configurations.
--
-- Naming follows the live vocabulary ("Estate", "SUV Coupe 5-door"): the base body name plus a
-- qualifier. Near-duplicate check (CLAUDE.md rule 2c, normalized lowercase / no whitespace):
-- "estatecross" matches no live name. Shared reference data -> its own reviewed migration, never
-- created by a car import.
--
-- UI: mapped to the "combi" tile in app/db-test/lib/filters.ts (same commit), so it shows under
-- Combi/Estate in the filters.
--
-- Additive INSERT. Review first; then it may run via MCP (or the SQL editor).

BEGIN;

INSERT INTO public.catalog_body_types (name)
SELECT 'Estate Cross'
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_body_types WHERE name = 'Estate Cross');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.catalog_body_types WHERE name = 'Estate Cross') <> 1 THEN
    RAISE EXCEPTION 'Estate Cross missing after insert -- rolled back';
  END IF;
END $$;

COMMIT;
