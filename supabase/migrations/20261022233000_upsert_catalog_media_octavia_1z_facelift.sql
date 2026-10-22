-- Upserts 2 catalog_media rows: Škoda Octavia 1Z Facelift (2009–2013), from one photo Martin sent
-- 2026-10-22 showing both bodies side by side -- split down the middle, each car cut out separately:
--   Liftback  red
--   Estate    beige (Combi)
-- Facelift front (wide chrome-framed grille, clear headlights with the lower-bumper fog lamps), so these
-- go on the Facelift phase only; Octavia 1Z Pre-facelift still has no photo.
-- Source image is small: each cutout is ~475 px wide (others in public/catalog are ~800-900 px).
-- Cut out with rembg (isnet-general-use), interior forced opaque, largest component kept (drops the
-- neighbouring car's edge), detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('88df7f26-ea3e-4833-930f-df087620b369'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-octavia-1z-facelift-liftback.webp', 'front', true),
  ('88df7f26-ea3e-4833-930f-df087620b369'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/skoda-octavia-1z-facelift-estate.webp', 'front', true)
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
