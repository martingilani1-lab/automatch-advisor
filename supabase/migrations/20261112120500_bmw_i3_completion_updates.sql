-- BMW i3 (I01) completion pass (Martin, 2026-11-12) -- part 2 of 2, UPDATE of existing rows
-- only (no INSERT/DELETE/schema change here -- see the companion _inserts.sql for the one
-- new fault). Every value here traces to a verified manufacturer/regulator source quoted in
-- docs/intake/research/bmw-i3-i01-completion.md -- read that file for the full reasoning,
-- including what was deliberately left NULL and why.
--
-- Every UPDATE is guarded: WHERE the target column is still NULL (never overwrites a value
-- someone already set), and each block asserts its own expected row count, rolling back the
-- whole transaction on a mismatch. Run in ONE transaction, in a FRESH SQL editor tab.
--
-- Human-run only. NOT executed by this session.

BEGIN;

DO $$
DECLARE n_rows_before int;
BEGIN
  SELECT count(*) INTO n_rows_before FROM public.catalog_engines WHERE code LIKE 'i3%';
  IF n_rows_before <> 5 THEN
    RAISE EXCEPTION 'Expected 5 i3 engine rows live, found % -- catalog has drifted since this file was written, stop and re-check', n_rows_before;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 1. ENGINES -- reliability_rating + maintenance_note + yearly_maintenance_eur_min/max.
--    yearly_maintenance is source M (Martin, 2026-11-12): "BEV: brake fluid every 2 years,
--    cabin filter, Vehicle Check at an SK/CZ BMW service" -- no independent-SK/CZ figure was
--    found in research (only a German main-dealer price, ADAC's EUR 270 first-service cost),
--    so this is Martin's own market/experience figure, not a researched one. Per
--    docs/intake/RESEARCH-PROCESS.md's NULL/N/A/0/M convention, stored as the value, M noted
--    here as its source.
--
--    SET uses COALESCE on reliability_rating/maintenance_note and the WHERE guard only checks
--    yearly_maintenance_eur_min/max -- a pre-yearly_maintenance version of this file already ran
--    live (2026-11-12) and set those two columns, so an all-four-NULL guard would now match 0
--    rows and roll back before reaching section 6. This makes the block a safe top-up either
--    way: fresh, it fills all four; re-run after the earlier partial run, it only adds the two
--    still-missing yearly_maintenance columns and leaves the already-correct ones untouched.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  WITH v(code, kw, rating, note) AS (VALUES
    ('i3-60Ah'::text,  125::integer, 3::smallint,
     'BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it ages.'::text),
    ('i3-94Ah',        125,          3,
     'BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it ages.'),
    ('i3s-94Ah',       135,          4,
     'BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it ages.'),
    ('i3-120Ah',       125,          3,
     'BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it ages.'),
    ('i3s-120Ah',      135,          4,
     'BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it ages.')
  )
  UPDATE public.catalog_engines e
     SET reliability_rating        = COALESCE(e.reliability_rating, v.rating),
         maintenance_note          = COALESCE(e.maintenance_note, v.note),
         yearly_maintenance_eur_min = 120,
         yearly_maintenance_eur_max = 150
    FROM v
   WHERE e.code = v.code AND e.power_kw = v.kw
     AND e.yearly_maintenance_eur_min IS NULL AND e.yearly_maintenance_eur_max IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 i3 engine rows to update, updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 2. GEARBOX -- the SHARED generic:Single-speed EV row (also used by Renault Zoe Phase 2).
--    Only generic, brand-neutral fields touched. `maker` is an APPROVED EXCEPTION, not a gap:
--    Martin, 2026-11-12 -- "in-house BMW eDrive reduction gear, no named supplier" -- confirms
--    there is no third-party maker to record for the i3's own unit, and since this row is
--    shared with Renault's Zoe (a different physical unit), writing "BMW" here would
--    misattribute Renault's reducer. Stays NULL by design, not left over from caution.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  UPDATE public.transmission_units
     SET speeds = 1,
         reliability_rating = 5
   WHERE code = 'generic:Single-speed EV'
     AND speeds IS NULL AND reliability_rating IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 gearbox row to update, updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 3. BODY DIMENSIONS -- Pre-facelift ground clearance + GVW/payload (new); Facelift GVW/payload
--    (new -- ground clearance and boot sill were already filled on Facelift). Figures are the
--    base/lightest engine's (60 Ah on Pre-facelift, 94 Ah on Facelift) -- GVW/payload genuinely
--    vary by battery weight and this table has no per-engine slot; see completion doc Gap 4.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  WITH v(phase_label, gc, gvw, payload) AS (VALUES
    ('Pre-facelift'::text, 140::integer, 1620::integer, 425::integer),
    ('Facelift',           NULL::integer, 1670::integer, 425::integer)
  ),
  phase_lookup AS (
    SELECT cp.id, cp.phase_label
    FROM public.catalog_phases cp
    JOIN public.catalog_models cm ON cm.id = cp.model_id
    JOIN public.catalog_brands cb ON cb.id = cm.brand_id
    WHERE cb.name = 'BMW' AND cm.name = 'i3' AND cp.generation_code = 'I01'
  )
  UPDATE public.phase_body_dimensions d
     SET ground_clearance_mm    = COALESCE(d.ground_clearance_mm, v.gc),
         gross_vehicle_weight_kg = v.gvw,
         payload_kg              = v.payload
    FROM v
    JOIN phase_lookup p ON p.phase_label = v.phase_label
   WHERE d.phase_id = p.id
     AND d.gross_vehicle_weight_kg IS NULL AND d.payload_kg IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 phase_body_dimensions rows to update (one per phase), updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 4. CONFIGURATION FACT -- the one Facelift config still missing ev_range_km.
--    290 km = the conservative/lower end of BMW's own quoted 290-300 km NEDC range (see
--    completion doc Gap 6) -- a judgement call on which end to store, not a precision BMW
--    itself gave. Change to 300 or a midpoint if Martin prefers a different convention.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_vehicle_configurations cvc
     SET ev_range_km = 290
    FROM public.catalog_engines e, public.catalog_phases p, public.catalog_models cm, public.catalog_brands cb
   WHERE cvc.engine_id = e.id AND cvc.phase_id = p.id AND p.model_id = cm.id AND cm.brand_id = cb.id
     AND cb.name = 'BMW' AND cm.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift'
     AND e.code = 'i3-94Ah' AND e.power_kw = 125
     AND cvc.ev_range_km IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 config row to update, updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 5. TRIM FEATURES -- feature_group + safety_feature_slug for all 32 i3 trim features.
--    3 of the 32 ("135 kW motor", "Sport driving mode", "wider track") get neither -- they're
--    spec/behaviour facts already stored as features, not equipment, and nothing in the closed
--    vocabulary fits; left untouched (already NULL, no-op). The other 29 are set here.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  WITH v(feature_id, fg, slug) AS (VALUES
    -- Pre-facelift / Atelier
    ('293dcb6d-79cd-4b35-bdfa-13f7c0eed1e9'::uuid, 'wheels'::text, NULL::text),
    ('368ecf9e-7dbe-46b4-9bd2-98a557fa720e'::uuid, 'airbags', 'airbags'),
    ('66bc0ddd-aa0c-4fa3-ba1d-f5ac1a0dc590'::uuid, NULL, 'esc'),
    ('744bbdc3-654a-4d73-8b3f-fb3dd5de9753'::uuid, 'seats', NULL),
    ('7f175b13-e5ef-43d4-8ae0-45249d5f84a5'::uuid, 'infotainment', NULL),
    ('fbd251cc-f2cf-4eed-a729-d1d8e9461872'::uuid, 'climate', NULL),
    -- Pre-facelift / Loft
    ('613bb6ab-94f5-4f75-9293-c29d66d41bf2'::uuid, 'interior_trim', NULL),
    ('8716a90d-b451-45eb-9ae8-f487b3eb9c03'::uuid, 'interior_trim', NULL),
    ('9edd1b23-767a-43ec-b706-2369214e00d4'::uuid, 'headlights', NULL),
    -- Pre-facelift / Lodge
    ('0132551e-e798-4f37-9455-ee5b324a5235'::uuid, 'interior_trim', NULL),
    ('5282b830-c643-4a75-8bc7-3b6b4136479b'::uuid, 'interior_trim', NULL),
    ('92690d2f-1c28-44f3-b997-64d4928cb6c6'::uuid, 'seat_comfort', NULL),
    -- Facelift / Atelier
    ('02c66ade-62a1-4f24-b3e7-60e87cccbf07'::uuid, 'seats', NULL),
    ('22449572-c737-4b1d-94dc-b3c4221e9287'::uuid, 'wheels', NULL),
    ('695f02a9-990c-49e6-b954-9d22be937880'::uuid, NULL, 'esc'),
    ('d7fbb0b1-8eaa-4b60-8f10-4ac617e431d1'::uuid, 'infotainment', NULL),
    ('e7ef9609-4c24-4409-ab88-e8434bb17014'::uuid, 'climate', NULL),
    ('f47f99df-e2ef-4e05-b28a-6bfd2e602819'::uuid, 'airbags', 'airbags'),
    -- Facelift / Loft
    ('4de0bd20-d073-4579-ad8b-a75a3dd51413'::uuid, 'interior_trim', NULL),
    ('6ed7070b-a9fe-4a24-a4fe-f8ff3780d36b'::uuid, 'headlights', NULL),
    ('85b16af3-2782-477e-8854-f6e09a57f940'::uuid, 'interior_trim', NULL),
    -- Facelift / i3s
    ('724e7033-7245-4671-b27c-bcc1c27bf781'::uuid, 'wheels', NULL),
    ('e24f7153-5719-490d-a970-c2a44fedb687'::uuid, 'suspension', NULL),
    -- Facelift / Lodge
    ('5fff7153-1fe0-4b9c-9ca1-bf88a7f5a1cb'::uuid, 'interior_trim', NULL),
    ('df69d2aa-49b0-4144-9243-3189fb41279f'::uuid, 'seat_comfort', NULL),
    ('f949d8b3-929f-4032-95ac-c1800b05130a'::uuid, 'interior_trim', NULL),
    -- Facelift / Suite
    ('01581707-4dc5-4394-951a-ce1049919a6b'::uuid, 'sound', NULL),
    ('371394cc-b903-4e42-a8f2-f6d7210246d3'::uuid, 'interior_trim', NULL),
    ('8f4ac900-58f2-46f9-82e6-a107e321cd42'::uuid, 'interior_trim', NULL)
  )
  UPDATE public.catalog_trim_features ctf
     SET feature_group = v.fg,
         safety_feature_slug = v.slug
    FROM v
   WHERE ctf.id = v.feature_id
     AND ctf.feature_group IS NULL AND ctf.safety_feature_slug IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 29 THEN RAISE EXCEPTION 'Expected 29 trim_features rows to update, updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 6. TOWING -- catalog_phases.towing_capacity_kg = 0, both phases. Source M (Martin,
--    2026-11-12): "no trailer homologation for I01; aftermarket hitches are approved for
--    bike carriers only." Per docs/intake/RESEARCH-PROCESS.md's NULL/N/A/0/M convention, 0
--    is a real, Martin-confirmed zero (the car may not tow), not an unresearched gap -- absence
--    from 3 separate BMW spec documents alone was NOT enough to justify 0 on its own (that
--    would have stayed NULL); Martin's own confirmation is what makes it 0.
--
--    Configuration-level towing_braked_kg / towing_unbraked_kg on every i3 configuration are
--    N/A as a consequence (a car with no trailer homologation has no per-configuration towing
--    figure to give) -- per the same convention, N/A stores as NULL, so no UPDATE is needed:
--    every i3 configuration's towing columns are already NULL and stay that way, now as a
--    confirmed N/A rather than an open gap. Documented here, not a database change.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_phases cp
     SET towing_capacity_kg = 0
    FROM public.catalog_models cm, public.catalog_brands cb
   WHERE cp.model_id = cm.id AND cm.brand_id = cb.id
     AND cb.name = 'BMW' AND cm.name = 'i3' AND cp.generation_code = 'I01'
     AND cp.towing_capacity_kg IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 i3 phase rows to update (one per phase), updated % -- rolled back', n; END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 7. POST-CONDITION CHECK -- every i3 engine now rated, gearbox rated, both phases' towing
--    set, no net row-count change anywhere (UPDATE only, nothing created or removed).
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE n_unrated int; n_untowed int;
BEGIN
  SELECT count(*) INTO n_unrated FROM public.catalog_engines WHERE code LIKE 'i3%' AND reliability_rating IS NULL;
  IF n_unrated <> 0 THEN RAISE EXCEPTION '% i3 engine(s) still have no reliability_rating after this migration -- rolled back', n_unrated; END IF;

  SELECT count(*) INTO n_untowed
  FROM public.catalog_phases cp
  JOIN public.catalog_models cm ON cm.id = cp.model_id
  JOIN public.catalog_brands cb ON cb.id = cm.brand_id
  WHERE cb.name = 'BMW' AND cm.name = 'i3' AND cp.generation_code = 'I01' AND cp.towing_capacity_kg IS NULL;
  IF n_untowed <> 0 THEN RAISE EXCEPTION '% i3 phase(s) still have no towing_capacity_kg after this migration -- rolled back', n_untowed; END IF;
END $$;

COMMIT;
