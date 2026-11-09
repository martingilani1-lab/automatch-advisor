-- HOTFIX (Martin, 2026-11-09 22:35): every car page stopped loading after 20261109223000.
--
-- Cause: 20261109223000 renamed catalog_vehicle_configurations.ev_range_wltp_km -> ev_range_km, but
-- the live Vercel deployment is still the previous build, which selects ev_range_wltp_km by name ->
-- PostgREST 400 on every configurations query -> the detail page fails and the client keeps
-- retrying (the "flashing"). Supabase API logs: ~1600 x 400 on that select in 5 minutes, all from
-- the old select list.
--
-- Bridge: a read-only generated column under the old name, always equal to ev_range_km. The old
-- build reads it, the new build reads ev_range_km -- both work, whichever is live. Nothing writes
-- to it (a generated column can't be written). Drop it once the new build is confirmed live:
--   ALTER TABLE public.catalog_vehicle_configurations DROP COLUMN ev_range_wltp_km;
--
-- Schema change: human-run, FRESH SQL editor tab.

ALTER TABLE public.catalog_vehicle_configurations
  ADD COLUMN ev_range_wltp_km integer GENERATED ALWAYS AS (ev_range_km) STORED;
