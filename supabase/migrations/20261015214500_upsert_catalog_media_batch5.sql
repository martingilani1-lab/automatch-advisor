-- Upserts 2 catalog_media rows (main front photos):
--   audi-a3-8l-facelift-hatchback-5-door.webp   -> Audi A3 8L Facelift (2000–2003), Hatchback 5-door
--   seat-toledo-1m2-facelift-sedan-4-door.webp  -> SEAT Toledo 1M2 Facelift (2003–2004), Sedan 4-door
--
-- A3 8L = Facelift from the clear-glass twin-projector headlamps (pre-facelift had plain reflector lamps).
-- Toledo: this blue car has the later smooth body-coloured front bumper with integrated fog lamps, vs the
-- black rub-strip bumper on the red car (kept on Pre-facelift) -- so it REPLACES the reused red photo that
-- 20261015213000 put on the Facelift phase (same ON CONFLICT key, so this upsert simply overwrites it).
-- Cut out with rembg (isnet-general-use), small detached specks removed by connected-component filter.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('a4430df2-b7d6-48c7-a65a-8e8cfdd23f7c'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8l-facelift-hatchback-5-door.webp', 'front', true),
  ('aead3723-4bc0-479b-b2c1-501dc18acff3'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/seat-toledo-1m2-facelift-sedan-4-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE view_angle = 'front' AND (phase_id, body_type_id, image_url) IN (
    ('a4430df2-b7d6-48c7-a65a-8e8cfdd23f7c'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8l-facelift-hatchback-5-door.webp'),
    ('aead3723-4bc0-479b-b2c1-501dc18acff3'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/seat-toledo-1m2-facelift-sedan-4-door.webp')
  );
  IF present_n <> 2 THEN
    RAISE EXCEPTION 'Expected 2 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
