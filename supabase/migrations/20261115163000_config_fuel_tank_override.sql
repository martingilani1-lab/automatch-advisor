-- Fuel tank capacity per CONFIGURATION (Martin, 2026-11-15: show the stored energy -- fuel tank,
-- battery, or both -- and the range on a full tank / full charge per configuration).
--
-- WHY: phase_body_dimensions.fuel_tank_capacity_liters is one number per phase x body. The BMW i3
-- shows the gap: the pure EV and the REx share the same body, but only the REx has a tank (9 L).
-- Setting 9 L on the body would claim the pure EV has a tank too (research doc
-- docs/intake/research/bmw-i3-i01-rex.md, section 3 "Body-level fields"). Same pattern as
-- curb_weight_kg (20261104200500): the body value stays the overview, the configuration's own
-- value wins wherever it is set. NULL = use the body's value (or no tank, for a pure EV).
--
-- Backfill: the 6 BMW i3 REx configurations -> 9 L. BMW "Specifications, valid from 11/2017":
-- "Fuel tank capacity ltr … 9"; BMW Media information 07/2013: "the nine-litre fuel tank is
-- located in the front section of the car" (research doc 2c, E2 / E3). US cars have 8.7 L -- not
-- in this catalog.
--
-- Not done here (follow-up): scripts/catalog-field-levels.json does not list this column yet;
-- the import pipeline (intake-to-template / validate-template) does not read or write it.
--
-- ALTER + UPDATE: human-run only, in a FRESH SQL editor tab. One transaction, guarded.

BEGIN;

ALTER TABLE public.catalog_vehicle_configurations
  ADD COLUMN fuel_tank_capacity_liters numeric;

ALTER TABLE public.catalog_vehicle_configurations
  ADD CONSTRAINT catalog_vehicle_configurations_fuel_tank_range_check
    CHECK (fuel_tank_capacity_liters IS NULL OR fuel_tank_capacity_liters BETWEEN 1 AND 200);

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_vehicle_configurations c
     SET fuel_tank_capacity_liters = 9
    FROM public.catalog_engines e
   WHERE e.id = c.engine_id
     AND e.code IN ('i3-60Ah-REx', 'i3-94Ah-REx', 'i3-94Ah-REx-Euro6c', 'i3-94Ah-REx-Euro6dT',
                    'i3s-94Ah-REx-Euro6c', 'i3s-94Ah-REx-Euro6dT')
     AND e.hybrid_type = 'EREV'
     AND c.fuel_tank_capacity_liters IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN
    RAISE EXCEPTION 'REx fuel tank: expected 6 configurations, updated % -- rolled back', n;
  END IF;
END $$;

COMMIT;
