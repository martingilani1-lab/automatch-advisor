-- Follow-up to 20260930120100 (already run live, untouched -- see that file). That migration
-- dropped catalog_vehicle_configurations.transmission_id, which silently took its dependent
-- composite unique index down with it (Postgres auto-drops indexes on a DROP COLUMN). This
-- recreates that index on unit_id instead, plus adds the two plain unit_id indexes neither
-- table got in 20260930120100 as originally run.
--
-- Skips the type=family cross-check that was proposed for 20260930120100 -- already verified
-- manually, not needed again here.
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab,
-- after 20260930120100.

-- Pre-check for existing duplicates before creating the UNIQUE index (a real violation here
-- would otherwise surface as a less legible error on the CREATE UNIQUE INDEX statement below).
DO $$
DECLARE
  dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n FROM (
    SELECT phase_id, body_type_id, engine_id, unit_id, coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
    FROM catalog_vehicle_configurations
    GROUP BY 1, 2, 3, 4, 5
    HAVING count(*) > 1
  ) d;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Found % duplicate (phase, body, engine, unit, drivetrain) config group(s) live -- cannot create the unique index until these are resolved by hand.', dup_n;
  END IF;
END $$;

CREATE UNIQUE INDEX catalog_vehicle_configurations_dedup_idx
  ON catalog_vehicle_configurations (
    phase_id, body_type_id, engine_id, unit_id,
    coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX catalog_vehicle_configurations_unit_id_idx ON catalog_vehicle_configurations(unit_id);
CREATE INDEX catalog_component_faults_unit_id_idx ON catalog_component_faults(unit_id);
