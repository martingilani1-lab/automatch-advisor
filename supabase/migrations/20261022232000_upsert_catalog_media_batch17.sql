-- Upserts 6 catalog_media rows: main front photos Martin sent 2026-10-22 (second batch).
--   Cupra León KL       Pre-facelift (2020–2024)  Estate (ST)       grey VZ, copper
--   Cupra León KL       Pre-facelift (2020–2024)  Hatchback 5-door  grey VZ
--   VW Arteon 3H7       Facelift (2020–2024)      Estate (Shooting Brake -- facelift-only body)
--   VW Tiguan CT        Pre-facelift (2024–)      SUV 5-door        blue
--   Audi A3 8Y          Facelift (2024–)          Hatchback 5-door  green  -- STAND-IN
--   Cupra Formentor KM7 Facelift (2024–)          SUV 5-door        bronze -- STAND-IN
-- The two stand-ins show the pre-facelift front (Formentor: pre-facelift headlights; A3: same front as
-- the blue pre-facelift photo); used so facelift phases have their OWN, different photo. Replace with a
-- true facelift photo when available (same ON CONFLICT key).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('67cabc2f-6e62-47da-b140-976d0e259990'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/cupra-leon-kl-pre-facelift-estate.webp', 'front', true),
  ('67cabc2f-6e62-47da-b140-976d0e259990'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/cupra-leon-kl-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('0c3c2b9d-2f63-4b78-933b-e9696d9708ac'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/volkswagen-arteon-3h7-facelift-estate.webp', 'front', true),
  ('6a4556bd-551b-4e4a-932b-d83e3a48925a'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/volkswagen-tiguan-ct-pre-facelift-suv-5-door.webp', 'front', true),
  ('830ac70d-f68c-4416-8561-5a2ffe291b4e'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8y-facelift-hatchback-5-door.webp', 'front', true),
  ('1e06785e-d664-49ae-82b7-1de7a550e933'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/cupra-formentor-km7-facelift-suv-5-door.webp', 'front', true)
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
