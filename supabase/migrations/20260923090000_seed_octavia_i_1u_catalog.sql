-- Seeds Škoda Octavia I (1U) into the catalog_ schema, per the "Adding a new
-- car / model" workflow (CLAUDE.md). Step 1 dictionary reconcile (run via
-- MCP, read-only, same session) confirmed:
--   - brand Škoda (9edda988-a494-4b13-90f1-de6418007716) and model Octavia
--     (39d151a4-599a-456b-84bf-daf7d4a459ec) already exist — REUSED, not
--     recreated. This is the SAME Octavia model row the 1Z phases hang off.
--   - body types Liftback/Combi already exist — REUSED.
--   - engines AGR/ALH/ASV/AHF/AGU/AUM/AUQ, transmissions 02K/02J/02M/01M, and
--     drivetrain haldex_gen1: none exist under any of those codes — all
--     CREATE. (Earlier this same session, 02J's real family was confirmed
--     distinct from MQ200/MQ250 — those two stay untouched by this seed.)
--
-- PREREQUISITE: run 20260923080000_add_catalog_engines_alt_codes.sql BEFORE
-- this file — the catalog_engines insert below populates alt_codes, which
-- doesn't exist on the live table yet (confirmed via the same reconcile
-- query). Running this file first will error on an unknown column.
--
-- Everything below is additive INSERT — reviewable, then runnable via MCP
-- per the Supabase/data-access rules (no DELETE/UPDATE/ALTER in this file).

-- ════════════════════════════════════════════════════════════
-- Phases
-- ════════════════════════════════════════════════════════════

insert into catalog_phases (model_id, generation_code, phase_label, year_from, year_to, display_name)
values
  ('39d151a4-599a-456b-84bf-daf7d4a459ec', '1U', 'Pre-facelift', 1996, 2000, 'Octavia I (1U) Pre-facelift'),
  ('39d151a4-599a-456b-84bf-daf7d4a459ec', '1U', 'Facelift', 2000, 2010, 'Octavia I (1U) Facelift');

-- ════════════════════════════════════════════════════════════
-- Engines (all CREATE — see reconcile note above)
-- ════════════════════════════════════════════════════════════

-- displacement_cc/display_name were NOT in your spec message — filled in
-- from the well-established real-world EA827/AHU-family specs for these
-- exact codes (1.9 TDI = 1896cc, 1.8 20V Turbo = 1781cc), not guessed from
-- context. Flagging since you dictated everything else explicitly; check
-- these two columns specifically before running.
insert into catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, alt_codes)
values
  ('AGR', '1.9 TDI', 1896, 66, 'diesel', array['ALH']),
  ('ASV', '1.9 TDI', 1896, 81, 'diesel', array['AHF']),
  ('AGU', '1.8T 20V', 1781, 110, 'petrol', array['AUM']),
  ('AUQ', '1.8T 20V RS', 1781, 132, 'petrol', array[]::text[])
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- Transmissions (all CREATE — do NOT reuse MQ200/MQ250, different families;
-- see this session's earlier reconcile correction)
-- ════════════════════════════════════════════════════════════

-- No ON CONFLICT here — catalog_transmissions has no unique constraint on
-- `code` (flagged separately, not fixed in this file). Reconcile-verify
-- confirmed none of these 4 codes exist yet, so a first run is safe; running
-- this file twice would duplicate them.
insert into catalog_transmissions (code, type, speeds)
values
  ('02K', 'manual', 5),
  ('02J', 'manual', 5),
  ('02M', 'manual', 6),
  ('01M', 'torque_converter', 4);

-- ════════════════════════════════════════════════════════════
-- Drivetrain — haldex_gen1 (references the EXISTING drivetrain_systems
-- table directly, not a catalog_ table)
-- ════════════════════════════════════════════════════════════

-- type = 'on_demand' per your explicit instruction — note this puts gen1 in
-- a different `type` bucket than haldex_gen2/gen4/gen5 (all type='haldex').
-- Both values are valid under the frozen CHECK vocabulary; flagging the
-- inconsistency across the Haldex family in case it wasn't deliberate.
--
-- description/reliability_note/maintenance_note authored to match the
-- gen2 entry's style (oil+filter ~60k km as the key service), since no
-- literal text was dictated for gen1 beyond "description as spec'd" —
-- written as the earliest, purely hydro-mechanical Haldex generation
-- (no electronic control at all), distinct from gen2's own description.
-- Review this content specifically.
insert into drivetrain_systems (code, type, generation, maker, description, reliability_note, maintenance_note)
values (
  'haldex_gen1',
  'on_demand',
  'Gen 1',
  'Haldex Traction',
  'The earliest Haldex coupling, fitted to mid/late-1990s VAG transverse 4x4 applications including the Octavia I (1U). Purely hydro-mechanical - no electronic control unit at all; a pump driven by the front/rear speed difference builds pressure against a pre-loaded accumulator to clamp the rear multi-plate clutch once slip has occurred. Coarser and slower-engaging than the later, electronically-managed generations.',
  'Mechanically simple and generally robust, but entirely dependent on regular oil and filter service - with no electronics to flag a developing fault, a neglected pump or clogged filter fails silently until AWD is simply gone. Pre-loaded accumulator and pump wear are the main age-related weak points.',
  'Haldex oil + filter change ~every 60k km, ~EUR 80-150 - the same critical interval as the later generations. No warning light for a failing pump on this generation, so skipping the service is easy to miss until AWD has already stopped working.'
)
on conflict (code) do update set
  type             = excluded.type,
  generation       = excluded.generation,
  maker            = excluded.maker,
  description      = excluded.description,
  reliability_note = excluded.reliability_note,
  maintenance_note = excluded.maintenance_note;

-- ════════════════════════════════════════════════════════════
-- Trims (header rows only — no per-trim equipment supplied yet for the 1U,
-- so no catalog_trim_features rows in this file; add those in a follow-up
-- once you have real spec data, same as the 1Z trims were done separately)
-- ════════════════════════════════════════════════════════════

-- RS is deliberately NOT a trim here (engine+config only), per your decision.
insert into catalog_trims (phase_id, name, tier)
values
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Pre-facelift'), 'LX', '1'),
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Pre-facelift'), 'GLX', '2'),
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Pre-facelift'), 'SLX', '3'),
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'), 'Classic', '1'),
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'), 'Ambiente', '2'),
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'), 'Elegance', '3'),
  -- Tour: budget run-out trim, tier '1' alongside Classic per your spec —
  -- there's no notes/description column on catalog_trims to record "budget
  -- run-out" itself, so it's captured here only as this comment.
  ((select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'), 'Tour', '1');

-- ════════════════════════════════════════════════════════════
-- Vehicle configurations
-- ════════════════════════════════════════════════════════════

-- FWD configs get drivetrain_id = NULL (no "FWD" row exists in
-- drivetrain_systems — that table only catalogues AWD/4WD hardware, same
-- convention as every prior drivetrain-pairing migration this session).
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)
values
  -- Pre-facelift: Liftback + AGR 1.9 TDI 66kW + 02J + FWD
  (
    (select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Pre-facelift'),
    (select id from catalog_body_types where name = 'Liftback'),
    (select id from catalog_engines where code = 'AGR' and power_kw = 66),
    (select id from catalog_transmissions where code = '02J'),
    null
  ),
  -- Facelift: Liftback + ASV 1.9 TDI 81kW + 02J + FWD
  (
    (select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'),
    (select id from catalog_body_types where name = 'Liftback'),
    (select id from catalog_engines where code = 'ASV' and power_kw = 81),
    (select id from catalog_transmissions where code = '02J'),
    null
  ),
  -- Facelift: Combi + AGU 1.8T 110kW + 02M + haldex_gen1
  (
    (select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'),
    (select id from catalog_body_types where name = 'Combi'),
    (select id from catalog_engines where code = 'AGU' and power_kw = 110),
    (select id from catalog_transmissions where code = '02M'),
    (select id from drivetrain_systems where code = 'haldex_gen1')
  ),
  -- Facelift: Liftback + AUQ 1.8T RS 132kW + 02J + FWD (the RS config)
  (
    (select id from catalog_phases where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U' and phase_label = 'Facelift'),
    (select id from catalog_body_types where name = 'Liftback'),
    (select id from catalog_engines where code = 'AUQ' and power_kw = 132),
    (select id from catalog_transmissions where code = '02J'),
    null
  )
on conflict (phase_id, body_type_id, engine_id, transmission_id, coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid))
do nothing;

-- ════════════════════════════════════════════════════════════
-- Component faults — transmission only (engine faults deferred, per your
-- note: "Plus any engine faults I supply later")
-- ════════════════════════════════════════════════════════════

insert into catalog_component_faults (component_type, engine_id, transmission_id, fault, severity)
values (
  'transmission',
  null,
  (select id from catalog_transmissions where code = '02K'),
  'Differential ring gear rivet shear puncturing the transmission housing casing.',
  'critical'
);
