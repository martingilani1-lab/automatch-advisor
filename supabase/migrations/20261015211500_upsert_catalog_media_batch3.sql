-- Upserts 3 catalog_media rows (main front photos):
--   volkswagen-passat-cj-pre-facelift-estate.webp   -> VW Passat CJ (B9) Pre-facelift (2024–), Estate
--   seat-toledo-1m2-pre-facelift-sedan-4-door.webp  -> SEAT Toledo 1M2 Pre-facelift (1998–2003), Sedan 4-door
--   skoda-octavia-1u-facelift-liftback.webp         -> Škoda Octavia 1U Facelift (2000–2010), Liftback
--
-- Phase calls: Octavia 1U = Facelift from the twin-reflector clear headlamps with the clear indicator
-- section (pre-facelift had single-reflector lamps). Toledo 1M2 = Pre-facelift: the 1M2 generation had
-- only minor visual changes, so this is the best-supported assignment, not a hard visual proof --
-- re-point it with a one-row update if Martin says otherwise.
-- Source JPGs had white backgrounds, cut out with rembg (isnet-general-use); ~950px wide, not upscaled.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('7f86371d-0ca3-46a4-ac2a-37b179eb072b'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/volkswagen-passat-cj-pre-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('d93d636f-e51f-48af-87a7-9f8e38f68900'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid,
        '/catalog/seat-toledo-1m2-pre-facelift-sedan-4-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('a7e5988c-f023-4e88-abe0-b6f34d5ff3e5'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid,
        '/catalog/skoda-octavia-1u-facelift-liftback.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE (phase_id, body_type_id, view_angle) IN (
    ('7f86371d-0ca3-46a4-ac2a-37b179eb072b'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, 'front'),
    ('d93d636f-e51f-48af-87a7-9f8e38f68900'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, 'front'),
    ('a7e5988c-f023-4e88-abe0-b6f34d5ff3e5'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, 'front')
  );
  IF present_n <> 3 THEN
    RAISE EXCEPTION 'Expected 3 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
