-- New shared gearbox: VW MQ200-6F (02U), the 6-speed evolution of the 5-speed MQ200 (02T)
-- (Martin, 2026-11-03). Prerequisite for the Octavia II (1Z) Pre-facelift 1.6 FSI (BLF) manual
-- (CLAUDE.md rule 2b: a gearbox with no transmission_units row stops the import; matching by
-- speed count -- e.g. calling it MQ250 -- is not allowed).
--
-- Near-duplicate review (rule 2c): maker 'Volkswagen Group' + family 'manual' + 6 speeds already
-- holds VW 02M, VW MQ250, VW MQ281, VW MQ350. DISTINCT: 02U is the MQ200 family (02T casing and
-- internals, ~200 Nm class), not the MQ250 (02S) or MQ350 (02Q); 02M/MQ281 are separate heavier
-- units. The reviewed group is added to scripts/known-distinct-reference-groups.json in the same
-- commit.
--
-- Data (Martin): reliability 4; VAG lifetime fill, but a fluid change every 120 000 km / 8 years
-- is strongly recommended, EUR 80-120. pros/cons not supplied -> NULL.
--
-- Additive INSERT of reference data. Review first; then it may run via MCP (or the SQL editor).

BEGIN;

INSERT INTO public.transmission_units
  (code, family, maker, speeds, alt_codes, reliability_rating, reliability_note, maintenance_note,
   service_interval_km, service_interval_years, service_cost_eur_min, service_cost_eur_max)
SELECT 'VW MQ200-6F', 'manual', 'Volkswagen Group', 6, ARRAY['02U', 'MQ200-6F']::text[], 4,
       'Evolution of the 5-speed 02T (MQ200). Very reliable; the twin-bearing support block can wear at very high mileage, causing gear whine.',
       'Lifetime fill according to VAG, but a fluid change every 120 000 km / 8 years is strongly recommended (EUR 80-120). Clutch is a wear item.',
       120000, 8, 80, 120
WHERE NOT EXISTS (SELECT 1 FROM public.transmission_units WHERE code = 'VW MQ200-6F' OR '02U' = ANY (coalesce(alt_codes, '{}'::text[])));

DO $$
BEGIN
  IF (SELECT count(*) FROM public.transmission_units WHERE code = 'VW MQ200-6F') <> 1 THEN
    RAISE EXCEPTION 'VW MQ200-6F missing after insert -- rolled back';
  END IF;
END $$;

COMMIT;
