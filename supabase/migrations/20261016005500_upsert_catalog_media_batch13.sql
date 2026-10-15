-- Upserts 6 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   VW Tiguan AD1 SUV 5-door:  Pre-facelift (2016–2020) teal   | Facelift (2020–2023) grey   -- light bar, new bumper
--   VW T-Roc A11 SUV 5-door:   Pre-facelift (2017–2021) orange | Facelift (2022–)      grey   -- LED bar, X-shaped DRLs
--   VW T-Cross C11 SUV 5-door: Pre-facelift (2019–2023) teal   | Facelift (2024–)      yellow -- LED bar, angular intakes
-- All six are true phase matches (visible facelift design differences).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('2bc1db61-062d-44f3-b74a-0f8358dc0b5c'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-tiguan-ad1-pre-facelift-suv-5-door.webp', 'front', true),
  ('db038914-8ab2-4546-ab78-89d0fcb87a2f'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-tiguan-ad1-facelift-suv-5-door.webp', 'front', true),
  ('306dedc3-e807-4212-b3d7-aa27d9e13021'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-t-roc-a11-pre-facelift-suv-5-door.webp', 'front', true),
  ('f6347cc2-15b9-4d45-8fb2-6f5767a8c6a4'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-t-roc-a11-facelift-suv-5-door.webp', 'front', true),
  ('19de547a-683e-42e6-85bb-c6f2b1dfb6fe'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-t-cross-c11-pre-facelift-suv-5-door.webp', 'front', true),
  ('4d6cf2b4-7959-4022-ac91-a2725c783d9c'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-t-cross-c11-facelift-suv-5-door.webp', 'front', true)
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
