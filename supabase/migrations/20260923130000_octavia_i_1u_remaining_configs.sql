-- Part B of the Octavia I (1U) full-spec seed: the remaining vehicle
-- configurations. Additive INSERT only — reviewable, then runnable via MCP
-- once reviewed, per the Supabase/data-access rules.
--
-- PREREQUISITE ORDER: this file depends on ALL of the following having run
-- first, in this order:
--   1. 20260923100000_split_agr_asv_alt_codes.sql        (ALH/AHF exist — confirmed live)
--   2. 20260923110000_octavia_i_1u_remaining_engines_and_faults.sql (12 engines incl. ARX — NOT yet live)
--   3. 20260923120000_repoint_agu_4x4_config_to_arx.sql   (needs ARX from #2)
-- Every engine/transmission/drivetrain code below must already exist for
-- the join to resolve a row at all — if any is missing, that combo simply
-- inserts nothing (the join drops it) rather than erroring, so run the
-- three files above first or this will silently under-populate.
--
-- BODY RULE (per your spec): every FWD combo gets BOTH Liftback and Combi
-- rows. Every 4x4/haldex combo is Combi-ONLY — no Liftback 4x4 (those never
-- existed). The 3 combos that already have a Liftback row from the earlier
-- seed (AGR+02J pre-facelift, ASV+02J facelift, AUQ+02J facelift) only get
-- their missing Combi row added here, not a duplicate Liftback. The 4th
-- already-existing config (the 4x4, now ARX+02M+haldex_gen1 after the
-- re-point file above) is not touched by this file at all.
--
-- Uses a VALUES table + joins to resolve every FK by code, rather than 48
-- repeated subqueries — still never a hand-typed UUID, same "resolve by
-- code" discipline, just less repetitive for a set this size. The trailing
-- ON CONFLICT matches the table's own COALESCE-based unique index, so this
-- is safe to re-run without duplicating anything (including the 3 "add
-- Combi" rows, which coexist with their pre-existing Liftback sibling as
-- distinct rows differing only in body_type_id).

with phases as (
  select id, phase_label from catalog_phases
  where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec' and generation_code = '1U'
),
bodies as (
  select id, name from catalog_body_types where name in ('Liftback', 'Combi')
),
combos(phase_label, body_name, engine_code, engine_power, trans_code, drivetrain_code) as (
  values
    -- ── Pre-facelift, FWD (both bodies) ──
    ('Pre-facelift', 'Liftback', 'AEE', 55, '02K', null),
    ('Pre-facelift', 'Combi',    'AEE', 55, '02K', null),
    ('Pre-facelift', 'Liftback', 'AKL', 74, '02K', null),
    ('Pre-facelift', 'Combi',    'AKL', 74, '02K', null),
    ('Pre-facelift', 'Liftback', 'AKL', 74, '01M', null),
    ('Pre-facelift', 'Combi',    'AKL', 74, '01M', null),
    ('Pre-facelift', 'Liftback', 'AGN', 92, '02J', null),
    ('Pre-facelift', 'Combi',    'AGN', 92, '02J', null),
    ('Pre-facelift', 'Liftback', 'AGU', 110, '02J', null),
    ('Pre-facelift', 'Combi',    'AGU', 110, '02J', null),
    ('Pre-facelift', 'Liftback', 'APK', 85, '02J', null),
    ('Pre-facelift', 'Combi',    'APK', 85, '02J', null),
    ('Pre-facelift', 'Liftback', 'APK', 85, '01M', null),
    ('Pre-facelift', 'Combi',    'APK', 85, '01M', null),
    ('Pre-facelift', 'Liftback', 'AGP', 50, '02J', null),
    ('Pre-facelift', 'Combi',    'AGP', 50, '02J', null),
    ('Pre-facelift', 'Combi',    'AGR', 66, '02J', null),  -- Liftback already exists; Combi added
    ('Pre-facelift', 'Liftback', 'AGR', 66, '01M', null),
    ('Pre-facelift', 'Combi',    'AGR', 66, '01M', null),
    ('Pre-facelift', 'Liftback', 'AHF', 81, '02J', null),
    ('Pre-facelift', 'Combi',    'AHF', 81, '02J', null),
    -- ── Pre-facelift, 4x4 (Combi only) ──
    ('Pre-facelift', 'Combi',    'AGR', 66, '02M', 'haldex_gen1'),

    -- ── Facelift, FWD (both bodies) ──
    ('Facelift', 'Liftback', 'AMD', 44, '02K', null),
    ('Facelift', 'Combi',    'AMD', 44, '02K', null),
    ('Facelift', 'Liftback', 'AXP', 55, '02K', null),
    ('Facelift', 'Combi',    'AXP', 55, '02K', null),
    ('Facelift', 'Liftback', 'BFQ', 75, '02J', null),
    ('Facelift', 'Combi',    'BFQ', 75, '02J', null),
    ('Facelift', 'Liftback', 'BFQ', 75, '01M', null),
    ('Facelift', 'Combi',    'BFQ', 75, '01M', null),
    ('Facelift', 'Liftback', 'AGU', 110, '02J', null),
    ('Facelift', 'Combi',    'AGU', 110, '02J', null),
    ('Facelift', 'Combi',    'AUQ', 132, '02J', null),  -- Liftback already exists; Combi added
    ('Facelift', 'Liftback', 'AZH', 85, '02J', null),
    ('Facelift', 'Combi',    'AZH', 85, '02J', null),
    ('Facelift', 'Liftback', 'AZH', 85, '01M', null),
    ('Facelift', 'Combi',    'AZH', 85, '01M', null),
    ('Facelift', 'Liftback', 'AGP', 50, '02J', null),
    ('Facelift', 'Combi',    'AGP', 50, '02J', null),
    ('Facelift', 'Liftback', 'ALH', 66, '02J', null),
    ('Facelift', 'Combi',    'ALH', 66, '02J', null),
    ('Facelift', 'Liftback', 'ALH', 66, '01M', null),
    ('Facelift', 'Combi',    'ALH', 66, '01M', null),
    ('Facelift', 'Combi',    'ASV', 81, '02J', null),  -- Liftback already exists; Combi added
    ('Facelift', 'Liftback', 'ASZ', 96, '02M', null),  -- explicitly FWD, despite 02M also pairing with haldex below
    ('Facelift', 'Combi',    'ASZ', 96, '02M', null),
    -- ── Facelift, 4x4 (Combi only) ──
    -- ARX+02M+haldex_gen1 is NOT here: that's the existing config, re-pointed
    -- from AGU by 20260923120000, not a new row.
    ('Facelift', 'Combi', 'AZH', 85, '02M', 'haldex_gen1'),
    ('Facelift', 'Combi', 'ATD', 74, '02M', 'haldex_gen1')
)
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)
select ph.id, bt.id, e.id, t.id, dt.id
from combos c
join phases ph on ph.phase_label = c.phase_label
join bodies bt on bt.name = c.body_name
join catalog_engines e on e.code = c.engine_code and e.power_kw = c.engine_power
join catalog_transmissions t on t.code = c.trans_code
left join drivetrain_systems dt on dt.code = c.drivetrain_code
on conflict (phase_id, body_type_id, engine_id, transmission_id, coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid))
do nothing;
