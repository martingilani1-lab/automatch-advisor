-- Upserts 3 catalog_media rows: extra-body photos Martin sent 2026-10-22 (sixth batch). All three are
-- facelift fronts, so they go on the Facelift phases only:
--   VW T-Roc A11      Facelift (2022–)       Cabriolet 2-door  blue  (light bar in grille, new headlights)
--   VW Passat 3G      Facelift (2019–2023)   Sedan 4-door      black (IQ.Light, new VW logo)
--   VW New Beetle 9C  Facelift (2005–2010)   Cabriolet 2-door  beige (2005 bumpers, indicator in bumper)
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('f6347cc2-15b9-4d45-8fb2-6f5767a8c6a4'::uuid, 'd3fd58d9-cdd6-4059-9909-e431a527132d'::uuid, '/catalog/volkswagen-t-roc-a11-facelift-cabriolet-2-door.webp', 'front', true),
  ('3967365a-6166-4faa-93d8-217b2a50c737'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/volkswagen-passat-3g-facelift-sedan-4-door.webp', 'front', true),
  ('a83777bd-8f53-4ce0-9b14-4c109512e9b0'::uuid, 'd3fd58d9-cdd6-4059-9909-e431a527132d'::uuid, '/catalog/volkswagen-new-beetle-9c-facelift-cabriolet-2-door.webp', 'front', true)
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
