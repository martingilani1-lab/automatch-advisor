-- Add the Haldex Gen 6 AWD system to drivetrain_systems -- surfaced by the Cupra León
-- (KL) intake (the facelift-tier VZ engine's Estate-only AWD variant), with no matching
-- row under any existing code (confirmed live via direct query: only haldex_gen1/gen2/
-- gen4/gen5 exist). Same prerequisite-migration discipline as the MQ281 transmission_units
-- addition -- this is reference data, not something generate-seed.mjs inserts inline.
--
-- Content supplied directly by the user (maker, reliability_note, generation,
-- description, maintenance_note) -- not authored or guessed.
--
-- id is NOT hand-specified: the table's `id` column has its own generation default
-- (confirmed by every existing row, including haldex_gen5, having a server-generated
-- UUID), and this project's standing convention is that every FK resolves by code/name,
-- never a hand-typed UUID. The id value included in the user's supplied data is not used.

do $$
begin
  if exists (select 1 from drivetrain_systems where code = 'haldex_gen6') then
    raise exception 'drivetrain_systems already has haldex_gen6 -- aborting, nothing inserted.';
  end if;
end $$;

insert into drivetrain_systems (code, type, maker, reliability_note, generation, description, maintenance_note)
values (
  'haldex_gen6',
  'haldex',
  'BorgWarner',
  'Generally reliable but inherits Gen 5''s main vulnerability: the electric pump strainer gets clogged with clutch friction material. The new brushless pump motor improves electrical longevity, but mechanical blockages still cause AWD failure.',
  'Gen 6',
  'Successor to Gen 5 used in the MQB Evo platform. Features a new integrated control unit and brushless DC motor to save weight (~1kg lighter) and improve reaction times. Still a FWD-based wet multi-plate clutch system. VAG badges it quattro / 4MOTION / 4x4 / 4Drive.',
  'Haldex oil every 60k km or 3 years. Like Gen 5, the pump screen must be physically removed and cleaned during the oil change to prevent premature pump death.'
);

-- Post-condition: exactly one new row.
do $$
declare
  found_n integer;
begin
  select count(*) into found_n from drivetrain_systems where code = 'haldex_gen6';
  if found_n <> 1 then
    raise exception 'Expected 1 new drivetrain_systems row (haldex_gen6), found %.', found_n;
  end if;
end $$;
