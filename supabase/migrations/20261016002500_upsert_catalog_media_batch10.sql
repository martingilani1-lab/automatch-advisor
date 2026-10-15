-- Upserts 5 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   Škoda Kamiq NW4 SUV 5-door:   Pre-facelift (2019–2023) blue -- split LED strip above the main lamps
--   Audi A4 B9 Sedan 4-door:      Pre-facelift (2015–2019) blue
--                                 Facelift (2019–2024)     red  -- wide flat grille, angular side intakes
--   Škoda Karoq NU7 SUV 5-door:   Pre-facelift (2017–2021) red
--                                 Facelift (2021–)         grey -- wider grille, slimmer full-LED lamps
-- Kamiq: both supplied photos (grey, blue) are the pre-facelift design; the 2024 facelift front is clearly
-- different, so Facelift stays without a photo and the grey one is unused.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('d99cf8e7-fb0e-4729-87b6-b0fd11c539eb'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-kamiq-nw4-pre-facelift-suv-5-door.webp', 'front', true),
  ('0803e58b-544d-4b49-8461-d18d5ab04d33'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/audi-a4-b9-pre-facelift-sedan-4-door.webp', 'front', true),
  ('debc64ba-7193-40cd-a915-6fca38bd5ee0'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/audi-a4-b9-facelift-sedan-4-door.webp', 'front', true),
  ('79388583-5406-4128-b2ed-12859a7bac97'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-karoq-nu7-pre-facelift-suv-5-door.webp', 'front', true),
  ('44bde44c-75da-4466-9118-ab4dd500ed51'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-karoq-nu7-facelift-suv-5-door.webp', 'front', true)
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
