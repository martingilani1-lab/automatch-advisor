-- BMW i3 (I01) REx: yearly maintenance of the range-extender generator, 30-65 EUR/year.
-- Confirmed by Martin 2026-11-15 (source M), from docs/intake/research/bmw-i3-i01-rex.md M8:
--   the REx needs one oil + filter service every 24 months and nothing else priced
--   (spark plugs and air filter are long-life; coolant is an inspection item).
--   low  ~31 EUR/yr = CZ independent-garage floor for a whole oil service (Cebia, 1 500 CZK = 61 EUR) / 2
--   high ~64 EUR/yr = DE independent garage (repareo, 128 EUR incl. VAT) / 2
--   rounded to 30-65; ADAC's DE dealer figure (75 EUR/yr) was the upper sanity check.
-- EV items (brake fluid, cabin filter, 12 V battery) are not included -- not modelled for the pure
-- i3 either (Martin 2026-11-14). With a figure set, the Costs tab shows the engine-servicing line
-- for these electric engines (tco.ts, commit 705d7d0).
--
-- UPDATE of existing rows -> Martin runs this in a fresh SQL editor tab (CLAUDE.md: UPDATE stays
-- human-run). Guarded: touches only the 6 REx engines while both columns are still NULL, and
-- rolls back unless exactly 6 rows change.

begin;

do $$
declare n integer;
begin
  update public.catalog_engines
     set yearly_maintenance_eur_min = 30,
         yearly_maintenance_eur_max = 65
   where code in ('i3-60Ah-REx', 'i3-94Ah-REx', 'i3-94Ah-REx-Euro6c', 'i3-94Ah-REx-Euro6dT',
                  'i3s-94Ah-REx-Euro6c', 'i3s-94Ah-REx-Euro6dT')
     and hybrid_type = 'EREV'
     and yearly_maintenance_eur_min is null
     and yearly_maintenance_eur_max is null;
  get diagnostics n = row_count;
  if n <> 6 then
    raise exception 'yearly maintenance: expected 6 REx engines, updated % -- rolling back.', n;
  end if;
end $$;

commit;
