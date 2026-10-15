-- Upserts 5 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   Škoda Scala NW1 Hatchback 5-door: Pre-facelift (2019–2023) blue
--                                     Facelift (2024–)         grey -- dark grille frame, reshaped lamps and bumper
--   SEAT Ateca KH7 SUV 5-door:        Facelift (2020–)         red  -- hexagon-pattern grille, full-LED lamps
--   VW Touran 5T MPV 5-door:          Pre-facelift (2015–2020) blue
--                                     Facelift (2020–)         grey -- black honeycomb lower intake
-- Ateca: both supplied photos (green, red) are the 2020 facelift; pre-facelift front is clearly different,
-- so Pre-facelift stays without a photo and the green one is unused.
-- Touran caveat: the 2020 update changed the exterior only marginally; the grey car's lower bumper is the
-- later style, so it goes on Facelift. Swap if Martin knows otherwise.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('0dcaa1d8-d12d-474b-a5a5-c01e9af6da4d'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-scala-nw1-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('9c197022-5395-4b4e-9485-4d88a0e29c12'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-scala-nw1-facelift-hatchback-5-door.webp', 'front', true),
  ('2435459a-e760-47cd-b7c1-5e19fa04fa46'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/seat-ateca-kh7-facelift-suv-5-door.webp', 'front', true),
  ('c2fed14c-d586-4a4a-b7ae-67bff82c5164'::uuid, '466b8dff-c6c5-451d-86cd-4770ff6defcf'::uuid, '/catalog/volkswagen-touran-5t-pre-facelift-mpv-5-door.webp', 'front', true),
  ('7ae0d7f2-cf32-4d8e-b349-e113f65b6088'::uuid, '466b8dff-c6c5-451d-86cd-4770ff6defcf'::uuid, '/catalog/volkswagen-touran-5t-facelift-mpv-5-door.webp', 'front', true)
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
