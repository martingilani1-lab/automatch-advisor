-- Upserts 1 catalog_media row: Renault Zoe photo Martin sent 2026-11-14.
--   Renault Zoe X10  Phase 2 (2019-2024)  Hatchback 5-door  blue (C-shaped LED headlights and
--   the large diamond logo in the grille = Phase 2; it is the only Zoe phase in the catalog).
-- Cut out with the project's own scripts/media/process-images.py (process_one, rembg u2net),
-- written to public/catalog/renault-zoe-x10-phase-2-hatchback-5-door.webp.
-- phase_id / body_type_id resolved against the LIVE DB on 2026-11-14 (the phase had 0 media rows).
-- Additive upsert; review before running.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('8874774e-6ecd-4bc0-95d2-832864eb2f5a'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/renault-zoe-x10-phase-2-hatchback-5-door.webp', 'front', true)
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
