-- Upserts 1 catalog_media row: main front photo for Škoda Octavia 5E Facelift (2017–2020), Estate.
-- File: public/catalog/skoda-octavia-5e-facelift-estate.webp (transparent background, 1600px wide).
-- The supplied PNG already had an alpha channel but carried a semi-transparent white halo from an
-- earlier cutout; it was flattened onto white and re-cut with rembg (isnet-general-use) to remove it.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Same ON CONFLICT key as 20261014204500 / scripts/media/process-images.py (the unique index
-- catalog_media_phase_body_angle_key already exists live; IF NOT EXISTS keeps this re-runnable).
--
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_media_phase_body_angle_key
  ON catalog_media (phase_id, body_type_id, view_angle);

-- skoda-octavia-5e-facelift-estate.webp
INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('1cb85ae3-720e-43d0-8195-bfc818434a8a'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/skoda-octavia-5e-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

-- Postcondition: the row exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM catalog_media
    WHERE phase_id = '1cb85ae3-720e-43d0-8195-bfc818434a8a'::uuid
      AND body_type_id = '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid
      AND view_angle = 'front'
  ) THEN
    RAISE EXCEPTION 'Expected catalog_media row for Octavia 5E Facelift Estate, found none.';
  END IF;
END $$;

COMMIT;
