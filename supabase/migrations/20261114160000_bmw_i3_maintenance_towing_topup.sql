-- BMW i3 (I01) top-up: the two decisions from 20261112120500 that never reached the live DB.
--
-- Why a separate file: an earlier version of 20261112120500 ran live on 2026-11-12, before
-- Martin's decisions on yearly maintenance and towing were added to it. Re-running the whole
-- file now would roll back at its gearbox step (already filled), so these two blocks go alone.
-- Found 2026-11-14: the Costs tab showed no "Engine servicing" line for the i3 because
-- yearly_maintenance_eur_min/max were still NULL on all 5 engines.
--
--   yearly_maintenance_eur 120-150 on all 5 i3 engines -- source M (Martin, 2026-11-12):
--     BEV, brake fluid every 2 years, cabin filter, Vehicle Check at an SK/CZ BMW service.
--   towing_capacity_kg = 0 on both phases -- source M (Martin, 2026-11-12): no trailer
--     homologation for the I01; aftermarket hitches are approved for bike carriers only.
--
-- UPDATEs of existing rows -> Martin runs this in a fresh SQL editor tab. Guarded: each step
-- only touches still-NULL rows and checks its row count.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE public.catalog_engines
     SET yearly_maintenance_eur_min = 120, yearly_maintenance_eur_max = 150
   WHERE (code, power_kw) IN (('i3-60Ah', 125), ('i3-94Ah', 125), ('i3-120Ah', 125), ('i3s-94Ah', 135), ('i3s-120Ah', 135))
     AND yearly_maintenance_eur_min IS NULL AND yearly_maintenance_eur_max IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'yearly maintenance: expected 5 i3 engines, updated %', n; END IF;

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
