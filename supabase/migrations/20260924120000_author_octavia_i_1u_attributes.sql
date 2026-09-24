-- Authors the attribute columns for Octavia I (1U). Unlike 1Z, the old flat
-- `vehicles` table has no Octavia I row, so these are hand-authored figures supplied
-- by Martin, not copied from existing data.
--
-- MODEL: catalog_models "Octavia" is shared by 1U and 1Z, and was already set to
-- segment 'C' / origin_country 'czech' by the 1Z backfill (confirmed live before
-- writing this file). No model UPDATE here — only an assertion below that the values
-- are still 'C'/'czech', so nothing is overwritten and a conflict would abort loudly.
--
-- PHASES: the two 1U phases carry DIFFERENT values (dimensions, weight, prices,
-- mileage), so each gets its own UPDATE, matched by (generation_code '1U',
-- phase_label). Each must touch exactly 1 row (2 total) and only fills rows whose
-- safety_rating is still NULL, so it cannot overwrite authored data.
--
-- ncap_year 2001 is kept with all four NCAP percentages NULL (unknown for this
-- generation; NULL reads as "unknown", never 0). resale_value_rating is mapped into
-- the CHECK vocabulary: "low" -> 'depreciates_fast' (pre-facelift), "medium" ->
-- 'average' (facelift). All values satisfy the CHECKs added in
-- 20260924100000 (safety_rating 4; resale in the allowed list).
--
-- UPDATE of existing rows: review-only, NOT executed.

do $$
declare
  n integer;
begin
  if not exists (
    select 1 from catalog_models cm
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Škoda' and cm.name = 'Octavia'
      and cm.segment = 'C' and cm.origin_country = 'czech'
  ) then
    raise exception 'catalog_models Octavia is not segment C / origin_country czech — run the 1Z backfill (20260924110000) first, or reconcile the model row; not overwriting.';
  end if;

  -- PRE-FACELIFT
  update catalog_phases cp
  set safety_rating          = 4,
      ncap_year              = 2001,
      ncap_adult_pct         = null,
      ncap_child_pct         = null,
      ncap_pedestrian_pct    = null,
      ncap_safety_assist_pct = null,
      length_mm              = 4511,
      width_mm               = 1731,
      height_mm              = 1429,
      curb_weight_kg         = 1205,
      ground_clearance_mm    = 134,
      boot_capacity_liters   = 528,
      boot_max_liters        = 1328,
      seats_count            = 5,
      towing_capacity_kg     = 1300,
      price_range_min_eur    = 700,
      avg_market_price_eur   = 1300,
      price_range_max_eur    = 2500,
      typical_mileage_range  = '300000 - 450000 km',
      resale_value_rating    = 'depreciates_fast'
  from catalog_models cm
  join catalog_brands cb on cb.id = cm.brand_id
  where cm.id = cp.model_id
    and cb.name = 'Škoda' and cm.name = 'Octavia'
    and cp.generation_code = '1U' and cp.phase_label = 'Pre-facelift'
    and cp.safety_rating is null;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected exactly 1 Octavia I (1U) Pre-facelift phase updated, % affected — aborting.', n;
  end if;

  -- FACELIFT
  update catalog_phases cp
  set safety_rating          = 4,
      ncap_year              = 2001,
      ncap_adult_pct         = null,
      ncap_child_pct         = null,
      ncap_pedestrian_pct    = null,
      ncap_safety_assist_pct = null,
      length_mm              = 4507,
      width_mm               = 1731,
      height_mm              = 1431,
      curb_weight_kg         = 1240,
      ground_clearance_mm    = 134,
      boot_capacity_liters   = 528,
      boot_max_liters        = 1328,
      seats_count            = 5,
      towing_capacity_kg     = 1300,
      price_range_min_eur    = 1000,
      avg_market_price_eur   = 2200,
      price_range_max_eur    = 4500,
      typical_mileage_range  = '250000 - 380000 km',
      resale_value_rating    = 'average'
  from catalog_models cm
  join catalog_brands cb on cb.id = cm.brand_id
  where cm.id = cp.model_id
    and cb.name = 'Škoda' and cm.name = 'Octavia'
    and cp.generation_code = '1U' and cp.phase_label = 'Facelift'
    and cp.safety_rating is null;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected exactly 1 Octavia I (1U) Facelift phase updated, % affected — aborting.', n;
  end if;
end $$;
