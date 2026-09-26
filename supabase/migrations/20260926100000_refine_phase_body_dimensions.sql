-- Replaces the duplicated per-generation representative values in phase_body_dimensions
-- with real per-body figures (Martin's authored table), and fills the three new
-- columns (gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters) that were
-- NULL after the dimensions move (20260924190000).
--
-- Each of the 8 rows (1U and 1Z x Pre-facelift/Facelift x Liftback/Combi) is matched by
-- (generation_code, phase_label, body type name) resolved through catalog_phases /
-- catalog_models / catalog_brands / catalog_body_types — never a hand-typed id.
--
-- Values are copied verbatim from the authored table; nothing inferred. Note the 1Z
-- Combi length equals the Liftback length (4572 / 4569 mm) in that table — carried
-- as given.
--
-- UPDATE of existing rows: review-only, NOT executed. ONE transaction; guards raise ->
-- whole file rolls back: each of the 8 (phase x body) targets must match exactly 1
-- phase_body_dimensions row, and the update must touch exactly 8 rows.

begin;

do $$
declare
  n integer;
  bad integer;
begin
  select count(*) into bad
  from (values
    ('1U','Pre-facelift','Liftback'), ('1U','Pre-facelift','Combi'),
    ('1U','Facelift','Liftback'),     ('1U','Facelift','Combi'),
    ('1Z','Pre-facelift','Liftback'), ('1Z','Pre-facelift','Combi'),
    ('1Z','Facelift','Liftback'),     ('1Z','Facelift','Combi')
  ) as t(gen, phase_label, body)
  where (
    select count(*)
    from phase_body_dimensions d
    join catalog_phases cp on cp.id = d.phase_id
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    join catalog_body_types bt on bt.id = d.body_type_id
    where cb.name = 'Škoda' and cm.name = 'Octavia'
      and cp.generation_code = t.gen and cp.phase_label = t.phase_label
      and bt.name = t.body
  ) <> 1;
  if bad <> 0 then
    raise exception '% of the 8 phase x body targets match 0 or >1 phase_body_dimensions rows — aborting.', bad;
  end if;

  update phase_body_dimensions d
  set length_mm                 = v.length_mm,
      width_mm                  = v.width_mm,
      height_mm                 = v.height_mm,
      ground_clearance_mm       = v.ground_clearance_mm,
      curb_weight_kg            = v.curb_weight_kg,
      boot_capacity_liters      = v.boot_capacity_liters,
      boot_max_liters           = v.boot_max_liters,
      gross_vehicle_weight_kg   = v.gross_vehicle_weight_kg,
      payload_kg                = v.payload_kg,
      fuel_tank_capacity_liters = v.fuel_tank_capacity_liters
  from (values
    ('1U','Pre-facelift','Liftback', 4511,1731,1429,134,1205, 528,1328,1710,505,55),
    ('1U','Pre-facelift','Combi',    4511,1731,1448,134,1245, 548,1512,1750,505,55),
    ('1U','Facelift',    'Liftback', 4507,1731,1431,134,1240, 528,1328,1750,510,55),
    ('1U','Facelift',    'Combi',    4513,1731,1455,134,1285, 548,1512,1795,510,55),
    ('1Z','Pre-facelift','Liftback', 4572,1769,1462,135,1295, 560,1420,1915,620,55),
    ('1Z','Pre-facelift','Combi',    4572,1769,1468,135,1310, 580,1620,1930,620,55),
    ('1Z','Facelift',    'Liftback', 4569,1769,1462,135,1295, 560,1420,1915,620,55),
    ('1Z','Facelift',    'Combi',    4569,1769,1468,135,1310, 580,1620,1930,620,55)
  ) as v(gen, phase_label, body, length_mm, width_mm, height_mm, ground_clearance_mm,
         curb_weight_kg, boot_capacity_liters, boot_max_liters,
         gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
  join catalog_phases cp on cp.generation_code = v.gen and cp.phase_label = v.phase_label
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  join catalog_body_types bt on bt.name = v.body
  where cb.name = 'Škoda' and cm.name = 'Octavia'
    and d.phase_id = cp.id and d.body_type_id = bt.id;
  get diagnostics n = row_count;
  if n <> 8 then
    raise exception 'Expected exactly 8 phase_body_dimensions rows updated, % affected — aborting.', n;
  end if;
end $$;

commit;
