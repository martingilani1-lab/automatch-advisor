-- Upserts 2 catalog_media rows for Pre-facelift phases, at Martin's explicit request (2026-10-16) to use the
-- second photos he sent earlier so pre-facelift and facelift show different pictures:
--   Škoda Octavia 1U Liftback:      Pre-facelift (1996–2000) blue
--   Audi A3 8L Hatchback 5-door:    Pre-facelift (1996–2000) blue
-- Note: both photos show the facelift-era front (same lamps as the cars already on the Facelift phases);
-- they are stand-ins -- replace with a true pre-2000 photo when available (same ON CONFLICT key).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-16.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('ecf5658d-f25c-45cc-b295-fd2e1700dce9'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-octavia-1u-pre-facelift-liftback.webp', 'front', true),
  ('25f3578c-ad6e-4c5d-a69a-7aea0eee122a'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/audi-a3-8l-pre-facelift-hatchback-5-door.webp', 'front', true)
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
