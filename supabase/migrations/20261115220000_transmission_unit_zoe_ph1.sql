-- New transmission_units reference row for the Renault Zoe (X10) Phase 1 (2013-2019), a
-- prerequisite of 20261115220500_seed_renault_zoe_x10_phase_1.sql (CLAUDE.md rule 2b: the car
-- import never creates gearbox rows).
--
-- WHY A NEW ROW (Martin, 2026-11-15, decision P3 in docs/intake/research/renault-zoe-x10-phase-1.md):
-- no source shows that Phase 1 (Continental Q210 / Q90 or Renault R240 / R90 / R110 motor) uses the
-- same reducer as Phase 2's R110 / R135, so the live 'generic:Single-speed EV (Zoe Ph2)' is not
-- reused. maker stays NULL: in-house EV reduction gear, no named supplier (same approved exception
-- as the i3 and Zoe Phase 2 rows). With maker NULL the near-duplicate check
-- (scripts/audit-reference-duplicates.mjs --check-new) has nothing to compare -- by design.
--
-- Facts:
--   "Typ prevodovky Redukčná prevodovka (jednostupňová) … Počet rýchlostí dopredu 1"
--     -- Renault Slovensko brochure 12/2016.
--   UK DVSA recalls R/2017/207 (built Jul 2015 - Jan 2016: "replace the parking brake mechanism and
--   park wheel inside the reducer") and R/2018/070 (built Nov 2016 - Apr 2017: "replace the gearbox
--   parking pin") -- fixed by the campaigns, so they don't lower the rating (RESEARCH-PROCESS.md).
--
-- Additive INSERT of reference data. May run via the Supabase MCP after Martin's review.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.transmission_units WHERE code = 'generic:Single-speed EV (Zoe Ph1)';
  IF n <> 0 THEN RAISE EXCEPTION 'generic:Single-speed EV (Zoe Ph1) already exists -- rolled back'; END IF;

  INSERT INTO public.transmission_units
    (code, family, maker, speeds, reliability_rating, reliability_note, maintenance_note, pros, cons)
  VALUES (
    'generic:Single-speed EV (Zoe Ph1)', 'single_speed', NULL, 1, 5,
    'Single-speed reduction gear and differential on the front axle, behind the Zoe Phase 1 motor (Continental Q210 / Q90 or Renault R240 / R90 / R110). One fixed gear, no clutch or torque converter. Two recall campaigns replaced the parking lock inside the reducer (cars built 07/2015-01/2016 and 11/2016-04/2017); no other fault pattern was found for the reducer itself.',
    'One fixed gear: no clutch, filter or torque converter to service. No reducer-oil interval was found in the Renault documents opened for 2013-2019.',
    ARRAY['No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox'],
    ARRAY['Cars built 07/2015-01/2016 and 11/2016-04/2017 were recalled because the reducer may not hold the car in P -- check the campaign was done']
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to insert 1 gearbox row, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
