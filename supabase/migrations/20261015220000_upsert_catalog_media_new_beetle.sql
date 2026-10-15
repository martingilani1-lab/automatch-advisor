-- Upserts 2 catalog_media rows (main front photos) for VW New Beetle 9C, Hatchback 3-door (the coupé body):
--   volkswagen-new-beetle-9c-pre-facelift-hatchback-3-door.webp -> Pre-facelift (1998–2005)
--   volkswagen-new-beetle-9c-facelift-hatchback-3-door.webp     -> Facelift (2005–2010)
-- Phase calls: facelift has the wider split lower grille and slim rectangular indicators in the bumper;
-- pre-facelift has the narrow slatted intake and the round-ended indicator.
-- Cut out with rembg (isnet-general-use); windscreen interior forced opaque (the model had punched holes
-- through the light glass), detached specks removed.
--
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('32778626-a35b-4969-a7cd-2d2d4567626c'::uuid, 'f8914756-f6de-454b-a4f9-afb411726539'::uuid, '/catalog/volkswagen-new-beetle-9c-pre-facelift-hatchback-3-door.webp', 'front', true),
  ('a83777bd-8f53-4ce0-9b14-4c109512e9b0'::uuid, 'f8914756-f6de-454b-a4f9-afb411726539'::uuid, '/catalog/volkswagen-new-beetle-9c-facelift-hatchback-3-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

DO $$
DECLARE present_n integer;
BEGIN
  SELECT count(*) INTO present_n FROM catalog_media WHERE view_angle = 'front' AND (phase_id, body_type_id) IN (
    ('32778626-a35b-4969-a7cd-2d2d4567626c'::uuid, 'f8914756-f6de-454b-a4f9-afb411726539'::uuid),
    ('a83777bd-8f53-4ce0-9b14-4c109512e9b0'::uuid, 'f8914756-f6de-454b-a4f9-afb411726539'::uuid)
  );
  IF present_n <> 2 THEN
    RAISE EXCEPTION 'Expected 2 catalog_media rows present, found %.', present_n;
  END IF;
END $$;

COMMIT;
