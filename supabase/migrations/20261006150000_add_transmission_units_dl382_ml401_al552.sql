-- Adds transmission_units reference pages for 3 real gearbox codes that came up while
-- authoring the Audi A4 (B9) intake document and were confirmed STOPping
-- intake-to-template.mjs (no live transmission_units match, checked code and alt_codes
-- across every row -- confirmed again directly before writing this file): DL382, ML401,
-- AL552. Prerequisite to seeding A4 (B9) -- per CLAUDE.md rule 2b, there is no CREATE path
-- for a gearbox inline in a car's own seed; a missing unit is its own reviewed migration,
-- done and signed off first.
--
-- torsen_t3 (section F of that same intake document) is deliberately NOT added here --
-- see the reuse-vs-new comparison in the report accompanying this migration. It's very
-- likely the same physical system as the already-live `quattro_torsen` drivetrain_systems
-- row (Torsen-based permanent mechanical AWD, the system real B9 V6 Tiptronic quattro
-- applications actually use), not a genuinely new system -- Martin's call, not assumed here.
--
-- code/alt_codes follow the established convention (see "VW DQ500"/alt_codes:["DQ500"],
-- "Jatco 09A (JF506E)", "Aisin 09G (TF-60SN)"): `code` is "<real manufacturer> <bare
-- code>", `alt_codes` holds the bare code alone so a CSV/intake unit_code like "DL382"
-- resolves via the alt_codes match, same as every existing row. DL382 and ML401 are VW
-- Group in-house longitudinal designs (maker "Audi", matching how "VW DQ381"/"VW MQ200"
-- use the car brand for in-house units) -- AL552 is Audi-specific hardware but ZF-sourced
-- (the ZF 8HP architecture already used under several other makers' Tiptronic/Steptronic
-- branding in this catalog), so it follows the Jatco/Aisin precedent instead and uses the
-- real manufacturer "ZF" as maker/prefix.
--
-- reliability_note/maintenance_note on all 3 rows are marked DRAFT -- best-effort from
-- general knowledge of these specific real units, NOT verified against a workshop manual
-- or live fleet data the way most of this catalog's existing notes were. Flagged exactly
-- as asked: for Martin's review before being treated as authoritative. speeds/family are
-- NOT marked draft -- those are well-documented mechanical facts (7-speed wet dual-clutch,
-- 6-speed manual, 8-speed torque-converter automatic respectively), not editorial content.
--
-- Pure additive INSERT, no existing row touched: file-only per the standing discipline,
-- but may run via MCP once reviewed (see CLAUDE.md "Supabase/data-access rules").

insert into transmission_units (code, family, maker, speeds, alt_codes, reliability_note, maintenance_note)
values
  (
    'Audi DL382',
    'dct_wet',
    'Audi',
    7,
    array['DL382'],
    'DRAFT (for Martin''s review, not yet verified against a workshop source): a lighter-duty 7-speed wet dual-clutch for the longitudinal MLB Evo platform (B9 A4/A5, Q5-generation), positioned below the 8-speed ZF Tiptronic for lower-torque 4-cylinder applications. Wet-clutch construction generally fares better than the transverse dry-clutch DQ200/DQ381 family on reliability.',
    'DRAFT (for Martin''s review): fluid and filter change recommended around every 60,000 km, consistent with every other wet dual-clutch unit in this catalog -- VAG does not sell this as a lifetime-fill unit.'
  ),
  (
    'Audi ML401',
    'manual',
    'Audi',
    6,
    array['ML401'],
    'DRAFT (for Martin''s review, not yet verified against a workshop source): a 6-speed manual for the longitudinal MLB Evo platform, used on the lower-power 4-cylinder A4 (B9) variants. Manuals on this platform are generally very reliable; the dual-mass flywheel (a separate component, not part of this transmission unit) is the more common wear point when paired with the diesel engines.',
    'DRAFT (for Martin''s review): no scheduled fluid change in VAG''s own service schedule for this unit (lifetime fill); clutch wear (a separate wear item) is the practical maintenance driver, not the gearbox itself.'
  ),
  (
    'ZF AL552',
    'torque_converter',
    'ZF',
    8,
    array['AL552'],
    'DRAFT (for Martin''s review, not yet verified against a workshop source): Audi''s internal code for a ZF 8HP-based 8-speed torque-converter automatic in longitudinal MLB Evo applications, used with the higher-output V6 engines (paired with quattro in this catalog''s A4 B9 intake). Same underlying ZF 8HP architecture already represented elsewhere in this catalog under other makers'' Tiptronic/Steptronic branding -- generally a strong reliability reputation.',
    'DRAFT (for Martin''s review): VAG markets this as a lifetime fill, but every other ZF 8HP-based unit already in this catalog carries a real-world recommendation of a fluid change around every 80,000 km regardless -- likely applies here too, flagged rather than assumed identical without Martin confirming the same figure for this specific application.'
  );

-- Post-condition: exactly 3 rows now resolve for DL382/ML401/AL552 (by alt_codes), 0 for
-- torsen_t3 (confirming it was correctly left untouched by this file).
do $$
declare
  added_n integer;
begin
  select count(*) into added_n
  from transmission_units
  where alt_codes && array['DL382', 'ML401', 'AL552']::text[];
  if added_n <> 3 then
    raise exception 'Expected 3 new transmission_units rows (DL382, ML401, AL552), found %.', added_n;
  end if;
end $$;
