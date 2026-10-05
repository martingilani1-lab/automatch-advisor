-- Fill in reliability_note/maintenance_note for VW MQ281, deliberately left NULL
-- in 20261003110500_add_transmission_unit_mq281.sql because they weren't supplied
-- at seed time (batch-verify.mjs's new used-unit-notes check now correctly flags
-- this gap -- see cupra-leon-kl, seat-leon-kl, skoda-kamiq-nw4, skoda-scala-nw1,
-- vw-caddy-sb). This is an UPDATE of existing hand-authored reference data, so
-- per the standing rule it stays file-only, never auto-executed; the human runs
-- this.
--
-- Guarded on current state (code = 'VW MQ281', both notes currently NULL) so it
-- can't silently clobber a note someone already filled in by another path.
--
-- CORRECTED before first run: the real primary code on this row is 'VW MQ281' --
-- 'MQ281' is only its alt_code (confirmed live). The first version of this file
-- used code = 'MQ281' in every clause, which matched 0 rows and made the first
-- guard abort with "found 0" -- the guard did its job; it never reached the
-- UPDATE, so nothing was changed by that attempt. Fixed in place since this file
-- was still uncommitted and nothing had executed.

do $$
declare
  target_n integer;
begin
  select count(*) into target_n
  from transmission_units
  where code = 'VW MQ281'
    and reliability_note is null
    and maintenance_note is null;
  if target_n <> 1 then
    raise exception 'Expected exactly 1 transmission_units row for VW MQ281 with both notes still NULL, found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update transmission_units
set
  reliability_note = 'Highly efficient and generally reliable. Designed to reduce CO2 emissions using ultra-low friction bearings and very thin oil. Early units may exhibit minor synchro wear if driven aggressively before the fluid warms up.',
  maintenance_note = 'VAG considers the ultra-low viscosity gear oil a ''lifetime'' fill. However, for longevity—especially in heavier SUVs or when towing—a fluid change every 100,000 to 120,000 km is highly recommended.'
where code = 'VW MQ281';

-- Post-condition: exactly 1 row for VW MQ281, both notes now non-NULL.
do $$
declare
  filled_n integer;
begin
  select count(*) into filled_n
  from transmission_units
  where code = 'VW MQ281'
    and reliability_note is not null
    and maintenance_note is not null;
  if filled_n <> 1 then
    raise exception 'Expected 1 transmission_units row for VW MQ281 with both notes filled after update, found %.', filled_n;
  end if;
end $$;
