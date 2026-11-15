-- Repair-buffer model, step 2 (Martin, 2026-11-12): numeric annual probability, affected build
-- years and a pre-purchase check on faults; per-phase tyre wear by axle.
--
-- Why this replaces the word-based `probability` added earlier today (20261112150000):
-- the cost calculator now prices each fault as an EXPECTED VALUE -- repair cost × the chance of
-- meeting it in a given year -- and Martin's figures need two "rare" faults to stay apart
-- (BMW i3 A/C compressor 0.2 %/year vs motor mount 2 %/year, a 10x difference the words
-- rare/occasional/common can't carry). Keeping both columns would give every fault two
-- probabilities that can disagree, so the word column goes. It was filled only on the 16 BMW i3
-- rows from 20261112150500; 20261112160500 sets their numeric values.
--
--   annual_probability   0 < p <= 1, the share of cars that meet this fault (or this
--                        replacement) in one year. A wear item replaced every N years is 1/N
--                        (12 V battery every 4 years -> 0.25), so time-based wear and random
--                        risk use one formula. NULL = no rate known -> the fault stays OUT of
--                        the buffer and the calculator lists it as "not priced".
--   affected_year_from / _to   build years the fault applies to (inclusive; NULL = open end).
--                        The calculator skips a fault outside the chosen year of manufacture
--                        (i3 motor mount: up to 2015).
--   pre_purchase_check   what a buyer should have checked before buying -- shown next to the
--                        risk, because for some faults a 10-minute check removes the risk
--                        entirely (i3: reinforced aluminium motor mount already fitted).
--
-- catalog_phases.tyre_*: tyre cost and life per AXLE (a pair of tyres), for cars whose tyres
-- wear unlike the calculator's generic "set of 4 every 40 000 km" -- a rear-driven EV with
-- instant torque wears its rear pair about twice as fast. NULL = use the generic figure.
--
-- Destructive part (DROP COLUMN probability) -> review-only, Martin runs this file in a fresh
-- SQL editor tab. Guarded: aborts unless exactly the 16 known rows carry a word probability.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE probability IS NOT NULL;
  IF n <> 16 THEN
    RAISE EXCEPTION 'expected exactly 16 faults with a word probability (BMW i3), found % -- aborting', n;
  END IF;
END $$;

ALTER TABLE public.catalog_component_faults
  DROP CONSTRAINT catalog_component_faults_probability_check,
  DROP COLUMN probability;

ALTER TABLE public.catalog_component_faults
  ADD COLUMN annual_probability numeric(6,5),
  ADD COLUMN affected_year_from smallint,
  ADD COLUMN affected_year_to smallint,
  ADD COLUMN pre_purchase_check text;

ALTER TABLE public.catalog_component_faults
  ADD CONSTRAINT catalog_component_faults_annual_probability_check
    CHECK (annual_probability IS NULL OR (annual_probability > 0 AND annual_probability <= 1)),
  ADD CONSTRAINT catalog_component_faults_affected_years_check
    CHECK (affected_year_from IS NULL OR affected_year_to IS NULL OR affected_year_to >= affected_year_from);

COMMENT ON COLUMN public.catalog_component_faults.annual_probability IS
  'Share of cars meeting this fault or replacement in one year (0-1]. Wear every N years = 1/N. NULL = not in the repair buffer.';
COMMENT ON COLUMN public.catalog_component_faults.affected_year_from IS 'First affected build year (inclusive). NULL = from the start.';
COMMENT ON COLUMN public.catalog_component_faults.affected_year_to IS 'Last affected build year (inclusive). NULL = to the end.';
COMMENT ON COLUMN public.catalog_component_faults.pre_purchase_check IS 'What to have checked before buying; shown with the risk.';

ALTER TABLE public.catalog_phases
  ADD COLUMN tyre_front_cost_eur integer CHECK (tyre_front_cost_eur IS NULL OR tyre_front_cost_eur > 0),
  ADD COLUMN tyre_front_life_km integer CHECK (tyre_front_life_km IS NULL OR tyre_front_life_km > 0),
  ADD COLUMN tyre_rear_cost_eur integer CHECK (tyre_rear_cost_eur IS NULL OR tyre_rear_cost_eur > 0),
  ADD COLUMN tyre_rear_life_km integer CHECK (tyre_rear_life_km IS NULL OR tyre_rear_life_km > 0);

COMMENT ON COLUMN public.catalog_phases.tyre_front_cost_eur IS 'One front pair of tyres, fitted, EUR. NULL = generic tyre cost.';
COMMENT ON COLUMN public.catalog_phases.tyre_front_life_km IS 'Typical life of the front pair, km.';
COMMENT ON COLUMN public.catalog_phases.tyre_rear_cost_eur IS 'One rear pair of tyres, fitted, EUR. NULL = generic tyre cost.';
COMMENT ON COLUMN public.catalog_phases.tyre_rear_life_km IS 'Typical life of the rear pair, km.';

COMMIT;
