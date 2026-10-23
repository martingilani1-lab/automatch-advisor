-- Adds 30 climate rows to catalog_trim_features (feature_group = 'climate'), from Martin's 2026-10-24
-- AC review of the 28 phases whose base trim listed no standard air conditioning.
-- Features are INCREMENTAL: each row goes only on the trim where the climate level first changes;
-- higher trims inherit it (so "Life / Elegance: 3-zone" = one row on Life, Elegance inherits).
-- Names reuse existing live spellings so the page shows one consistent label: "Manual air
-- conditioning" (39 live uses), "Dual-zone Climatronic" (= Martin's "2-zone"), "3-zone Climatronic",
-- "Automatic climate control", "Manual air conditioning (Climatic)".
--
-- Instructions mapped onto the trims that actually exist live:
--   Passat 3G FL     -- no tier-1 trim (lowest is Business), so "Base: Manual AC" has no target;
--                       3-zone Climatronic goes on Business, Elegance/R-Line inherit.
--   Touran 5T FL     -- only one trim live (R-Line), so it gets 3-zone Climatronic only.
--   Kamiq/Scala FL   -- Selection already has "Climatronic"; left as is (rename = an UPDATE, not done here).
--   Fabia PJ FL      -- "Top trims" = Monte Carlo (tier 3); Selection inherits Essence's manual A/C.
--   Octavia 1Z FL, León 1M FL, Bora 1J PF Basis, TT 8N PF, Signo/Elegance/Highline/Style --
--                       already carry the requested item; nothing added there.
--   Multivan T7      -- Style keeps its existing "3-zone Climatronic"; identical to the new Life row,
--                       so the Trims tab shows it as inherited.
-- Additive INSERT only. Guards: every target trim must match exactly one row, none may already have
-- a feature with the same name, and exactly 30 rows must be inserted.

BEGIN;

CREATE TEMP TABLE _ac (brand text, model text, gen text, phase text, trim_name text, feature text, is_optional boolean) ON COMMIT DROP;
INSERT INTO _ac VALUES
  ('Škoda', 'Kamiq', 'NW4', 'Facelift', 'Essence', 'Manual air conditioning', false),
  ('Škoda', 'Scala', 'NW1', 'Facelift', 'Essence', 'Manual air conditioning', false),
  ('Škoda', 'Fabia', 'PJ', 'Facelift', 'Essence', 'Manual air conditioning', false),
  ('Škoda', 'Fabia', 'PJ', 'Facelift', 'Monte Carlo', 'Dual-zone Climatronic', false),
  ('Volkswagen', 'Passat', '3G', 'Facelift', 'Business', '3-zone Climatronic', false),
  ('Volkswagen', 'Polo', 'AW', 'Facelift', 'Polo', 'Manual air conditioning', false),
  ('Volkswagen', 'Polo', 'AW', 'Facelift', 'Style', 'Dual-zone Climatronic', false),
  ('Volkswagen', 'Polo', 'AW', 'Facelift', 'R-Line', 'Dual-zone Climatronic', false),
  ('Volkswagen', 'Taigo', 'CS', 'Pre-facelift', 'Taigo (Base)', 'Manual air conditioning', false),
  ('Volkswagen', 'Taigo', 'CS', 'Pre-facelift', 'Style', 'Dual-zone Climatronic', false),
  ('Volkswagen', 'Taigo', 'CS', 'Pre-facelift', 'R-Line', 'Dual-zone Climatronic', false),
  ('Volkswagen', 'Tiguan', 'AD1', 'Facelift', 'Tiguan', 'Manual air conditioning', false),
  ('Volkswagen', 'Tiguan', 'AD1', 'Facelift', 'Life', '3-zone Climatronic', false),
  ('Volkswagen', 'Touran', '5T', 'Facelift', 'R-Line', '3-zone Climatronic', false),
  ('Cupra', 'Terramar', 'KP', 'Pre-facelift', 'Cupra', '3-zone Climatronic', false),
  ('Audi', 'A3', '8L', 'Pre-facelift', 'Attraction', 'Manual air conditioning', true),
  ('Audi', 'A3', '8L', 'Pre-facelift', 'Ambiente', 'Manual air conditioning', false),
  ('Audi', 'TT', '8N', 'Facelift', 'Base', 'Automatic climate control', false),
  ('Audi', 'TT', '8S', 'Pre-facelift', 'TT', 'Manual air conditioning', false),
  ('Audi', 'TT', '8S', 'Pre-facelift', 'S line', 'Automatic climate control', false),
  ('Audi', 'TT', '8S', 'Facelift', 'TT', 'Manual air conditioning', false),
  ('Audi', 'TT', '8S', 'Facelift', 'S line', 'Automatic climate control', false),
  ('Škoda', 'Octavia', '1Z', 'Facelift', 'Ambition', 'Manual air conditioning (Climatic)', false),
  ('Volkswagen', 'Bora', '1J', 'Pre-facelift', 'Comfortline', 'Manual air conditioning', false),
  ('Volkswagen', 'Bora', '1J', 'Facelift', 'Comfortline', 'Manual air conditioning', false),
  ('SEAT', 'León', '1M', 'Pre-facelift', 'Stella', 'Manual air conditioning', true),
  ('SEAT', 'Toledo', '1M2', 'Pre-facelift', 'Stella', 'Manual air conditioning', true),
  ('SEAT', 'Toledo', '1M2', 'Facelift', 'Stella', 'Manual air conditioning', true),
  ('Volkswagen', 'Multivan', 'T7', 'Pre-facelift', 'Multivan', 'Manual air conditioning', false),
  ('Volkswagen', 'Multivan', 'T7', 'Pre-facelift', 'Life', '3-zone Climatronic', false);

DO $$
DECLARE bad integer; dup integer;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT a.brand, a.model, a.gen, a.phase, a.trim_name, count(t.id) c FROM _ac a
    LEFT JOIN catalog_brands b ON b.name = a.brand
    LEFT JOIN catalog_models m ON m.brand_id = b.id AND m.name = a.model
    LEFT JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = a.gen AND p.phase_label = a.phase
    LEFT JOIN catalog_trims t ON t.phase_id = p.id AND t.name = a.trim_name
    GROUP BY 1,2,3,4,5 HAVING count(t.id) <> 1) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% target trim(s) do not match exactly one trim', bad; END IF;

  SELECT count(*) INTO dup FROM _ac a
    JOIN catalog_brands b ON b.name = a.brand JOIN catalog_models m ON m.brand_id = b.id AND m.name = a.model
    JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = a.gen AND p.phase_label = a.phase
    JOIN catalog_trims t ON t.phase_id = p.id AND t.name = a.trim_name
    JOIN catalog_trim_features f ON f.trim_id = t.id AND f.feature = a.feature;
  IF dup <> 0 THEN RAISE EXCEPTION '% row(s) already exist', dup; END IF;
END $$;

CREATE TEMP TABLE _before ON COMMIT DROP AS SELECT count(*) n FROM catalog_trim_features;

INSERT INTO catalog_trim_features (trim_id, feature, is_optional, feature_group)
SELECT t.id, a.feature, a.is_optional, 'climate'
FROM _ac a
JOIN catalog_brands b ON b.name = a.brand JOIN catalog_models m ON m.brand_id = b.id AND m.name = a.model
JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = a.gen AND p.phase_label = a.phase
JOIN catalog_trims t ON t.phase_id = p.id AND t.name = a.trim_name;

DO $$
DECLARE added integer;
BEGIN
  SELECT (SELECT count(*) FROM catalog_trim_features) - (SELECT n FROM _before) INTO added;
  IF added <> 30 THEN RAISE EXCEPTION 'Expected 30 rows inserted, got %', added; END IF;
END $$;

COMMIT;
