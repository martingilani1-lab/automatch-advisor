-- Upserts 6 catalog_media rows (main front photos), one DIFFERENT photo per phase (Martin's rule):
--   Audi TT 8N Coupe 2-door:   Pre-facelift (1998–2003) silver, 5-spoke wheels, no rear spoiler
--                              Facelift (2003–2006)     dark grey, 10-spoke wheels, rear spoiler, darker lamp bezels
--   Škoda Fabia NJ Hatch 5-dr: Pre-facelift (2014–2018) blue, halogen lamps
--                              Facelift (2018–2021)     silver, LED-strip headlamps, revised bumper
--   SEAT León 5F Hatch 5-door: Pre-facelift (2012–2016) red, narrower grille
--                              Facelift (2017–2020)     blue, wider grille and revised lower bumper
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-15.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('6231a52b-6b3a-4089-8689-7dec50f78aa8'::uuid, '979a003f-3bb2-4ade-b213-a12b52dbec1c'::uuid, '/catalog/audi-tt-8n-pre-facelift-coupe-2-door.webp', 'front', true),
  ('f79a48c1-0e4c-449e-8629-ba88a391d1a4'::uuid, '979a003f-3bb2-4ade-b213-a12b52dbec1c'::uuid, '/catalog/audi-tt-8n-facelift-coupe-2-door.webp', 'front', true),
  ('f1abd43a-bb16-465f-bf6e-fe0d84d13ef8'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-fabia-nj-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('791a78d3-5706-4000-b5cb-1ba416336d33'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/skoda-fabia-nj-facelift-hatchback-5-door.webp', 'front', true),
  ('3641aad3-a2d8-44f9-99ee-f46f00e7ab9d'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-5f-pre-facelift-hatchback-5-door.webp', 'front', true),
  ('1f506744-3059-42bb-939e-77d52cbcb2e4'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-5f-facelift-hatchback-5-door.webp', 'front', true)
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
