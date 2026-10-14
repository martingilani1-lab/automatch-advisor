-- Upserts 2 catalog_media rows for the first two car photos. The WebP files (transparent
-- background, max 1600px wide) are already in public/catalog/. They were background-removed
-- outside scripts/media/process-images.py (rembg, isnet-general-use model) because uploading
-- the originals into scripts/media/incoming/ kept failing in the Codespace -- same output
-- shape the script produces, same row shape, same ON CONFLICT key, so a later run of the
-- script for these two names simply upserts over them.
--
--   skoda-octavia-5e-pre-facelift-estate.webp   -> Škoda Octavia 5E Pre-facelift, Estate   (white car)
--   skoda-octavia-nx-pre-facelift-liftback.webp -> Škoda Octavia NX Pre-facelift, Liftback
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on
-- 2026-10-14, not inferred from migration files. catalog_media had 0 rows and no
-- (phase_id, body_type_id, view_angle) unique index at that point.
--
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

-- Same index scripts/media/process-images.py creates, so re-runs upsert instead of duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS catalog_media_phase_body_angle_key
  ON catalog_media (phase_id, body_type_id, view_angle);

-- skoda-octavia-5e-pre-facelift-estate.webp
INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('e81495d8-57eb-4de0-b00f-5fedefc2a45d'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid,
        '/catalog/skoda-octavia-5e-pre-facelift-estate.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

-- skoda-octavia-nx-pre-facelift-liftback.webp
INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('0fe09538-553a-4309-8936-823626f13353'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid,
        '/catalog/skoda-octavia-nx-pre-facelift-liftback.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

-- Postcondition: exactly 2 rows now exist for these specific (phase, body, angle) triples.
DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE (phase_id, body_type_id, view_angle) IN (
    ('e81495d8-57eb-4de0-b00f-5fedefc2a45d'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, 'front'),
    ('0fe09538-553a-4309-8936-823626f13353'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, 'front')
  );
  IF present_n <> 2 THEN
    RAISE EXCEPTION 'Expected 2 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
