-- Upserts 4 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   Škoda Fabia PJ Hatchback 5-door: Pre-facelift (2021–2024) orange
--                                    Facelift (2024–)         blue
--   SEAT León KL Hatchback 5-door:   Pre-facelift (2020–2024) red (SEAT brand row, not Cupra)
--   VW Golf CD1 Hatchback 5-door:    Pre-facelift (2019–2024) blue
-- Fabia caveat: both supplied photos show the 2021 design; the catalog's 2024 phase changed the exterior only
-- marginally, so the blue photo stands in for Facelift per the "different photo per phase" rule (same
-- treatment as Ibiza KJ / Touran 5T). Swap if a true 2024+ photo turns up.
-- León KL and Golf CD1: both supplied photos of each are the pre-facelift design (the 2024 facelifts have
-- clearly different lamps/bumpers), so Facelift stays without a photo; the second León (blue) and Golf (grey)
-- are unused.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('9c36eeec-e9ca-4cfb-8dd8-d73331a9966d'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-fabia-pj-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('500e483b-a584-419b-916d-4114e8ac6eeb'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-fabia-pj-facelift-hatchback-5-door.webp', 'front', true),
  ('979e0ef4-75e1-4fe8-8d37-8e25555f1f01'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-kl-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('1cf189dc-6185-4938-8098-bf81b2c27d86'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-golf-cd1-pre-facelift-hatchback-5-door.webp', 'front', true)
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
