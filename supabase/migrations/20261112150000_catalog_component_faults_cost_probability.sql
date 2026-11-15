-- Repair cost and probability per fault (Martin, 2026-11-12).
--
-- Why: the AUTOMatch cost calculator needs an "unexpected repairs" buffer per car, and that buffer
-- can only come from the faults the catalog already records. Rather than a second table of
-- "common failures" (which would store the same faults twice -- the BMW i3 A/C compressor, 12 V
-- battery and motor-mount faults are already here), the existing catalog_component_faults row gets
-- the two facts the calculator needs:
--
--   estimated_cost_eur_min / _max  repair cost in EUR for a car out of warranty, SK / CZ market.
--                                  A single figure is stored as min = max. NULL = not known yet
--                                  (the calculator must treat NULL as "unknown", never as 0).
--   probability                    how likely an owner meets the fault over a typical ownership:
--                                    rare       -- isolated reports; most owners never see it
--                                    occasional -- a known pattern that hits a minority of cars
--                                    common     -- most cars meet it, or a wear item this car
--                                                  wears out early
--                                  Words, not a percentage: no source states a failure rate a
--                                  percentage could be taken from (the i3 A/C compressor's rate
--                                  is "unclear" even in the most-cited article). The calculator
--                                  maps each word to a weight; that mapping is the calculator's
--                                  design decision, not data.
--
-- Severity keeps its 3 levels (critical / moderate / minor): a 4-level scale would mean
-- re-grading all 855 existing faults.
--
-- Frozen vocabulary for probability -> mirrored in scripts/catalog-vocabularies.json in the same
-- commit (CLAUDE.md, frozen-vocabulary rule). The ARRAY[...] form is what validate-template.mjs's
-- live drift check parses.
--
-- Schema change: review-only, Martin runs it in a fresh SQL editor tab. Additive (new nullable
-- columns), touches no existing value.

BEGIN;

ALTER TABLE public.catalog_component_faults
  ADD COLUMN estimated_cost_eur_min integer,
  ADD COLUMN estimated_cost_eur_max integer,
  ADD COLUMN probability text;

ALTER TABLE public.catalog_component_faults
  ADD CONSTRAINT catalog_component_faults_cost_check CHECK (
    (estimated_cost_eur_min IS NULL OR estimated_cost_eur_min > 0)
    AND (estimated_cost_eur_max IS NULL OR estimated_cost_eur_max > 0)
    AND (estimated_cost_eur_min IS NULL OR estimated_cost_eur_max IS NULL
         OR estimated_cost_eur_max >= estimated_cost_eur_min)
  ),
  ADD CONSTRAINT catalog_component_faults_probability_check CHECK (
    probability IS NULL OR probability = ANY (ARRAY['rare'::text, 'occasional'::text, 'common'::text])
  );

COMMENT ON COLUMN public.catalog_component_faults.estimated_cost_eur_min IS
  'Repair cost, EUR, out of warranty, SK/CZ market. Single figure: min = max. NULL = unknown (never 0).';
COMMENT ON COLUMN public.catalog_component_faults.estimated_cost_eur_max IS
  'Repair cost, EUR, out of warranty, SK/CZ market. Single figure: min = max. NULL = unknown (never 0).';
COMMENT ON COLUMN public.catalog_component_faults.probability IS
  'rare = isolated reports; occasional = known pattern, minority of cars; common = most cars, or an early-wearing item.';

-- Post-condition: columns exist and every existing row is untouched (all NULL).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_component_faults
   WHERE estimated_cost_eur_min IS NOT NULL OR estimated_cost_eur_max IS NOT NULL OR probability IS NOT NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION 'expected no filled cost/probability right after adding the columns, found %', n;
  END IF;
END $$;

COMMIT;
