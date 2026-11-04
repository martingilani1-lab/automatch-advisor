-- Dilemma-driven schema gaps, group 3: off-road hardware (Martin, 2026-11-04). Off-road
-- dilemma: a ladder-frame 4x4 with low range and diff locks (Hilux, Jimny, Wrangler, Defender
-- 90/110 classic) could not be told apart from a Haldex SUV -- both were just "drivetrain set".
--
--   drivetrain_systems.type += 'part_time'   selectable 4WD: rear-drive normally, front axle
--                                            locked in on demand (no centre diff) -- Hilux,
--                                            Jimny, older Pajero. None of the 5 live types fits.
--   drivetrain_systems.has_low_range         transfer case with a reduction gear
--   drivetrain_systems.center_diff_lock /
--     rear_diff_lock / front_diff_lock       mechanically lockable differentials. Booleans on the
--                                            SYSTEM = fitted as part of it. A lock that is only an
--                                            option on some trims goes in trim features as well.
--                                            NULL = unknown, false = known absent.
--   catalog_phases.chassis_type              monocoque | ladder_frame -- the structural fact that
--                                            separates a true off-roader from a raised car.
--   phase_body_dimensions                    approach / departure / breakover angle (degrees),
--                                            wading depth (mm) -- measurable terrain ability next
--                                            to ground_clearance_mm.
--
-- Backfill: every live drivetrain system is a road AWD (Haldex / Torsen / permanent / on-demand
-- / dual-motor): no low range and no driver-lockable diffs -> false, a known fact for those
-- systems. Every live phase is a monocoque car (VAG passenger cars, Cupra/SEAT/Škoda/Audi -- no
-- ladder frame among them, checked 2026-11-04) -> 'monocoque'.
--
-- drivetrain_systems is shared reference data, not catalog_-prefixed, so its CHECK is not in
-- scripts/catalog-vocabularies.json; catalog_phases.chassis_type is, and is added there in the
-- same commit.
--
-- ALTER + UPDATE: human-run only, in a FRESH SQL editor tab. One transaction.

BEGIN;

ALTER TABLE public.drivetrain_systems DROP CONSTRAINT drivetrain_systems_type_check;
ALTER TABLE public.drivetrain_systems ADD CONSTRAINT drivetrain_systems_type_check
  CHECK (type IN ('haldex', 'torsen', 'permanent', 'on_demand', 'dual_motor', 'part_time'));

ALTER TABLE public.drivetrain_systems
  ADD COLUMN has_low_range boolean,
  ADD COLUMN center_diff_lock boolean,
  ADD COLUMN rear_diff_lock boolean,
  ADD COLUMN front_diff_lock boolean;

ALTER TABLE public.catalog_phases
  ADD COLUMN chassis_type text;
ALTER TABLE public.catalog_phases
  ADD CONSTRAINT catalog_phases_chassis_type_check
    CHECK (chassis_type IS NULL OR chassis_type IN ('monocoque', 'ladder_frame'));

ALTER TABLE public.phase_body_dimensions
  ADD COLUMN approach_angle_deg numeric,
  ADD COLUMN departure_angle_deg numeric,
  ADD COLUMN breakover_angle_deg numeric,
  ADD COLUMN wading_depth_mm integer;
ALTER TABLE public.phase_body_dimensions
  ADD CONSTRAINT phase_body_dimensions_angles_range_check CHECK (
    (approach_angle_deg IS NULL OR approach_angle_deg BETWEEN 5 AND 90) AND
    (departure_angle_deg IS NULL OR departure_angle_deg BETWEEN 5 AND 90) AND
    (breakover_angle_deg IS NULL OR breakover_angle_deg BETWEEN 5 AND 90)),
  ADD CONSTRAINT phase_body_dimensions_wading_depth_range_check
    CHECK (wading_depth_mm IS NULL OR wading_depth_mm BETWEEN 0 AND 1500);

-- Backfill: known facts for what is live today.
UPDATE public.drivetrain_systems
   SET has_low_range = false, center_diff_lock = false, rear_diff_lock = false, front_diff_lock = false
 WHERE type IN ('haldex', 'torsen', 'permanent', 'on_demand', 'dual_motor');

UPDATE public.catalog_phases SET chassis_type = 'monocoque';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.drivetrain_systems WHERE has_low_range IS NULL) THEN
    RAISE EXCEPTION 'A live drivetrain system was not backfilled -- rolled back';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog_phases WHERE chassis_type IS NULL) THEN
    RAISE EXCEPTION 'A live phase has no chassis_type -- rolled back';
  END IF;
END $$;

COMMIT;
