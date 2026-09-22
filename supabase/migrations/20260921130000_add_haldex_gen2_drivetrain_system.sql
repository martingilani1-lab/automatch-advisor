-- Adds a Haldex Gen 2 entry to drivetrain_systems, for the pre-facelift Škoda
-- Octavia II (1Z) 4x4 (and other mid-2000s VAG transverse 4x4/4MOTION cars),
-- which the existing catalogue doesn't cover — haldex_gen4/haldex_gen5 are
-- both the later BorgWarner electronic-pump generation (pre-charged,
-- predictive engagement). Gen 2 is the earlier mechanical-pump generation
-- (reactive — needs an actual speed difference between axles to build
-- pressure and engage), mechanically distinct enough to warrant its own row
-- rather than being folded into gen4.
--
-- type = 'haldex' — kept under the same type as gen4/gen5 (not on_demand),
-- consistent with treating all three Haldex generations as one family. This
-- value is already allowed by drivetrain_systems' type CHECK constraint
-- (haldex, torsen, permanent, on_demand, dual_motor — see the original
-- 20260724120000_transmission_drivetrain_reference_tables.sql migration) —
-- no schema change needed, this is data-only.
--
-- Deliberately NOT touching component_faults — the Haldex-specific fault
-- (clogged filter / mechanical pump failure / clutch-pack wear from
-- neglect) lives in reliability_note/maintenance_note below, same as
-- gen4/gen5. component_faults stays scoped to engine/transmission only.
--
-- Idempotent: upserts on the unique `code`, safe to re-run. Replaces the
-- earlier version of this same migration file (never run).

insert into drivetrain_systems (code, type, generation, maker, description, reliability_note, maintenance_note)
values (
  'haldex_gen2',
  'haldex',
  'Gen 2',
  'Haldex Traction',
  'FWD-based; wet multi-plate clutch on the rear axle. Uses a mechanical hydraulic pump that requires a speed difference (wheel slip) between front and rear axles to generate pressure and engage the clutch. Slower reacting than Gen 4/5. Used on VAG transverse 4x4/4MOTION of the mid-2000s (Octavia II pre-facelift, etc.).',
  'Mechanically robust if oil and filter are changed strictly every 60,000 km. Neglect leads to clogged filters, mechanical pump failure, and clutch-pack wear — resulting in a complete loss of AWD. Simpler and slower-reacting than the later electronic-pump generations.',
  'Haldex oil + filter change ~every 60k km, ~EUR 80-150. The single most important service for this system; the mechanical pump and filter clog and the rear clutch wears if it''s skipped, causing loss of AWD.'
)
on conflict (code) do update set
  type             = excluded.type,
  generation       = excluded.generation,
  maker            = excluded.maker,
  description      = excluded.description,
  reliability_note = excluded.reliability_note,
  maintenance_note = excluded.maintenance_note;
