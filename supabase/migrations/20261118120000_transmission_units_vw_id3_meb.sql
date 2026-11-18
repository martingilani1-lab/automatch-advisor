-- Two new transmission_units reference rows for the Volkswagen ID.3 (E1), a prerequisite of
-- 20261118120500_seed_vw_id3_e1.sql (CLAUDE.md rule 2b: the car import never creates gearbox rows).
--
-- WHY (Martin, 2026-11-18, decision V4 in docs/intake/research/vw-id3-e1.md):
--   * 'VW 0MH' -- the single-speed, two-stage reduction gear behind the APP310 motor (ADAC motor code EBJ:
--     ID.3 2020 - 05/2024). Code from the MEB owners' wiki meinid.com: "1-Gang-Getriebe 0MH", "Das Getriebe
--     ist beim ID.3 & ID.4 baugleich", "ID.3 hat eine Übersetzung von 11,531". Forum-level source; VW itself
--     only says "one-speed gearbox" (press kit 02/2023). ADAC: "Getriebeart Reduktionsgetriebe, Anzahl Gänge 1".
--   * 'generic:Single-speed EV (MEB 2024)' -- the reduction gear of the 2024+ ID.3 (ADAC motor codes EDC / EDF /
--     EEW, 05/2024 - 04/2026). No gearbox code was found. Kept apart from 0MH because VW introduced a new drive
--     unit with "around 550 Nm" (newsroom 12.04.2023, "The drive system with gearbox, rotor and stator will be
--     produced at the Volkswagen Group Components plant in Kassel") and no source says the gearbox is the 0MH.
-- Near-duplicate check (scripts/audit-reference-duplicates.mjs --check-new transmissions "Volkswagen Group"
-- single_speed 1): no live 'Volkswagen Group' single_speed row exists (read via MCP 2026-11-18). The two new rows
-- form a group with each other -- reviewed DISTINCT for the reason above and added to
-- scripts/known-distinct-reference-groups.json in the same commit.
--
-- Ratings 5 (Martin, W6): no gearbox fault pattern found in ADAC / DVSA / KBA recalls or the owner sources read.
-- Service: none -- no gearbox-oil interval in the VW ID. service schedule ("spätestens nach zwei Jahren … mit
-- Wechsel von Bremsflüssigkeit und Innenraumfilter", volkswagen.at); written in maintenance_note, interval N/A.
--
-- Additive INSERT of reference data. May run via the Supabase MCP after Martin's review.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.transmission_units
   WHERE code IN ('VW 0MH', 'generic:Single-speed EV (MEB 2024)')
      OR 'VW 0MH' = ANY (coalesce(alt_codes, '{}'));
  IF n <> 0 THEN RAISE EXCEPTION 'An ID.3 gearbox code already exists (% rows) -- rolled back', n; END IF;

  INSERT INTO public.transmission_units
    (code, family, maker, speeds, reliability_rating, reliability_note, maintenance_note, pros, cons)
  VALUES
    ('VW 0MH', 'single_speed', 'Volkswagen Group', 1, 5,
     'Single-speed, two-stage reduction gear and differential on the rear axle, behind the APP310 motor of the MEB cars (ID.3 2020 - 05/2024, ID.4). Ratio 11.531 in the ID.3. One fixed gear, no clutch or torque converter. No fault pattern or recall for the gearbox itself was found (ADAC, UK DVSA, owner forums).',
     'One fixed gear: no clutch, filter or torque converter. The Volkswagen ID. service schedule (every 2 years: brake fluid, cabin filter) has no gearbox-oil change.',
     ARRAY['No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox']::text[],
     ARRAY['Gearbox code from owner sources only -- VW does not publish it']::text[]),
    ('generic:Single-speed EV (MEB 2024)', 'single_speed', 'Volkswagen Group', 1, 5,
     'Single-speed reduction gear and differential on the rear axle of the 2024+ MEB drive (ID.3 Pure / Pro / Pro S from 05/2024, GTX, GTX Performance; up to 545 Nm). Gearbox code not published. No fault pattern or recall for the gearbox itself was found.',
     'One fixed gear: no clutch, filter or torque converter. The Volkswagen ID. service schedule (every 2 years: brake fluid, cabin filter) has no gearbox-oil change.',
     ARRAY['No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox']::text[],
     ARRAY['Newer unit (2024): little long-term data yet']::text[]);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected to insert 2 gearbox rows, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
