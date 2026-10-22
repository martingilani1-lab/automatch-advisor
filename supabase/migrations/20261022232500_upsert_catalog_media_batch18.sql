-- Upserts 3 catalog_media rows: main front photos Martin sent 2026-10-22 (third batch).
--   Škoda Superb PY      Pre-facelift (2024–)  Estate      gold
--   Cupra Terramar KP    Pre-facelift (2024–)  SUV 5-door  grey, copper
--   VW Multivan T7       Pre-facelift (2021–)  MPV 5-door  red
-- A fourth photo in the same batch (red Kodiaq, NS7 facelift front) was NOT added: Kodiaq NS7
-- Facelift already has its own photo -- held back pending Martin's call on replacing it.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('5f80d235-b178-467a-bc90-4083419e874e'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/skoda-superb-py-pre-facelift-estate.webp', 'front', true),
  ('45924e58-c09d-40bd-8735-fb36913f8c7d'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/cupra-terramar-kp-pre-facelift-suv-5-door.webp', 'front', true),
  ('5580a394-24e7-4c7c-a2af-f5d41f7b8ff6'::uuid, '466b8dff-c6c5-451d-86cd-4770ff6defcf'::uuid, '/catalog/volkswagen-multivan-t7-pre-facelift-mpv-5-door.webp', 'front', true)
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
