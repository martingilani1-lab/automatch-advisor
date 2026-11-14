-- Upserts 1 catalog_media row: BMW i3 photo Martin sent 2026-11-14 (second photo).
--   BMW i3 I01  Pre-facelift (2013-2017)  Hatchback 5-door  blue / black hood (round fog lights
--   in the front bumper = pre-facelift), so it goes on the Pre-facelift phase only.
-- Cut out with the project's own scripts/media/process-images.py (process_one, rembg u2net),
-- written to public/catalog/bmw-i3-i01-pre-facelift-hatchback-5-door.webp.
-- phase_id / body_type_id resolved against the LIVE DB on 2026-11-14 (the phase had 0 media rows).
-- Additive upsert; review before running.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('69ef3f67-c9cf-473d-9965-9a893d17ca42'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/bmw-i3-i01-pre-facelift-hatchback-5-door.webp', 'front', true)
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
