-- BMW i3 (I01): two phase price maxima and one REx pro -- Martin's decisions 2026-11-15
-- (docs/intake/research/bmw-i3-i01-rex.md, "Market + REx servicing", M5).
--
-- 1. Pre-facelift price_range_max_eur 15 000 -> 17 000. SK/CZ asking prices seen 2026-11-15 run
--    10 499 - 16 999 EUR (top: SK autobazar.eu i3 94 Ah 2017, 16 999); the 94 Ah EV median is
--    ~15 000 (SK) / ~15 800 (CZ), so the old max sat below the 94 Ah cars. Martin: "yes".
-- 2. Facelift price_range_max_eur 25 000 -> 27 000. Source M: Martin found facelift cars listed
--    above 25 000 EUR ("increase max line to 27k").
--    avg_market_price_eur / price_range_min_eur are not touched on either phase.
-- 3. REx phase price: Martin confirmed the phase-level price stays as it is for REx cars (no
--    separate REx price, no schema change) -- nothing to write.
-- 4. Pro on i3-60Ah-REx@125: the 60 Ah REx asks more than the 60 Ah EV -- median +21.7 % on
--    mobile.de DE (13 990 vs 11 500 EUR, n 10 / 13) and +6.6 % in CZ (n 2 / 2), listings seen
--    2026-11-15. Partly an age/mileage mix, so the wording says "usually".
--
-- UPDATE of existing rows -> Martin runs this in a fresh SQL editor tab (CLAUDE.md: UPDATE stays
-- human-run). Guarded: each step only touches the row while it still holds the old value and
-- rolls the whole file back unless exactly one row changes.

begin;

do $$
declare n integer;
begin
  update public.catalog_phases p
     set price_range_max_eur = 17000
    from public.catalog_models m, public.catalog_brands b
   where m.id = p.model_id and b.id = m.brand_id
     and b.name = 'BMW' and m.name = 'i3' and p.generation_code = 'I01'
     and p.phase_label = 'Pre-facelift' and p.price_range_max_eur = 15000;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'pre-facelift price max: expected 1 row at 15000, updated % -- rolled back', n; end if;

  update public.catalog_phases p
     set price_range_max_eur = 27000
    from public.catalog_models m, public.catalog_brands b
   where m.id = p.model_id and b.id = m.brand_id
     and b.name = 'BMW' and m.name = 'i3' and p.generation_code = 'I01'
     and p.phase_label = 'Facelift' and p.price_range_max_eur = 25000;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'facelift price max: expected 1 row at 25000, updated % -- rolled back', n; end if;

  update public.catalog_engines
     set pros = pros || array['Used 60 Ah REx cars usually ask more than the 60 Ah pure EV (SK/CZ and German listings, 2026) -- the range extender holds its value']::text[]
   where code = 'i3-60Ah-REx' and power_kw = 125
     and not ('Used 60 Ah REx cars usually ask more than the 60 Ah pure EV (SK/CZ and German listings, 2026) -- the range extender holds its value' = any(pros));
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'i3-60Ah-REx pro: expected 1 row, updated % -- rolled back', n; end if;
end $$;

commit;
