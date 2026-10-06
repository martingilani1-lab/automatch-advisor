-- Fills in maker/reliability_note/maintenance_note for VW DQ400e, left NULL in
-- 20261005110000_add_transmission_unit_dq400e.sql because they weren't supplied at
-- creation time (batch-verify.mjs's used-unit-notes check would otherwise correctly
-- flag this gap once Golf VIII / Octavia IV's seeds run and actually use this unit).
-- This is an UPDATE of existing hand-authored reference data, so per the standing rule
-- it stays file-only, never auto-executed; the human runs this. Same precedent as the
-- VW MQ281 notes fill (20261005091500_fill_mq281_notes.sql).
--
-- Guarded on current state (code = 'DQ400e', maker/reliability_note/maintenance_note
-- all currently NULL) so it can't silently clobber a value already filled another way.

do $$
declare
  target_n integer;
begin
  select count(*) into target_n
  from transmission_units
  where code = 'DQ400e'
    and maker is null
    and reliability_note is null
    and maintenance_note is null;
  if target_n <> 1 then
    raise exception 'Expected exactly 1 transmission_units row for DQ400e with maker/reliability_note/maintenance_note still NULL, found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update transmission_units
set
  maker = 'Volkswagen',
  reliability_note = 'A specialized wet DSG integrating a 3rd decoupling clutch (K0) and an electric motor for PHEVs. Mechanically very robust (rated to 400 Nm). The most common issues are software-related, causing jerky transitions when switching between electric and combustion power. Mechatronic failures are rare but extremely expensive due to the complex integration.',
  maintenance_note = 'DSG fluid and filter change strictly required every 60,000 km. The fluid not only lubricates the gears and clutches but also cools the high-voltage electric motor, making timely changes critical to prevent catastrophic electrical shorts.'
where code = 'DQ400e';

-- Post-condition: exactly 1 row for DQ400e, all three fields now non-NULL.
do $$
declare
  filled_n integer;
begin
  select count(*) into filled_n
  from transmission_units
  where code = 'DQ400e'
    and maker is not null
    and reliability_note is not null
    and maintenance_note is not null;
  if filled_n <> 1 then
    raise exception 'Expected 1 transmission_units row for DQ400e with all three fields filled after update, found %.', filled_n;
  end if;
end $$;
