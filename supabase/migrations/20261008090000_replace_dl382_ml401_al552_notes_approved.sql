-- Replaces the DRAFT reliability_note/maintenance_note placed on DL382/ML401/AL552 by
-- 20261006150000 with Martin's approved final text. Two changes from the draft, per
-- Martin's explicit sign-off: (1) the "DRAFT (for Martin's review...)" prefix is gone --
-- it's reviewed now; (2) every phrase that referenced this project itself ("in this
-- catalog", "this catalog's A4 B9 intake", "flagged rather than assumed... without Martin
-- confirming") is removed -- these notes describe the real transmission unit, not the
-- authoring process that added it. The underlying technical content (speeds, family,
-- maker, fluid-change intervals) is unchanged from the draft; only the prefix and the
-- meta-commentary are stripped.
--
-- UPDATE of existing hand-authored data: file-only, human-run, NOT executed here.

begin;

do $$
declare
  target_n integer;
begin
  select count(*) into target_n
  from transmission_units
  where code in ('Audi DL382', 'Audi ML401', 'ZF AL552')
    and reliability_note like 'DRAFT%'
    and maintenance_note like 'DRAFT%';
  if target_n <> 3 then
    raise exception 'Expected exactly 3 transmission_units rows (DL382, ML401, AL552) still carrying DRAFT notes, found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update transmission_units
set
  reliability_note = 'A lighter-duty 7-speed wet dual-clutch for the longitudinal MLB Evo platform (B9 A4/A5, Q5-generation), positioned below the 8-speed ZF Tiptronic for lower-torque 4-cylinder applications. Wet-clutch construction generally fares better than the transverse dry-clutch DQ200/DQ381 family on reliability.',
  maintenance_note = 'Fluid and filter change recommended around every 60,000 km -- VAG does not sell this as a lifetime-fill unit.'
where code = 'Audi DL382';

update transmission_units
set
  reliability_note = 'A 6-speed manual for the longitudinal MLB Evo platform, used on the lower-power 4-cylinder A4 (B9) variants. Manuals on this platform are generally very reliable; the dual-mass flywheel (a separate component, not part of this transmission unit) is the more common wear point when paired with the diesel engines.',
  maintenance_note = 'No scheduled fluid change in VAG''s own service schedule for this unit (lifetime fill); clutch wear (a separate wear item) is the practical maintenance driver, not the gearbox itself.'
where code = 'Audi ML401';

update transmission_units
set
  reliability_note = 'Audi''s internal code for a ZF 8HP-based 8-speed torque-converter automatic in longitudinal MLB Evo applications, used with the higher-output V6 engines. Same underlying ZF 8HP architecture used under other makers'' Tiptronic/Steptronic branding -- generally a strong reliability reputation.',
  maintenance_note = 'VAG markets this as a lifetime fill, but a real-world fluid change around every 80,000 km is recommended regardless.'
where code = 'ZF AL552';

-- Post-condition: exactly 3 rows updated to the approved text, and -- the real point of
-- this guard -- zero rows ANYWHERE in transmission_units still carry a DRAFT note, not
-- just these 3. Catches a draft left on some other row by a different migration just as
-- much as it confirms this one's own update.
do $$
declare
  updated_n integer;
  remaining_draft_n integer;
begin
  select count(*) into updated_n
  from transmission_units
  where code in ('Audi DL382', 'Audi ML401', 'ZF AL552')
    and reliability_note not like 'DRAFT%'
    and maintenance_note not like 'DRAFT%';
  if updated_n <> 3 then
    raise exception 'Expected 3 transmission_units rows (DL382, ML401, AL552) with approved (non-DRAFT) notes after update, found %.', updated_n;
  end if;

  select count(*) into remaining_draft_n
  from transmission_units
  where reliability_note like 'DRAFT%' or maintenance_note like 'DRAFT%';
  if remaining_draft_n <> 0 then
    raise exception 'Expected 0 transmission_units rows anywhere with a DRAFT-prefixed note, found %.', remaining_draft_n;
  end if;
end $$;

commit;
