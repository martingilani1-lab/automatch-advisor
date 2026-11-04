-- Dilemma-driven schema gaps, group 4: family space (Martin, 2026-11-04). Family/stroller
-- dilemma (Touran vs. Kodiaq vs. Ceed SW): the tags "3x ISOFIX" and "7-seater" could not be set
-- from data -- ISOFIX was not stored at all, and seats_count only holds the standard number, so
-- a Kodiaq (5 standard, 7 optional) looked like a 5-seater.
--
--   phase_body_dimensions
--     isofix_count                 ISOFIX positions in the car (front passenger included)
--     isofix_front_passenger       ISOFIX on the front passenger seat (true/false)
--     seats_optional_max           highest seat count available as an option (7 for a 5+2 Kodiaq);
--                                  NULL when no extra-seat option exists or is unknown
--     boot_capacity_7_seats_liters boot with every seat row in use (only meaningful for 7-seaters)
--     boot_sill_height_mm          loading lip height above the ground -- lifting a pram / bags in
--
-- No backfill: none of these is in the live data yet. NULL = unknown.
--
-- ALTER only: human-run, in a FRESH SQL editor tab.

BEGIN;

ALTER TABLE public.phase_body_dimensions
  ADD COLUMN isofix_count smallint,
  ADD COLUMN isofix_front_passenger boolean,
  ADD COLUMN seats_optional_max smallint,
  ADD COLUMN boot_capacity_7_seats_liters integer,
  ADD COLUMN boot_sill_height_mm integer;

ALTER TABLE public.phase_body_dimensions
  ADD CONSTRAINT phase_body_dimensions_isofix_count_range_check
    CHECK (isofix_count IS NULL OR isofix_count BETWEEN 0 AND 6),
  ADD CONSTRAINT phase_body_dimensions_seats_optional_max_check
    CHECK (seats_optional_max IS NULL OR seats_count IS NULL OR seats_optional_max > seats_count),
  ADD CONSTRAINT phase_body_dimensions_boot_7_seats_range_check
    CHECK (boot_capacity_7_seats_liters IS NULL OR boot_capacity_7_seats_liters BETWEEN 0 AND 1000),
  ADD CONSTRAINT phase_body_dimensions_boot_sill_range_check
    CHECK (boot_sill_height_mm IS NULL OR boot_sill_height_mm BETWEEN 300 AND 1200);

COMMIT;
