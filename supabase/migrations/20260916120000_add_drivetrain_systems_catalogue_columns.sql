-- Add 3 columns drivetrain_systems needs to hold the full 22-system AWD/4WD
-- catalogue (Template 1) that's about to be loaded in the next migration.
-- The table currently only has id/code/type/maker/reliability_note — no
-- field for a plain-language generation label, a description of how the
-- system actually works, or maintenance guidance, all of which the
-- catalogue provides per system alongside reliability_note.
--
-- All 3 nullable text, matching reliability_note's own nullability — this is
-- reference/authored content, not something every row is guaranteed to have
-- filled in immediately (and future systems added later may start blank).

alter table drivetrain_systems
  add column generation text,
  add column description text,
  add column maintenance_note text;
