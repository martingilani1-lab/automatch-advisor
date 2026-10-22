-- Upserts 4 catalog_media rows: main front photos Martin sent 2026-10-22 (fifth batch).
--   Audi TT 8S       Pre-facelift (2014–2018)  Coupe 2-door      blue (horizontal-bar grille = pre-facelift)
--   Audi TT 8S       Pre-facelift (2014–2018)  Roadster 2-door   blue
--   Cupra León KL    Facelift (2024–)          Hatchback 5-door  blue -- STAND-IN
--   Cupra León KL    Facelift (2024–)          Estate            blue -- STAND-IN
-- The Cupra photos show the pre-facelift front (the 2024 facelift has triangular headlights); used so
-- the facelift phase has its own photo, different from the grey pre-facelift ones. Replace with a true
-- facelift photo when available (same ON CONFLICT key).
-- Roadster: background showing through the open top (A-pillar gap) was cleared after the cutout.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('7a0f64b5-657b-44cf-aea5-d8bd8b6d4ad1'::uuid, '979a003f-3bb2-4ade-b213-a12b52dbec1c'::uuid, '/catalog/audi-tt-8s-pre-facelift-coupe-2-door.webp', 'front', true),
  ('7a0f64b5-657b-44cf-aea5-d8bd8b6d4ad1'::uuid, '61f2c87d-aefd-41ab-97d2-66ef22f98a83'::uuid, '/catalog/audi-tt-8s-pre-facelift-roadster-2-door.webp', 'front', true),
  ('b9da5594-0cfe-495e-961c-abdc34dcd850'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/cupra-leon-kl-facelift-hatchback-5-door.webp', 'front', true),
  ('b9da5594-0cfe-495e-961c-abdc34dcd850'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/cupra-leon-kl-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n FROM (
    SELECT image_url FROM catalog_media GROUP BY image_url HAVING count(DISTINCT phase_id) > 1
  ) d;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Photo file(s) shared across phases: %', dup_n;
  END IF;
END $$;

COMMIT;
