-- PART B (engines + 2 new faults only — see note at bottom on configs) of
-- the Octavia I (1U) full-spec seed. Additive INSERT only — reviewable, then
-- runnable via MCP once reviewed, per the Supabase/data-access rules.
--
-- PREREQUISITE for the ALH fault insert only (not the engines below it):
-- run 20260923100000_split_agr_asv_alt_codes.sql FIRST — ALH doesn't exist
-- as its own row until that split runs. The 12 engine inserts below have no
-- such dependency and are safe to run standalone.
--
-- Reconcile-verify (live DB via MCP, read-only, before writing this file):
-- none of the 12 codes below, or their alt codes, exist anywhere in
-- catalog_engines today (checked both the primary `code` column and inside
-- every existing row's `alt_codes`) — all 12 are genuine CREATE, not reuse.
-- 02K/02J/02M/01M transmissions and haldex_gen1 already exist from the first
-- Octavia I seed — REUSE, not recreated here.

-- ════════════════════════════════════════════════════════════
-- Engines (12 new)
-- ════════════════════════════════════════════════════════════

-- displacement_cc was NOT in your spec message — filled in from the
-- well-established real-world EA827/EA111 family specs for these exact
-- codes (1.6 MPI/1.8 20V-1.8T/2.0 MPI/1.4/1.9 SDI-TDI = 1598/1781/1984/1390/
-- 1896cc respectively), same sourcing discipline as the first Octavia I
-- seed. Review before running.
--
-- Two pairs share identical (power_kw, displacement) under different codes
-- (APK/AZH both 2.0 MPI 85kW; and AGU from the first seed / ARX here both
-- 1.8T 110kW) — real-world emissions-revision and FWD-vs-4x4 variants of the
-- same output, not a duplication. The unique key is (code, power_kw), so
-- both sit fine as separate rows.
insert into catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, alt_codes)
values
  ('AEE', '1.6 MPI', 1598, 55, 'petrol', '{}'),
  ('AKL', '1.6 MPI', 1598, 74, 'petrol', array['AEH']),
  ('BFQ', '1.6 MPI', 1598, 75, 'petrol', array['AVU']),
  ('AGN', '1.8 20V', 1781, 92, 'petrol', '{}'),
  ('ARX', '1.8T (4x4)', 1781, 110, 'petrol', '{}'),
  ('APK', '2.0 MPI', 1984, 85, 'petrol', array['AQY']),
  ('AZH', '2.0 MPI', 1984, 85, 'petrol', array['AZJ']),
  ('AMD', '1.4 8V', 1390, 44, 'petrol', '{}'),
  ('AXP', '1.4 16V', 1390, 55, 'petrol', array['BCA']),
  ('AGP', '1.9 SDI', 1896, 50, 'diesel', array['AQM']),
  ('ATD', '1.9 TDI PD', 1896, 74, 'diesel', '{}'),
  ('ASZ', '1.9 TDI PD', 1896, 96, 'diesel', '{}')
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- Component faults (02K's fault already exists — not duplicated here;
-- AGR gets no fault, per your instruction)
-- ════════════════════════════════════════════════════════════

insert into catalog_component_faults (component_type, engine_id, transmission_id, fault, severity)
values (
  'transmission',
  null,
  (select id from catalog_transmissions where code = '01M'),
  'Shift-solenoid and ATF-related failures causing the transmission to default to limp-mode.',
  'critical'
);

-- Depends on 20260923100000 having run first (see PREREQUISITE above) —
-- this subquery resolves to nothing and silently inserts a NULL engine_id
-- otherwise, which would violate catalog_component_faults' exactly-one-of
-- CHECK. Run the split migration before this one.
insert into catalog_component_faults (component_type, engine_id, transmission_id, fault, severity)
values (
  'engine',
  (select id from catalog_engines where code = 'ALH'),
  null,
  'VNT (variable-nozzle turbine) vane sticking/seizing, causing boost issues and reduced power.',
  'moderate'
);

-- ════════════════════════════════════════════════════════════
-- NOTE: vehicle_configurations are NOT in this file.
-- ════════════════════════════════════════════════════════════
-- Your instruction said "CREATE the full config set from my final audit —
-- every pre-facelift and facelift combo (all petrol/diesel/SDI/AWD rows)"
-- but the actual combo list (which engine pairs with which transmission and
-- body type, per phase) wasn't included in your message — only the engine
-- list was. I'm not fabricating plausible-sounding combos for this (e.g.
-- guessing AMD only ever came with a 5-speed, or which engines got the 4x4
-- Combi body) — that's exactly the kind of guess this project's reconcile
-- discipline exists to prevent. Send the actual audit's config list (engine
-- + transmission + body type + drivetrain per phase, same shape as the 4
-- configs already seeded) and I'll write it as a follow-up additive file.
