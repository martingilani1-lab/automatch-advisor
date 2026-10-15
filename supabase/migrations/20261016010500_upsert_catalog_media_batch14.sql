-- Upserts 7 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   Audi Q2 GA SUV 5-door:       Pre-facelift (2016–2020) red   | Facelift (2020–)      grey  -- new grille, angular intakes
--   Škoda Kodiaq NS7 SUV 5-door: Pre-facelift (2017–2021) teal  | Facelift (2021–2024) green -- taller grille, slimmer LED lamps
--   Audi A1 GB Hatchback 5-door: Pre-facelift (2018–)      blue  (only phase in catalog)
--   SEAT Tarraco KN2 SUV 5-door: Pre-facelift (2018–2024) green (only phase in catalog)
--   VW Arteon 3H7 Liftback:      Pre-facelift (2017–2020) yellow (facelift with light bar still without a photo)
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('ec568690-51d2-45e8-b5e9-4747d4a61706'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/audi-q2-ga-pre-facelift-suv-5-door.webp', 'front', true),
  ('f6a99d10-fe96-47a1-adea-1cb831d5a443'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/audi-q2-ga-facelift-suv-5-door.webp', 'front', true),
  ('7d2399ee-7116-4738-b930-12d5161f645d'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-kodiaq-ns7-pre-facelift-suv-5-door.webp', 'front', true),
  ('5ec77df6-6601-4a95-90c0-72dbb581131f'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-kodiaq-ns7-facelift-suv-5-door.webp', 'front', true),
  ('b5548120-e8fe-447d-bcbd-3d5c8945f43b'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a1-gb-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('e83ca4d6-4603-45bc-84d2-3722d4688094'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/seat-tarraco-kn2-pre-facelift-suv-5-door.webp', 'front', true),
  ('bb177e5a-ac7f-4ad8-b09e-68b721e6fb86'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/volkswagen-arteon-3h7-pre-facelift-liftback.webp', 'front', true)
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
