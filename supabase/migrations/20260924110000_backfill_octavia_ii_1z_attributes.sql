-- Backfills the new attribute columns for Octavia II (1Z) from its old flat
-- `vehicles` row d17bdd2f-9f85-4148-a4c1-503beeec98e3 (read live before writing).
-- Old data is one-row-per-generation, so the SAME values go to BOTH 1Z phases
-- (Pre-facelift and Facelift) until a facelift re-test/spec is authored.
--
-- Octavia I (1U) is DELIBERATELY NOT BACKFILLED HERE: the old vehicles table has
-- no Octavia I row (only Octavia II/III/IV), so there is nothing to copy from. Its
-- 2 phases and any model-level values must be authored from a real source.
--
-- catalog_models "Octavia" is shared by 1U and 1Z. segment/origin_country come from
-- the 1Z row only; the old III (5E) and IV (NX) rows agree (C / czech), so no
-- conflict. Confirm 1U is also segment C / czech when you author it.
--
-- Column mapping: old typical_milage_range (sic) -> typical_mileage_range; every
-- other column keeps its name. ncap_safety_assist_pct is NULL in the old row
-- (pre-2009 protocol) and stays NULL. All values satisfy the new CHECKs
-- (safety_rating 5; NCAP 86/79/36 within 0-100; resale 'holds_well').
--
-- Known data caveat carried over as-is: the old top-level length 4572 mm and boot
-- 560 l match neither of that row's body_variants entries (liftback 4659 mm/595 l,
-- estate 4699 mm/633 l). Copied verbatim per instruction; re-author when per-body
-- precision is tackled.
--
-- UPDATE of existing rows: review-only, NOT executed. Each block aborts unless it
-- touches exactly the expected number of rows, and only fills rows whose columns are
-- still NULL (segment / safety_rating IS NULL guard) so it can't overwrite authored data.

do $$
declare
  n integer;
begin
  update catalog_models cm
  set segment = 'C',
      origin_country = 'czech'
  from catalog_brands cb
  where cb.id = cm.brand_id
    and cb.name = 'Škoda' and cm.name = 'Octavia'
    and cm.segment is null and cm.origin_country is null;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected to update exactly 1 catalog_models row (Škoda Octavia), % affected — aborting.', n;
  end if;

  update catalog_phases cp
  set safety_rating          = 5,
      ncap_year              = 2004,
      ncap_adult_pct         = 86,
      ncap_child_pct         = 79,
      ncap_pedestrian_pct    = 36,
      ncap_safety_assist_pct = null,
      seats_count            = 5,
      boot_capacity_liters   = 560,
      boot_max_liters        = 1420,
      towing_capacity_kg     = 1400,
      ground_clearance_mm    = 135,
      length_mm              = 4572,
      width_mm               = 1769,
      height_mm              = 1462,
      curb_weight_kg         = 1295,
      avg_market_price_eur   = 5500,
      price_range_min_eur    = 2500,
      price_range_max_eur    = 9500,
      typical_mileage_range  = '180,000 - 320,000 km',
      resale_value_rating    = 'holds_well'
  from catalog_models cm
  join catalog_brands cb on cb.id = cm.brand_id
  where cm.id = cp.model_id
    and cb.name = 'Škoda' and cm.name = 'Octavia'
    and cp.generation_code = '1Z'
    and cp.safety_rating is null;
  get diagnostics n = row_count;
  if n <> 2 then
    raise exception 'Expected to update exactly 2 Octavia II (1Z) phases, % affected — aborting.', n;
  end if;
end $$;
