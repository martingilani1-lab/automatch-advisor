-- Upserts 7 catalog_media rows (main front photos) from 3 new files + 1 reused file:
--   seat-leon-1m-hatchback-5-door.webp        -> SEAT León 1M Pre-facelift (1999–2003) AND Facelift (2003–2006), Hatchback 5-door
--   volkswagen-golf-1j-hatchback-5-door.webp  -> VW Golf 1J Pre-facelift (1997–2000) AND Facelift (2000–2006), Hatchback 5-door
--   volkswagen-bora-1j-sedan-4-door.webp      -> VW Bora 1J Pre-facelift (1998–2001) AND Facelift (2001–2005), Sedan 4-door
--   seat-toledo-1m2-pre-facelift-sedan-4-door.webp (already committed) -> also SEAT Toledo 1M2 Facelift (2003–2004), Sedan 4-door
--
-- Why one photo per two phases: for these PQ34-era cars the catalog's pre-facelift/facelift split tracks
-- engine/equipment updates, not a visible front-end redesign -- the exterior is effectively the same in both
-- phases, so the same press photo is accurate for both. File names deliberately carry no phase for that reason.
-- (Octavia 1U is the exception -- its 2000 facelift changed the headlamps -- so it stays per-phase.)
-- Re-point any row with a one-row UPSERT if Martin wants a phase-specific photo later.
--
-- Source JPGs had white backgrounds, cut out with rembg (isnet-general-use); Golf recut without alpha matting
-- plus a light-speck cleanup at the lower bumper edge. ~950px wide, not upscaled.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('040fb124-4e0a-4e33-b5c6-89627f6da8bf'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-1m-hatchback-5-door.webp', 'front', true),
  ('459e6a4a-47b0-4ca5-9126-5521c2fb65dc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-1m-hatchback-5-door.webp', 'front', true),
  ('cf9d1c43-0a77-4415-ad6d-a661b383a0bc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-golf-1j-hatchback-5-door.webp', 'front', true),
  ('d02fedde-f133-4e90-a742-26b9e9a505a6'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/volkswagen-golf-1j-hatchback-5-door.webp', 'front', true),
  ('580982dd-ecc7-4f16-adc6-f104b3f5f320'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/volkswagen-bora-1j-sedan-4-door.webp', 'front', true),
  ('0f9c70cb-f1e4-4ec9-acac-a209b9dbf71d'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/volkswagen-bora-1j-sedan-4-door.webp', 'front', true),
  ('aead3723-4bc0-479b-b2c1-501dc18acff3'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, '/catalog/seat-toledo-1m2-pre-facelift-sedan-4-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE view_angle = 'front' AND (phase_id, body_type_id) IN (
    ('040fb124-4e0a-4e33-b5c6-89627f6da8bf'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid),
    ('459e6a4a-47b0-4ca5-9126-5521c2fb65dc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid),
    ('cf9d1c43-0a77-4415-ad6d-a661b383a0bc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid),
    ('d02fedde-f133-4e90-a742-26b9e9a505a6'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid),
    ('580982dd-ecc7-4f16-adc6-f104b3f5f320'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid),
    ('0f9c70cb-f1e4-4ec9-acac-a209b9dbf71d'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid),
    ('aead3723-4bc0-479b-b2c1-501dc18acff3'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid)
  );
  IF present_n <> 7 THEN
    RAISE EXCEPTION 'Expected 7 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
