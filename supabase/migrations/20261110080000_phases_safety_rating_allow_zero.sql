-- Euro NCAP 0 stars is a real result (Renault Zoe Phase 2, 2021: 43 / 52 / 41 / 14). The live
-- CHECK only allowed 1..5, so a 0-star car could only be stored as NULL -- which the app shows as
-- "Not tested by Euro NCAP", the opposite of the truth. Widened to 0..5; NULL still means "not
-- tested". The display code already tests `stars != null`, so 0 renders as 0/5 (checked
-- app/db-test, app/prehlad, app/page.tsx 2026-11-10).
--
-- Schema change: human-run, FRESH SQL editor tab. Must run BEFORE the Renault Zoe seed.

BEGIN;
ALTER TABLE public.catalog_phases DROP CONSTRAINT catalog_phases_safety_rating_check;
ALTER TABLE public.catalog_phases ADD CONSTRAINT catalog_phases_safety_rating_check
  CHECK (safety_rating >= 0 AND safety_rating <= 5);
COMMIT;
