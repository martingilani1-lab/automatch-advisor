-- Upserts 3 catalog_media rows (main front photos) for the Facelift phases, at Martin's explicit request
-- (2026-10-16) to use the second photo of each car so pre-facelift and facelift show different pictures:
--   Škoda Kamiq NW4 SUV 5-door:      Facelift (2024–) grey
--   SEAT León KL Hatchback 5-door:   Facelift (2024–) blue (SEAT brand row, not Cupra)
--   VW Golf CD1 Hatchback 5-door:    Facelift (2024–) grey
-- Note: all three photos show the pre-2024 design (the real 2024 facelifts have different lamps/bumpers).
-- They are stand-ins; replace each with a true 2024+ photo when one is available (same ON CONFLICT key,
-- so a later upsert simply overwrites the row).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('ae658570-586c-4f4b-a5f8-938130bf94d1'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-kamiq-nw4-facelift-suv-5-door.webp', 'front', true),
  ('0604a9b6-dec6-4378-939c-8cf9579cfffe'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-kl-facelift-hatchback-5-door.webp', 'front', true),
  ('ade6348d-5415-4b48-98e9-fb57c20cb361'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-golf-cd1-facelift-hatchback-5-door.webp', 'front', true)
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
