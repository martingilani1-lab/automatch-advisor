-- Backfills the spec columns added in 20260924140000 for all 27 catalog_engines, and
-- fixes a stale alias on AGP.
--
-- Matched by primary `code` ONLY — never display_name or power_kw (BSE and BFQ are both
-- 75 kW; several display_names repeat). Values are Martin's authored table; nothing here
-- is inferred. cylinders = 'L4' for all 27. timing_type: 'chain' for AMD, CBZB, CAXA,
-- CDAA; 'belt' for the other 23 (both accepted by the belt/chain/gear CHECK).
-- timing_replacement_km is NULL where the source says NULL (AMD and the three TSI
-- chain engines CBZB/CAXA/CDAA) — unknown/not-applicable, never 0.
--
-- emission_standard also documents why the existing splits exist: AHF Euro 2 / ASV
-- Euro 3, AGR Euro 2 / ALH Euro 3, APK Euro 3 / AZH Euro 4, AGP Euro 2 / AQM Euro 3.
--
-- ALIAS FIX: AGP.alt_codes held only 'AQM', but AQM is now its own Euro 3 row (the
-- SDI phase split); the alias contradicted the split and would make reconcile lookups
-- that check alt_codes treat AQM as AGP. Set to '{}' (asserted to be exactly {AQM}
-- first).
--
-- UPDATE of existing data: review-only, NOT executed. One transaction; every guard
-- raises -> whole file rolls back. Guards: each of the 27 codes matches exactly 1
-- engine row; the update touches exactly 27 rows (only rows whose spec columns are
-- still NULL, so authored values can't be overwritten); the alias fix touches exactly 1.

begin;

do $$
declare
  bad integer;
begin
  select count(*) into bad
  from (values
    ('AMD'),('AXP'),('AEE'),('AKL'),('BFQ'),('BSE'),('AGN'),('AGU'),('ARX'),('AUQ'),
    ('APK'),('AZH'),('CBZB'),('CAXA'),('CDAA'),('AGP'),('AQM'),('AGR'),('ALH'),('AHF'),
    ('ASV'),('ATD'),('BXE'),('ASZ'),('CAYC'),('BKD'),('CFHC')
  ) as c(code)
  where (select count(*) from catalog_engines e where e.code = c.code) <> 1;
  if bad <> 0 then
    raise exception '% of the 27 codes match 0 or >1 catalog_engines rows — aborting.', bad;
  end if;
end $$;

do $$
declare
  n integer;
begin
  update catalog_engines e
  set cylinders                  = 'L4',
      torque_nm                  = v.torque_nm,
      emission_standard          = v.emission_standard,
      timing_type                = v.timing_type,
      engine_oil_capacity_liters = v.oil_l,
      timing_replacement_km      = v.timing_km
  from (values
    ('AMD',  120, 'Euro 3', 'chain', 4.0,  null),
    ('AXP',  126, 'Euro 4', 'belt',  3.2,  90000),
    ('AEE',  135, 'Euro 2', 'belt',  3.5,  90000),
    ('AKL',  145, 'Euro 2', 'belt',  4.5,  90000),
    ('BFQ',  148, 'Euro 4', 'belt',  4.5,  90000),
    ('BSE',  148, 'Euro 4', 'belt',  4.5,  120000),
    ('AGN',  170, 'Euro 2', 'belt',  4.5,  120000),
    ('AGU',  210, 'Euro 2', 'belt',  4.5,  120000),
    ('ARX',  210, 'Euro 3', 'belt',  4.5,  120000),
    ('AUQ',  235, 'Euro 3', 'belt',  4.5,  120000),
    ('APK',  170, 'Euro 3', 'belt',  4.0,  120000),
    ('AZH',  170, 'Euro 4', 'belt',  4.0,  120000),
    ('CBZB', 175, 'Euro 5', 'chain', 3.6,  null),
    ('CAXA', 200, 'Euro 5', 'chain', 3.6,  null),
    ('CDAA', 250, 'Euro 5', 'chain', 4.6,  null),
    ('AGP',  133, 'Euro 2', 'belt',  4.5,  90000),
    ('AQM',  133, 'Euro 3', 'belt',  4.5,  90000),
    ('AGR',  210, 'Euro 2', 'belt',  4.5,  90000),
    ('ALH',  210, 'Euro 3', 'belt',  4.5,  90000),
    ('AHF',  235, 'Euro 2', 'belt',  4.5,  90000),
    ('ASV',  235, 'Euro 3', 'belt',  4.5,  90000),
    ('ATD',  240, 'Euro 3', 'belt',  4.3,  90000),
    ('BXE',  250, 'Euro 4', 'belt',  4.3,  120000),
    ('ASZ',  310, 'Euro 3', 'belt',  4.3,  90000),
    ('CAYC', 250, 'Euro 5', 'belt',  4.3,  210000),
    ('BKD',  320, 'Euro 4', 'belt',  3.8,  120000),
    ('CFHC', 320, 'Euro 5', 'belt',  4.3,  210000)
  ) as v(code, torque_nm, emission_standard, timing_type, oil_l, timing_km)
  where e.code = v.code
    and e.torque_nm is null and e.timing_type is null and e.emission_standard is null;
  get diagnostics n = row_count;
  if n <> 27 then
    raise exception 'Expected exactly 27 engine rows updated, % affected — aborting.', n;
  end if;

  update catalog_engines
  set alt_codes = '{}'
  where code = 'AGP' and alt_codes = '{AQM}';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected AGP.alt_codes to be exactly {AQM} and updated once, % affected — aborting.', n;
  end if;
end $$;

commit;
