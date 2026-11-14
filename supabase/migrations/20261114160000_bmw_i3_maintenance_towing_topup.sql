-- BMW i3 (I01) top-up: towing_capacity_kg = 0, the one decision from 20261112120500 that never
-- reached the live DB.
--
-- Why a separate file: an earlier version of 20261112120500 ran live on 2026-11-12, before
-- Martin's towing decision was added to it. Re-running the whole file now would roll back at its
-- gearbox step (already filled), so this block goes alone.
--
--   towing_capacity_kg = 0 on both phases -- source M (Martin, 2026-11-12): no trailer
--     homologation for the I01; aftermarket hitches are approved for bike carriers only.
--
-- NOT included any more (Martin, 2026-11-14): yearly_maintenance_eur on the i3 engines. A pure EV
-- has no engine servicing and brake fluid / cabin filter are not modelled, so those columns stay
-- NULL (N/A for a pure EV) and the Costs tab leaves the servicing line out for EVs.
--
-- UPDATE of existing rows -> Martin runs this in a fresh SQL editor tab. Guarded: only touches
-- still-NULL rows and checks its row count.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE public.catalog_phases p
     SET towing_capacity_kg = 0
    FROM public.catalog_models m, public.catalog_brands b
   WHERE m.id = p.model_id AND b.id = m.brand_id
     AND b.name = 'BMW' AND m.name = 'i3' AND p.generation_code = 'I01'
     AND p.towing_capacity_kg IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'towing: expected 2 i3 phases, updated %', n; END IF;
END $$;

COMMIT;
