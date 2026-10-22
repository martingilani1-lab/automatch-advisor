-- Upserts 6 catalog_media rows: main front photos Martin sent 2026-10-22, for phases that had none.
--   VW Taigo CS        Pre-facelift (2021–)      SUV Coupe 5-door  red
--   Audi A3 8Y         Pre-facelift (2020–2024)  Hatchback 5-door  blue (Sportback)
--   Audi Q3 F3         Pre-facelift (2018–)      SUV 5-door        black (regular Q3, not Sportback)
--   VW Caddy SB        Pre-facelift (2020–)      MPV 5-door        blue
--   Audi TT 8S         Facelift (2018–2023)      Coupe 2-door      grey (vertical-slat grille = facelift front)
--   Cupra Formentor    Pre-facelift (2020–2024)  SUV 5-door        VZ, copper trim (pre-facelift headlights)
-- Each photo goes on exactly one phase -- pre-facelift and facelift never share a file.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('689c0990-763e-4d65-b6a7-30a128440a5b'::uuid, '4ba6bca2-66ee-4b8f-9cd8-f901b6f6cb9c'::uuid, '/catalog/volkswagen-taigo-cs-pre-facelift-suv-coupe-5-door.webp', 'front', true),
  ('59a996de-0e11-419d-b1fe-5d1d9668b823'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8y-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('887193e1-561a-49f9-94aa-8cd9661f4bfb'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/audi-q3-f3-pre-facelift-suv-5-door.webp', 'front', true),
  ('9c4f26bc-09e3-4e83-849a-e28c1a5ea8fb'::uuid, '466b8dff-c6c5-451d-86cd-4770ff6defcf'::uuid, '/catalog/volkswagen-caddy-sb-pre-facelift-mpv-5-door.webp', 'front', true),
  ('02cf0dd1-7fb7-4a29-9aed-b1fbbec42610'::uuid, '979a003f-3bb2-4ade-b213-a12b52dbec1c'::uuid, '/catalog/audi-tt-8s-facelift-coupe-2-door.webp', 'front', true),
  ('2f24a032-5f5f-44ea-9520-9cfb46a8a32a'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/cupra-formentor-km7-pre-facelift-suv-5-door.webp', 'front', true)
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
