-- Upserts 2 catalog_media rows: main front photos for Volkswagen Passat 3G (B8), Estate (Passat Variant).
--   volkswagen-passat-3g-pre-facelift-estate.webp -> Passat 3G Pre-facelift (2014–2019), Estate
--   volkswagen-passat-3g-facelift-estate.webp     -> Passat 3G Facelift (2019–2023), Estate
-- Facelift identified by the 2019 flat VW logo, wider grille chrome and "Passat Variant" plate;
-- pre-facelift by the older 3D logo and front bumper.
-- Source JPGs had a white background, cut out with rembg (isnet-general-use). Source width ~1024px, so the
-- WebPs are ~940px wide (not upscaled) -- enough for the list card and the detail hero.
--
-- Only photo for each phase, so each is the phase-wide main image (is_main) for the sedan body too
-- until sedan photos are added.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('060a14d9-ddc0-4953-a791-f7a4627d9030'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/volkswagen-passat-3g-pre-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('3967365a-6166-4faa-93d8-217b2a50c737'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/volkswagen-passat-3g-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE (phase_id, body_type_id, view_angle) IN (
    ('060a14d9-ddc0-4953-a791-f7a4627d9030'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, 'front'),
    ('3967365a-6166-4faa-93d8-217b2a50c737'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, 'front')
  );
  IF present_n <> 2 THEN
    RAISE EXCEPTION 'Expected 2 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
