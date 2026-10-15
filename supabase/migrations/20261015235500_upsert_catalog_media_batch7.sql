-- Upserts 4 catalog_media rows (main front photos), one DIFFERENT photo per phase:
--   Audi A3 8V Hatchback 5-door (Sportback): Pre-facelift (2012–2016) silver -- rounded grille corners
--                                            Facelift (2016–2020)     blue   -- angular grille, sharper lamps
--   SEAT Ibiza KJ Hatchback 5-door:          Pre-facelift (2017–2021) orange
--                                            Facelift (2021–)         red
-- Ibiza caveat: both supplied photos show the 2017-style car; the 2021 update changed the exterior only
-- marginally (mostly interior), so the red photo stands in for the facelift phase per Martin's
-- "different photo per phase" rule. Swap it if a true 2021+ photo turns up.
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('0581c15a-d4e3-4df7-8ce1-4436d048e50a'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8v-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('93459c00-9dfe-4826-9408-b34a4da6d1ec'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8v-facelift-hatchback-5-door.webp', 'front', true),
  ('90619ed2-2c98-46ac-840c-2244468d1a93'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-ibiza-kj-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('b13446d7-200c-4f26-81cf-c5c8c7821342'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-ibiza-kj-facelift-hatchback-5-door.webp', 'front', true)
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
