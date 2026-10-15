-- Upserts 1 catalog_media row: VW Bora 1J Facelift (2001–2005), Sedan 4-door -- grey car, a DIFFERENT photo
-- from the black one on Pre-facelift (the shared row was removed in 20261015223000).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('0f9c70cb-f1e4-4ec9-acac-a209b9dbf71d'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/volkswagen-bora-1j-facelift-sedan-4-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

COMMIT;
