-- Replaces DL382/ML401/AL552's current reliability_note/maintenance_note (the text set by
-- 20261008090000, confirmed already run) with Martin's actual approved text -- the first
-- replacement pass was confirmed NOT to match what he'd approved (missing the mechatronic
-- connector sleeve, judder, and oil-pan-with-built-in-filter specifics), so this is a
-- second, corrected replacement, not an edit to that earlier (already-run) file.
--
-- UPDATE of existing hand-authored data: file-only, human-run, NOT executed here.

begin;

do $$
declare
  target_n integer;
begin
  select count(*) into target_n
  from transmission_units
  where code in ('Audi DL382', 'Audi ML401', 'ZF AL552');
  if target_n <> 3 then
    raise exception 'Expected exactly 3 transmission_units rows (DL382, ML401, AL552), found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update transmission_units
set
  reliability_note = 'Wet-clutch 7-speed S tronic for 4-cylinder MLB Evo models (A4/A5 B9, Q5 FY). More durable than the dry-clutch DQ200. Typical faults: mechatronic unit faults (harsh or delayed engagement, gearbox warning, limp mode) and low-speed judder when pulling away; both are made worse by aged fluid.',
  maintenance_note = 'Fluid and filter change every ~60,000 km. Wet-clutch units are not lifetime-fill in practice, and skipping the service is the main cause of mechatronic and clutch problems.'
where code = 'Audi DL382';

update transmission_units
set
  reliability_note = 'Robust 6-speed manual for lower-power 4-cylinder MLB Evo models. No widespread gearbox faults. On the diesels, the dual-mass flywheel and clutch are the usual wear items (rattle at idle, judder when pulling away).',
  maintenance_note = 'Officially lifetime fill. A fluid change around 120,000 km is sensible on high-mileage cars. Expect a clutch and dual-mass flywheel replacement on high-mileage diesels.'
where code = 'Audi ML401';

update transmission_units
set
  reliability_note = 'ZF 8HP-family 8-speed automatic used with the V6 and S4 engines. One of the most durable automatics on the market. Known weak points: ATF leaking at the mechatronic connector sleeve, and harsh shifting or a slight shudder from aged fluid.',
  maintenance_note = 'Marketed as lifetime fill. ZF recommends a fluid change every 80,000–120,000 km. The oil pan has the filter built in and is replaced as one unit, along with the connector sleeve if it''s leaking.'
where code = 'ZF AL552';

-- Post-condition: each of the 6 fields equals the exact approved text, and -- as before --
-- zero rows ANYWHERE in transmission_units still carry a DRAFT-prefixed note.
do $$
declare
  matched_n integer;
  remaining_draft_n integer;
begin
  select count(*) into matched_n
  from transmission_units
  where (code = 'Audi DL382'
         and reliability_note = 'Wet-clutch 7-speed S tronic for 4-cylinder MLB Evo models (A4/A5 B9, Q5 FY). More durable than the dry-clutch DQ200. Typical faults: mechatronic unit faults (harsh or delayed engagement, gearbox warning, limp mode) and low-speed judder when pulling away; both are made worse by aged fluid.'
         and maintenance_note = 'Fluid and filter change every ~60,000 km. Wet-clutch units are not lifetime-fill in practice, and skipping the service is the main cause of mechatronic and clutch problems.')
     or (code = 'Audi ML401'
         and reliability_note = 'Robust 6-speed manual for lower-power 4-cylinder MLB Evo models. No widespread gearbox faults. On the diesels, the dual-mass flywheel and clutch are the usual wear items (rattle at idle, judder when pulling away).'
         and maintenance_note = 'Officially lifetime fill. A fluid change around 120,000 km is sensible on high-mileage cars. Expect a clutch and dual-mass flywheel replacement on high-mileage diesels.')
     or (code = 'ZF AL552'
         and reliability_note = 'ZF 8HP-family 8-speed automatic used with the V6 and S4 engines. One of the most durable automatics on the market. Known weak points: ATF leaking at the mechatronic connector sleeve, and harsh shifting or a slight shudder from aged fluid.'
         and maintenance_note = 'Marketed as lifetime fill. ZF recommends a fluid change every 80,000–120,000 km. The oil pan has the filter built in and is replaced as one unit, along with the connector sleeve if it''s leaking.');
  if matched_n <> 3 then
    raise exception 'Expected 3 transmission_units rows (DL382, ML401, AL552) with notes matching the approved text exactly after update, found %.', matched_n;
  end if;

  select count(*) into remaining_draft_n
  from transmission_units
  where reliability_note like 'DRAFT%' or maintenance_note like 'DRAFT%';
  if remaining_draft_n <> 0 then
    raise exception 'Expected 0 transmission_units rows anywhere with a DRAFT-prefixed note, found %.', remaining_draft_n;
  end if;
end $$;

commit;
