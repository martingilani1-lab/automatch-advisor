-- Adds a curated override for a vehicle's body-shape categorisation, used by
-- the Prehľad browse partition (app/api/cars/route.ts, tagCategories). Each
-- car lands in exactly one browse tile now, resolved via:
--   primary_body ?? body_type
-- body_type stays the DB's base body shape; primary_body is a hand-set
-- override for distinctions body_type doesn't make (e.g. liftback/sportback/
-- fastback variants currently indistinguishable from sedan/hatchback). This
-- migration is schema only — the column is left NULL for every row. Tagging
-- happens by hand afterward (see the candidate list generated alongside this
-- migration for which vehicles to review first).

alter table vehicles
  add column primary_body text check (primary_body is null or primary_body in (
    'city_car', 'hatchback', 'liftback', 'sedan', 'estate',
    'suv', 'crossover', 'minivan', 'pickup', 'van', 'coupe', 'convertible'
  ));
