-- Removes 10 catalog_component_faults rows (component_type = 'engine')
-- that violate CLAUDE.md rule 9 (engine content never contains gearbox/drivetrain
-- facts) -- imported by 20261011205548_import_engine_content_from_old_engines.sql
-- before that rule existed, from old-engine common_faults text that mentioned a
-- gearbox code or drivetrain system. Found by the keyword check now baked into
-- generate-engine-import-migrations.mjs's stripGearboxDrivetrainItems() -- this is
-- the one-time cleanup for what that check would have stopped had it existed
-- already; nothing here is expected to recur.
--
-- DESTRUCTIVE (DELETE of existing data) -- review-only, human-run, in a fresh SQL
-- editor tab. Row ids are matched exactly (not just text), so this can't delete
-- anything beyond the 10 rows identified live when this file was written.

BEGIN;

-- Precondition: exactly these 10 ids exist, each still matching the fault text
-- recorded below -- abort if live state drifted since this file was generated.
DO $$
DECLARE
  mismatched_n integer;
BEGIN
  SELECT count(*) INTO mismatched_n FROM (VALUES
    ('374a4e27-0d72-429b-890e-40b4fe1a827d'::uuid, 'DQ200 on auto'::text),
    ('3bc9ff81-615b-4b78-9782-79ac9b4a4a76'::uuid, 'Paired with DQ200 on auto'::text),
    ('0aed1fb7-65b2-4ca1-be41-4788fcc58c41'::uuid, 'Paired with DQ200 on FWD'::text),
    ('4699c044-7038-4137-bbab-5b2a45338651'::uuid, 'Haldex coupling fluid change every 60k km'::text),
    ('0d924a12-8860-4025-b0c1-7d7eda7f78c0'::uuid, 'Haldex coupling requires 60k km oil change'::text),
    ('593d7860-5ed5-4db6-97b7-c7f4e032f75d'::uuid, 'Haldex coupling needs 60k km oil change'::text),
    ('40e0113d-6590-473f-a4da-2baf6d4728f9'::uuid, 'DQ200 on auto'::text),
    ('89d1c0ee-34f8-4ff8-b705-17dc202719db'::uuid, 'Haldex coupling requires 60k km oil change'::text),
    ('eac57944-2f5e-4334-85c4-f70062542b6e'::uuid, 'DQ200 on auto'::text),
    ('2bbd95c7-b264-4efe-8f4c-10f346a743ba'::uuid, 'Torque steer on FWD'::text)
  ) AS expected(id, fault)
  LEFT JOIN catalog_component_faults ccf ON ccf.id = expected.id AND ccf.fault = expected.fault
  WHERE ccf.id IS NULL;
  IF mismatched_n <> 0 THEN
    RAISE EXCEPTION '% of the % targeted rows no longer match by id+fault text -- live state has drifted, aborting rather than deleting the wrong rows.', mismatched_n, 10;
  END IF;
END $$;

-- DADA@110: "DQ200 on auto"
DELETE FROM catalog_component_faults WHERE id = '374a4e27-0d72-429b-890e-40b4fe1a827d';
-- DADA@110: "Paired with DQ200 on auto"
DELETE FROM catalog_component_faults WHERE id = '3bc9ff81-615b-4b78-9782-79ac9b4a4a76';
-- DADA@110: "Paired with DQ200 on FWD"
DELETE FROM catalog_component_faults WHERE id = '0aed1fb7-65b2-4ca1-be41-4788fcc58c41';
-- CRBC@110: "Haldex coupling fluid change every 60k km"
DELETE FROM catalog_component_faults WHERE id = '4699c044-7038-4137-bbab-5b2a45338651';
-- DFGA@110: "Haldex coupling requires 60k km oil change"
DELETE FROM catalog_component_faults WHERE id = '0d924a12-8860-4025-b0c1-7d7eda7f78c0';
-- DFGA@110: "Haldex coupling needs 60k km oil change"
DELETE FROM catalog_component_faults WHERE id = '593d7860-5ed5-4db6-97b7-c7f4e032f75d';
-- CZDA@110: "DQ200 on auto"
DELETE FROM catalog_component_faults WHERE id = '40e0113d-6590-473f-a4da-2baf6d4728f9';
-- DNFG@235: "Haldex coupling requires 60k km oil change"
DELETE FROM catalog_component_faults WHERE id = '89d1c0ee-34f8-4ff8-b705-17dc202719db';
-- DFYA@110: "DQ200 on auto"
DELETE FROM catalog_component_faults WHERE id = 'eac57944-2f5e-4334-85c4-f70062542b6e';
-- CJXC@221: "Torque steer on FWD"
DELETE FROM catalog_component_faults WHERE id = '2bbd95c7-b264-4efe-8f4c-10f346a743ba';

-- Postcondition: none of the 10 ids remain.
DO $$
DECLARE
  remaining_n integer;
BEGIN
  SELECT count(*) INTO remaining_n FROM catalog_component_faults
  WHERE id IN ('374a4e27-0d72-429b-890e-40b4fe1a827d', '3bc9ff81-615b-4b78-9782-79ac9b4a4a76', '0aed1fb7-65b2-4ca1-be41-4788fcc58c41', '4699c044-7038-4137-bbab-5b2a45338651', '0d924a12-8860-4025-b0c1-7d7eda7f78c0', '593d7860-5ed5-4db6-97b7-c7f4e032f75d', '40e0113d-6590-473f-a4da-2baf6d4728f9', '89d1c0ee-34f8-4ff8-b705-17dc202719db', 'eac57944-2f5e-4334-85c4-f70062542b6e', '2bbd95c7-b264-4efe-8f4c-10f346a743ba');
  IF remaining_n <> 0 THEN
    RAISE EXCEPTION 'Expected all 10 targeted rows deleted, % remain.', remaining_n;
  END IF;
END $$;

COMMIT;
