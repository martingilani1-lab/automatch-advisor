-- Upserts 5 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   VW Polo AW Hatchback 5-door: Pre-facelift (2017–2021) blue
--                                Facelift (2021–)         grey -- LED light bar across the grille
--   Škoda Superb 3V Liftback:    Pre-facelift (2015–2019) blue-grey
--                                Facelift (2019–2024)     white -- wider grille, full-LED lamps, chrome lower trim
--   SEAT Arona KJ7 SUV 5-door:   Facelift (2021–)         red -- round fog lamps, silver underguard
-- Arona: both supplied photos (red, blue) are the 2021 facelift; the pre-facelift front is clearly different,
-- so neither is used for Pre-facelift (stays without a photo). The blue one is unused.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('e2ca3626-e7e2-4192-a82c-c67671b8997c'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-polo-aw-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('377c3114-96a6-4322-ad6a-8a6c52c8ea73'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-polo-aw-facelift-hatchback-5-door.webp', 'front', true),
  ('88c7cc37-8049-43fd-8409-ac297baf0b3b'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-superb-3v-pre-facelift-liftback.webp', 'front', true),
  ('c44494a2-4568-46ad-a6ec-502c91d5d0cd'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-superb-3v-facelift-liftback.webp', 'front', true),
  ('81f6870c-edc7-40c7-9f01-48854628461d'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/seat-arona-kj7-facelift-suv-5-door.webp', 'front', true)
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
