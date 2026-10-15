-- Upserts 1 catalog_media row: main front photo for Volkswagen Golf 5G (Golf 7) Pre-facelift (2012–2016), Estate (Golf Variant).
-- File: public/catalog/volkswagen-golf-5g-pre-facelift-estate.webp (transparent background, 1600px wide).
-- Supplied PNG had an alpha channel; flattened onto white and re-cut with rembg (isnet-general-use) to drop
-- any semi-transparent halo -- same treatment as 20261015204500 (Golf 5G Facelift).
--
-- Only photo for this phase, so it is the phase-wide main image (is_main) for the hatchback bodies too
-- until hatchback photos are added.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('872f2db3-fb6a-4723-af94-54ceef345d3e'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/volkswagen-golf-5g-pre-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM catalog_media
    WHERE phase_id = '872f2db3-fb6a-4723-af94-54ceef345d3e'::uuid
      AND body_type_id = '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid
      AND view_angle = 'front'
  ) THEN
    RAISE EXCEPTION 'Expected catalog_media row for Golf 5G Pre-facelift Estate, found none.';
  END IF;
END $$;

COMMIT;
