-- Deletes the 2 Octavia 1Z Facelift photos added by 20261022233000 -- Martin didn't like them
-- (2026-10-22). Both 1Z phases go back to "no photo". The .webp files are removed from
-- public/catalog in the same commit.
-- Guarded: aborts unless exactly these 2 rows are found, and verifies none remain.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_media
  WHERE image_url IN ('/catalog/skoda-octavia-1z-facelift-liftback.webp',
                      '/catalog/skoda-octavia-1z-facelift-estate.webp');
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 Octavia 1Z photo rows, found %', n; END IF;
END $$;

DELETE FROM catalog_media
WHERE image_url IN ('/catalog/skoda-octavia-1z-facelift-liftback.webp',
                    '/catalog/skoda-octavia-1z-facelift-estate.webp');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM catalog_media WHERE image_url LIKE '/catalog/skoda-octavia-1z-%') THEN
    RAISE EXCEPTION 'Octavia 1Z photo rows still present after delete';
  END IF;
END $$;

COMMIT;
