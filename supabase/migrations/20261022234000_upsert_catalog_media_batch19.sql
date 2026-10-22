-- Upserts 7 catalog_media rows: main front photos Martin sent 2026-10-22 (fourth batch).
--   Škoda Octavia 1Z  Pre-facelift (2004–2008)  Liftback          beige  (pre-facelift headlights/grille)
--   Škoda Octavia 1Z  Pre-facelift (2004–2008)  Estate (Combi)    beige
--   Škoda Octavia 1Z  Facelift (2009–2013)      Liftback          red    (facelift front, projector lamps)
--   Škoda Octavia 1Z  Facelift (2009–2013)      Estate (Combi)    beige
--   SEAT León 1M      Facelift (2003–2006)      Hatchback 5-door  red
--   SEAT Ateca KH7    Pre-facelift (2016–2020)  SUV 5-door        grey
--   Škoda Kodiaq NS7  Facelift (2021–2024)      SUV 5-door        red -- REPLACES the previous facelift
--                     photo at Martin's request (he re-sent it after being asked); new file name so no
--                     browser/CDN cache shows the old picture. Old .webp removed in the same commit.
-- These replace the small side-by-side 1Z facelift photos Martin rejected (deleted by 20261022233500).
-- Cut out with rembg (isnet-general-use), interior forced opaque, detached specks removed.
-- phase_id/body_type_id resolved against the LIVE DB (via phase_body_dimensions) on 2026-10-22.
-- Review-only: NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main) VALUES
  ('ff90f1e7-5a89-414d-b7ef-f4bbf4efb559'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-octavia-1z-pre-facelift-liftback.webp', 'front', true),
  ('ff90f1e7-5a89-414d-b7ef-f4bbf4efb559'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/skoda-octavia-1z-pre-facelift-estate.webp', 'front', true),
  ('88df7f26-ea3e-4833-930f-df087620b369'::uuid, 'eeca29f0-9894-4fd3-9d8a-66a493acebc8'::uuid, '/catalog/skoda-octavia-1z-facelift-liftback.webp', 'front', true),
  ('88df7f26-ea3e-4833-930f-df087620b369'::uuid, '4ef2b371-9f86-428d-b692-9ad0fa60e507'::uuid, '/catalog/skoda-octavia-1z-facelift-estate.webp', 'front', true),
  ('459e6a4a-47b0-4ca5-9126-5521c2fb65dc'::uuid, 'ff4e3f7c-9448-4643-ba7c-e8086c664128'::uuid, '/catalog/seat-leon-1m-facelift-hatchback-5-door.webp', 'front', true),
  ('2717a505-7b35-4684-ae93-125bd6fd038a'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/seat-ateca-kh7-pre-facelift-suv-5-door.webp', 'front', true),
  ('5ec77df6-6601-4a95-90c0-72dbb581131f'::uuid, '79262d75-4f01-4a5c-a0fd-103caffc4c59'::uuid, '/catalog/skoda-kodiaq-ns7-facelift-suv-5-door-red.webp', 'front', true)
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
