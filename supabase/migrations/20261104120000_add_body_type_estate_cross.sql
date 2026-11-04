-- Two new shared "Cross" body types (Martin, 2026-11-04) -- raised, cladded versions of a regular
-- body, sold under the regular model rather than as a model of their own:
--   * "Estate Cross"    -- Škoda Octavia Scout first; later VW Passat / Golf Alltrack, Audi A4 / A6
--                          allroad, SEAT Leon X-Perience.
--   * "Hatchback Cross" -- set up now for Toyota Yaris Cross, Dacia Sandero Stepway, VW Polo Cross.
-- Distinct from "Estate" / "Hatchback ..." because they have their own dimensions (height, ground
-- clearance, length), curb weights and official consumption, which need their own
-- phase_body_dimensions rows and their own configurations.
--
-- Naming: base body name + "Cross". "Hatchback Cross" carries no door count (live hatchbacks are
-- "Hatchback 3-door" / "Hatchback 5-door") -- the cross versions this is for are all 5-door, and
-- Martin named it this way. Near-duplicate check (CLAUDE.md rule 2c, lowercase / no whitespace):
-- "estatecross" and "hatchbackcross" match no live name. Shared reference data -> its own reviewed
-- migration, never created by a car import.
--
-- UI (same commit, app/db-test/lib/filters.ts): one body type may now sit under several tiles --
--   Estate Cross    -> combi + suv_crossover
--   Hatchback Cross -> hatchback + suv_crossover
--
-- Additive INSERT. Review first; then it may run via MCP (or the SQL editor).

BEGIN;

INSERT INTO public.catalog_body_types (name)
SELECT v.name
FROM (VALUES ('Estate Cross'::text), ('Hatchback Cross')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_body_types b WHERE b.name = v.name);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.catalog_body_types WHERE name IN ('Estate Cross', 'Hatchback Cross')) <> 2 THEN
    RAISE EXCEPTION 'Estate Cross / Hatchback Cross missing after insert -- rolled back';
  END IF;
END $$;

COMMIT;
