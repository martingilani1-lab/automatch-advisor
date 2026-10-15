-- Upserts 1 catalog_media row: main front photo for Volkswagen Golf 5G (Golf 7) Facelift (2017–2020), Estate (Golf Variant).
-- File: public/catalog/volkswagen-golf-5g-facelift-estate.webp (transparent background, 1600px wide).
-- The supplied PNG already had an alpha channel; it was flattened onto white and re-cut with rembg
-- (isnet-general-use) to drop any semi-transparent halo from the earlier cutout -- same treatment as
-- 20261015201500 (Octavia 5E Facelift).
--
-- This is currently the phase's only photo, so it is the phase-wide main image (is_main) even on the
-- hatchback cards/pages of this phase until hatchback photos are added.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('81053926-e16f-48c3-8c0f-d9e700bfc85d'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/volkswagen-golf-5g-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM catalog_media
    WHERE phase_id = '81053926-e16f-48c3-8c0f-d9e700bfc85d'::uuid
      AND body_type_id = '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid
      AND view_angle = 'front'
  ) THEN
    RAISE EXCEPTION 'Expected catalog_media row for Golf 5G Facelift Estate, found none.';
  END IF;
END $$;

COMMIT;
