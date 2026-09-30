-- Add 6 new transmission_units rows for real, previously-unmatched gearbox codes surfaced by
-- the catalog_transmissions <-> transmission_units linking audit: VW 02J, VW 02K, VW 02M,
-- VW 01M, Jatco 09A (JF506E), Aisin 09G (TF-60SN). These are the five expected-unmatched codes
-- from that audit (02J/02K/02M/01M/09A) plus the "Aisin 09G" duplicate-catalog-code case, given
-- real named-unit content rather than a generic bucket: the "manual" ones (02J/02K/02M) could
-- have used generic:5-speed/6-speed Manual, but real per-unit fault data existed to author
-- instead; the two torque_converter ones (01M/09A) COULDN'T have used a generic bucket even if
-- wanted -- there is no generic:4-speed or generic:5-speed Torque converter row in this table at
-- all (checked: only 6/7/8/9/10-speed TC generics exist), so a real named unit was the only
-- option.
--
-- NOT done here, deliberately: linking any catalog_transmissions.unit_id to these new rows, and
-- merging the 02E/DQ250 and 09G/Aisin-09G duplicate catalog_transmissions rows. Both are the
-- audit's "consolidation step" and touch existing catalog data (UPDATE), so they stay a separate,
-- later migration per the destructive/existing-data-touch rule -- this file only adds new
-- transmission_units rows, nothing else.
--
-- Preflight: abort the whole transaction if any of the 6 codes already exists. `code` is UNIQUE
-- on this table (confirmed live: transmission_units_code_key), so a stale/partial prior run must
-- raise, never silently upsert over existing content.
do $$
declare
  existing text;
begin
  select string_agg(code, ', ') into existing
  from transmission_units
  where code in ('VW 02J', 'VW 02K', 'VW 02M', 'VW 01M', 'Jatco 09A (JF506E)', 'Aisin 09G (TF-60SN)');

  if existing is not null then
    raise exception 'transmission_units already has: % -- aborting, nothing inserted.', existing;
  end if;
end $$;

insert into transmission_units (code, family, maker, speeds, reliability_note, maintenance_note)
values
(
  'VW 02J',
  'manual',
  'Volkswagen Group',
  5,
  'Very robust 5-speed manual capable of high mileage. Weak points include worn 1st/2nd gear brass synchronizers, shifter tower bushing play causing vague engagement, and input shaft bearing wear at high mileage. Far more durable than the lighter 02K.',
  'Inspect manual transmission fluid level and condition every 60,000-80,000 km (G 052 726 A2 spec, ~2.0L), ~EUR 40-70. Bushing rebuild kit for shifter linkage ~EUR 30-60; clutch kit replacement ~EUR 250-450 depending on whether solid or dual-mass flywheel is fitted.'
),
(
  'VW 02K',
  'manual',
  'Volkswagen Group',
  5,
  'Infamous for catastrophic differential failure: original factory 9mm differential ring gear rivets fatigue, shear under load, and puncture the aluminum casing, causing total fluid loss and gearbox destruction. Reverse gear idler teeth are also prone to chipping.',
  'Factory rivets should be proactively replaced with an aftermarket ARP bolt kit before failure occurs (~EUR 200-350 labor + parts). MTF change every 60,000 km (~EUR 40-60). Full gearbox replacement or casing weld/rebuild typically runs ~EUR 600-1,000 if rivets shear.'
),
(
  'VW 02M',
  'manual',
  'Volkswagen Group',
  6,
  'Extremely strong 6-speed dual-layshaft gearbox handling high torque, but notoriously hard on dual-mass flywheels and clutch release bearings/slave cylinders. Shift fork rivets can work loose (especially 1st-2nd fork), and selector brass forks can bend under aggressive shifting.',
  'Dual-mass flywheel and clutch replacement typically needed every 150,000-220,000 km (~EUR 600-900 including concentric slave cylinder). MTF drain and refill every 80,000-100,000 km (G 052 171 A2, ~2.3L), ~EUR 60-90. Reinforced steel shift forks recommended during high-power rebuilds.'
),
(
  'VW 01M',
  'torque_converter',
  'Volkswagen Group',
  4,
  'Notoriously fragile 4-speed automatic with a high failure rate past 150,000-200,000 km. Internal valve body bore wear, cracked internal molded clutch pistons, internal fluid leaks, and failing N91/N92 solenoids cause slippage, flare shifts, torque converter clutch slip, and limp mode.',
  'Marketed by VW as ''sealed for life'', which accelerates its demise. Demands strict fluid and filter renewal every 45,000-60,000 km (~EUR 120-180, VW G 052 162 A2). Valve body rebuild or replacement runs ~EUR 450-700; complete remanufactured transmission typically costs ~EUR 1,200-1,800.'
),
(
  'Jatco 09A (JF506E)',
  'torque_converter',
  'Jatco',
  5,
  'Commonly suffers from solenoid failure (causing harsh 2-3 shifts or lost reverse) and cracked aluminum reverse brake clutch pistons. High sensitivity to fluid degradation, valve body bore wear, and heat buildup leading to converter clutch shudder and clutch pack slippage.',
  'Strict ATF drain and fill required every 50,000-60,000 km (VW G 052 990 / Apolloil Red-1 spec, ~EUR 120-180). Valve body solenoid kit replacement runs ~EUR 250-450; full transmission rebuild or reverse piston repair typically costs ~EUR 1,100-1,600.'
),
(
  'Aisin 09G (TF-60SN)',
  'torque_converter',
  'Aisin',
  6,
  'Prone to rapid valve body bore wear (linear solenoids and accumulator bores) due to thermal stress and aged fluid, causing harsh downshifts (especially 3-2 and 2-1) and slipping when warm. The small factory heat exchanger is insufficient, leading to accelerated fluid breakdown.',
  'Requires fluid changes every 50,000-60,000 km (Toyota T-IV / JWS 3309 / VW G 055 025 A2), ~EUR 140-200; factory ''lifetime'' claims must be ignored. Valve body re-sleeving (Sonnax kit) or replacement runs ~EUR 600-900; auxiliary transmission oil cooler is strongly recommended to preserve longevity.'
);

-- Post-condition: exactly these 6 codes must exist now.
do $$
declare
  found_n integer;
begin
  select count(*) into found_n
  from transmission_units
  where code in ('VW 02J', 'VW 02K', 'VW 02M', 'VW 01M', 'Jatco 09A (JF506E)', 'Aisin 09G (TF-60SN)');

  if found_n <> 6 then
    raise exception 'Expected 6 new transmission_units rows, found %.', found_n;
  end if;
end $$;
