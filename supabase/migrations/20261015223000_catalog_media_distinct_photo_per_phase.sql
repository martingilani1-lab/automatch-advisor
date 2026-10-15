-- Martin's rule (2026-10-15): pre-facelift and facelift phases must NOT share the same photo.
-- 20261015213000 had put one photo on both phases of León 1M, Golf 1J and Bora 1J. This migration:
--   * Golf 1J Facelift (2000–2006), Hatchback 5-door -> new, different photo (white Golf,
--     volkswagen-golf-1j-facelift-hatchback-5-door.webp). Pre-facelift keeps the blue Golf.
--   * León 1M Facelift and Bora 1J Facelift -> shared photo row REMOVED (no second photo supplied yet).
--     Those phases fall back to "no photo" (list placeholder / no hero) until a different one is added.
--     Pre-facelift rows keep their photos.
--
-- Contains a DELETE -> review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)
VALUES ('d02fedde-f133-4e90-a742-26b9e9a505a6'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid,
        '/catalog/volkswagen-golf-1j-facelift-hatchback-5-door.webp', 'front', true)
ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET
  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;

-- Guarded: only removes the rows that still point at the shared (pre-facelift) file.
DELETE FROM catalog_media
WHERE (phase_id, body_type_id, view_angle, image_url) IN (
  ('459e6a4a-47b0-4ca5-9126-5521c2fb65dc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, 'front', '/catalog/seat-leon-1m-hatchback-5-door.webp'),
  ('0f9c70cb-f1e4-4ec9-acac-a209b9dbf71d'::uuid, '0f311abd-27c1-4853-a928-1a10d4babaf7'::uuid, 'front', '/catalog/volkswagen-bora-1j-sedan-4-door.webp')
);

-- Postcondition: no photo file is used by more than one phase.
DO $$
DECLARE dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n FROM (
    SELECT image_url FROM catalog_media GROUP BY image_url HAVING count(DISTINCT phase_id) > 1
  ) d;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Still % photo file(s) shared across phases.', dup_n;
  END IF;
END $$;

COMMIT;
