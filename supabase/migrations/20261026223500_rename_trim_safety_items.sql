-- Renames 7 existing safety trim features where Martin's 2026-10-26 safety fill is more precise than the
-- older wording on the same trim (same system, so the insert file 20261026223000 skipped them):
--   Golf 1J PF Basis         "Dual airbags"                 -> "Dual front and side airbags"
--   León 1M PF Stella        "Driver and passenger airbags" -> "Dual front and side airbags"
--   Toledo 1M2 PF Stella     "Dual front airbags"           -> "Dual front and side airbags"
--   Octavia 1U PF GLX        "Passenger airbag"             -> "Dual front airbags"
--   Audi Q3 F3 Advanced      "Parking sensors"              -> "Rear parking sensors"
--   T-Cross C11 PF + FL Life "Parking sensors"              -> "Rear parking sensors"
-- feature_group / safety_feature_slug are unchanged (same group, same system).
-- Guarded: each rename must hit exactly one row. UPDATE of existing data: review-only, NOT run by this
-- session. Run in a FRESH Supabase SQL tab (any time after 20261026220500).

BEGIN;

CREATE TEMP TABLE _rn (model text, gen text, phase text, trim_name text, old_f text, new_f text) ON COMMIT DROP;
INSERT INTO _rn VALUES
  ('Golf',    '1J',  'Pre-facelift', 'Basis',    'Dual airbags',                 'Dual front and side airbags'),
  ('León',    '1M',  'Pre-facelift', 'Stella',   'Driver and passenger airbags', 'Dual front and side airbags'),
  ('Toledo',  '1M2', 'Pre-facelift', 'Stella',   'Dual front airbags',           'Dual front and side airbags'),
  ('Octavia', '1U',  'Pre-facelift', 'GLX',      'Passenger airbag',             'Dual front airbags'),
  ('Q3',      'F3',  'Pre-facelift', 'Advanced', 'Parking sensors',              'Rear parking sensors'),
  ('T-Cross', 'C11', 'Pre-facelift', 'Life',     'Parking sensors',              'Rear parking sensors'),
  ('T-Cross', 'C11', 'Facelift',     'Life',     'Parking sensors',              'Rear parking sensors');

DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT r.*, count(f.id) c FROM _rn r
    LEFT JOIN catalog_models m ON m.name = r.model
    LEFT JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = r.gen AND p.phase_label = r.phase
    LEFT JOIN catalog_trims t ON t.phase_id = p.id AND t.name = r.trim_name
    LEFT JOIN catalog_trim_features f ON f.trim_id = t.id AND f.feature = r.old_f
    GROUP BY 1,2,3,4,5,6 HAVING count(f.id) <> 1) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% rename target(s) do not match exactly one row', bad; END IF;
END $$;

UPDATE catalog_trim_features f SET feature = r.new_f
FROM _rn r, catalog_models m, catalog_phases p, catalog_trims t
WHERE m.name = r.model AND p.model_id = m.id AND p.generation_code = r.gen AND p.phase_label = r.phase
  AND t.phase_id = p.id AND t.name = r.trim_name AND f.trim_id = t.id AND f.feature = r.old_f;

COMMIT;
