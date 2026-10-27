-- Fills the engine maintenance columns (added by 20261027140000) for all 130 engines in use, from
-- Martin's 2026-10-27 list (scripts/fill/engine-maintenance-filled-2026-10-27.txt). Parsed verbatim;
-- 4 engines appeared twice in the list (DNFC@228, DXDB@110, BSE@75, AEE@55) with identical values.
-- Price basis: EUR, parts + labour, independent SK/CZ workshop; yearly at ~15,000 km/year.
--
-- Changes vs the list:
--   * 2 notes dropped (engine content never carries gearbox/drivetrain facts, CLAUDE.md rule 9):
--       AKL@74  "common gearbox rivets issue (DUU/DUW gearboxes)"  -> belongs on the gearbox
--       ARX@110 "Haldex service also required"                     -> belongs on the drivetrain
--   * timing_replacement_km is only written where it is still NULL (one engine: ARY@132 -> 120000,
--     same as every other 1.8T 20V in the catalog); every other engine's list value already matched
--     the DB exactly, checked 2026-10-27.
-- Chain engines: timing km/years stay NULL (no fixed interval); timing cost = typical chain job.
--
-- UPDATE of existing rows: review-only, NOT run by this session. Run in a FRESH Supabase SQL tab,
-- AFTER 20261027140000. Guarded: every (code, power_kw) must match exactly one engine, 130 updated.

BEGIN;

CREATE TEMP TABLE _m (code text, kw int, oil_km int, oil_mo int, spec text, oil_min int, oil_max int,
  air_km int, fuel_km int, plug_km int, plug_min int, plug_max int, t_km int, t_yr int, t_min int, t_max int,
  y_min int, y_max int, note text) ON COMMIT DROP;
INSERT INTO _m VALUES
('AEE', 55, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 90000, 6, 250, 400, 150, 220, 'classic 8V, prone to throttle body issues'),
  ('AGN', 92, 15000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 8, 350, 500, 180, 260, 'naturally aspirated 20V'),
  ('AGP', 50, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'very reliable naturally aspirated diesel'),
  ('AGR', 66, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'rotary pump VE'),
  ('AGU', 110, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'legendary turbo engine, frequent oil changes prevent sludge'),
  ('AGZ', 110, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 70, 100, NULL, NULL, 1000, 1500, 200, 280, '10V version, heavy engine block'),
  ('AHF', 81, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'rotary pump VE'),
  ('AJM', 85, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 90000, 6, 350, 480, 180, 260, 'early Pumpe-Düse'),
  ('AKL', 74, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 90000, 6, 250, 400, 150, 220, NULL),
  ('ALH', 66, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'rotary pump VE, variable turbo'),
  ('AMD', 44, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, NULL, NULL, 250, 400, 150, 220, 'old OHV Skoda engine, short chain without tensioner'),
  ('AMK', 154, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'high output 1.8T'),
  ('APG', 92, 15000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 8, 350, 500, 180, 260, 'naturally aspirated 20V'),
  ('APK', 85, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 120000, 8, 250, 400, 150, 220, 'known for consuming oil due to piston rings'),
  ('APY', 154, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'early S3 engine'),
  ('AQM', 50, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'very reliable naturally aspirated diesel'),
  ('AQN', 125, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 70, 100, NULL, NULL, 1000, 1500, 200, 280, '20V version'),
  ('ARL', 110, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 90000, 6, 350, 480, 180, 260, 'high-output PD, watch camshaft wear'),
  ('ARX', 110, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, NULL),
  ('ARY', 132, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'highly tunable'),
  ('ASV', 81, 15000, 12, 'VW 505 00, 5W-40', 70, 100, 60000, 60000, NULL, NULL, NULL, 90000, 6, 300, 450, 160, 250, 'rotary pump VE'),
  ('ASZ', 96, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 90000, 6, 350, 480, 180, 260, 'strong PD engine'),
  ('ATD', 74, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 90000, 6, 350, 480, 180, 260, 'Pumpe-Düse, strict oil spec required'),
  ('AUE', 150, 10000, 12, 'VW 502 00, 5W-40', 90, 130, 60000, 60000, 60000, 90, 140, NULL, NULL, 1000, 1500, 220, 300, 'VR6 24V'),
  ('AUQ', 132, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'Octavia 1 RS engine'),
  ('AUS', 77, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 50, 80, 90000, 6, 300, 450, 160, 250, 'twin belt setup'),
  ('AXJ', 165, 10000, 12, 'VW 502 00, 5W-40', 90, 130, 60000, 60000, 60000, 90, 140, NULL, NULL, 1000, 1800, 220, 300, 'rare RSi model'),
  ('AXP', 55, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 50, 80, 90000, 6, 300, 450, 160, 250, 'common piston ring wear issues resulting in oil consumption'),
  ('AZH', 85, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 120000, 8, 250, 400, 150, 220, 'reliable but thirsty and oil-consuming'),
  ('BAM', 165, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'legendary BAM, forged internals capability'),
  ('BFH', 177, 10000, 12, 'VW 502 00, 5W-40', 90, 130, 60000, 60000, 60000, 90, 140, NULL, NULL, 1000, 1800, 220, 300, 'Golf Mk4 R32, listen for chain rattle'),
  ('BFQ', 75, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 90000, 6, 250, 400, 150, 220, 'electronically controlled thermostat'),
  ('BFV', 176, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'highest output 1.8T'),
  ('BHE', 184, 10000, 12, 'VW 502 00, 5W-40', 90, 130, 60000, 60000, 60000, 90, 140, NULL, NULL, 1000, 1800, 220, 300, 'early TT 3.2 VR6'),
  ('BKD', 103, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 120000, 6, 400, 550, 180, 260, '16V PD, known for cylinder head porosity in early years'),
  ('BSE', 75, 15000, 12, 'VW 502 00, 5W-40', 70, 100, 60000, 60000, 60000, 40, 70, 120000, 8, 250, 400, 150, 220, 'indestructible 8V engine, loves to consume oil if neglected'),
  ('BSW', 77, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 120000, 6, 350, 480, 180, 260, 'Pumpe-Düse, strict oil spec required'),
  ('BVP', 120, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'keep oil pickup tube clean'),
  ('BVR', 140, 10000, 12, 'VW 502 00, 5W-40', 80, 110, 60000, 60000, 60000, 60, 90, 120000, 6, 350, 500, 200, 280, 'keep oil pickup tube clean'),
  ('BXE', 77, 15000, 12, 'VW 505 01, 5W-40', 80, 110, 60000, 60000, NULL, NULL, NULL, 120000, 6, 350, 480, 180, 260, 'notorious for conrod bearing wear'),
  ('CAXA', 90, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 80, 120, NULL, NULL, 450, 650, 200, 300, 'EA111, watch for chain stretch and wastegate rattle'),
  ('CAYC', 77, 15000, 12, 'VW 507 00, 5W-30', 90, 130, 60000, 60000, NULL, NULL, NULL, 210000, 10, 400, 550, 180, 280, 'belt kit incl. water pump'),
  ('CBZB', 77, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 70, 100, NULL, NULL, 450, 650, 200, 300, 'EA111, highly prone to chain stretch, listen for rattle on start'),
  ('CFHC', 103, 15000, 12, 'VW 507 00, 5W-30', 90, 130, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'much more reliable common-rail'),
  ('CHHA', 169, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Golf 7 GTI Performance'),
  ('CHHB', 162, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Octavia 3 RS engine'),
  ('CHHC', 169, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen3'),
  ('CHPA', 103, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 600, 200, 300, 'EA211'),
  ('CHYA', 44, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 60, 90, 120000, 8, 350, 500, 160, 250, 'simple naturally aspirated 3-cyl'),
  ('CHYA', 48, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 60, 90, 120000, 8, 350, 500, 160, 250, 'simple naturally aspirated 3-cyl'),
  ('CHYB', 55, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 60, 90, 120000, 8, 350, 500, 160, 250, 'simple naturally aspirated 3-cyl'),
  ('CHYB', 59, 15000, 12, 'VW 504 00, 5W-30', 80, 110, 60000, NULL, 60000, 60, 90, 120000, 8, 350, 500, 160, 250, 'simple naturally aspirated 3-cyl'),
  ('CHZB', 70, 15000, 12, 'VW 508 00, 0W-20', 90, 130, 60000, NULL, 60000, 60, 90, 120000, 8, 400, 550, 180, 280, 'turbo 3-cyl, strictly requires 0W-20'),
  ('CHZC', 81, 15000, 12, 'VW 508 00, 0W-20', 90, 130, 60000, NULL, 60000, 60, 90, 120000, 8, 400, 550, 180, 280, 'turbo 3-cyl, strictly requires 0W-20'),
  ('CHZD', 85, 15000, 12, 'VW 508 00, 0W-20', 90, 130, 60000, NULL, 60000, 60, 90, 120000, 8, 400, 550, 180, 280, 'turbo 3-cyl'),
  ('CJSA', 132, 15000, 12, 'VW 504 00, 5W-30', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen3, much better chain life than Gen2'),
  ('CJXA', 206, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Superb 280hp before GPF'),
  ('CJXC', 221, 10000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Golf 7 R 300hp, frequent oil changes advised'),
  ('CJXG', 228, 10000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, '310hp tune'),
  ('CJZA', 77, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 70, 100, 120000, 8, 400, 550, 180, 280, 'EA211 family'),
  ('CJZB', 63, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 70, 100, 120000, 8, 400, 550, 180, 280, 'EA211 family, much more reliable than older chain 1.2 TSI'),
  ('CJZC', 66, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 70, 100, 120000, 8, 400, 550, 180, 280, 'EA211 family'),
  ('CJZD', 81, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 70, 100, 120000, 8, 400, 550, 180, 280, 'EA211 family'),
  ('CLHA', 77, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('CRBC', 110, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'EA288 engine family'),
  ('CRKB', 81, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('CRTC', 200, 15000, 12, 'VW 507 00, 5W-30', 150, 200, 60000, 60000, NULL, NULL, NULL, NULL, NULL, 1800, 2500, 350, 500, 'engine out for chain replacement'),
  ('CSWB', 160, 15000, 12, 'VW 507 00, 5W-30', 150, 200, 60000, 60000, NULL, NULL, NULL, NULL, NULL, 1800, 2500, 350, 500, 'engine out for chain replacement'),
  ('CUAA', 176, 10000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 120000, 6, 550, 800, 250, 380, 'twin-turbo, shortened belt interval'),
  ('CUNA', 135, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('CUSA', 55, 15000, 12, 'VW 507 00, 5W-30', 90, 130, 60000, 60000, NULL, NULL, NULL, 210000, 10, 400, 550, 180, 280, 'belt kit incl. water pump'),
  ('CUSB', 66, 15000, 12, 'VW 507 00, 5W-30', 90, 130, 60000, 60000, NULL, NULL, NULL, 210000, 10, 400, 550, 180, 280, 'belt kit incl. water pump'),
  ('CUTA', 77, 15000, 12, 'VW 507 00, 5W-30', 90, 130, 60000, 60000, NULL, NULL, NULL, 210000, 10, 400, 550, 180, 280, 'belt kit incl. water pump'),
  ('CVKB', 140, 15000, 12, 'VW 508 00, 0W-20', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 1000, 1500, 250, 380, 'longitudinal'),
  ('CVNA', 110, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 80, 120, 120000, 8, 500, 700, 220, 320, 'EA211 longitudinal'),
  ('CWGD', 260, 10000, 12, 'VW 508 00, 0W-20', 160, 220, 60000, NULL, 60000, 120, 180, NULL, NULL, 1500, 2500, 350, 550, 'hot-V turbo layout'),
  ('CYRB', 185, 15000, 12, 'VW 504 00, 5W-30', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 1000, 1500, 250, 380, 'longitudinal Gen3'),
  ('CYVB', 81, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 70, 100, 120000, 8, 400, 550, 180, 280, 'EA211 family'),
  ('CZCA', 92, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 600, 200, 300, 'EA211'),
  ('CZDA', 110, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 600, 200, 300, 'very reliable EA211 variant'),
  ('CZPA', 132, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'B-cycle Gen3B'),
  ('CZPC', 147, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Polo GTI specific state of tune'),
  ('DADA', 110, 15000, 12, 'VW 508 00, 0W-20', 100, 140, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 650, 200, 300, 'EA211 evo, cylinder deactivation (ACT)'),
  ('DAZA', 294, 10000, 12, 'VW 504 00, 5W-30', 150, 200, 60000, NULL, 60000, 130, 180, NULL, NULL, 1500, 2000, 350, 500, 'aluminum block DAZA, very popular for tuning'),
  ('DCXA', 88, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DDYA', 85, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DETA', 140, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 750, 220, 350, 'longitudinal mount'),
  ('DEUA', 110, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 750, 220, 350, 'longitudinal mount, timing job more expensive'),
  ('DEWA', 255, 15000, 12, 'VW 507 00, 5W-30', 150, 200, 60000, 60000, NULL, NULL, NULL, NULL, NULL, 1800, 2500, 350, 500, 'high performance, frequent oil changes recommended'),
  ('DEZE', 120, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 750, 220, 350, 'mild-hybrid'),
  ('DFEA', 140, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DFFA', 110, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DFGA', 110, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DFGC', 85, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DFHA', 140, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DFYA', 110, 15000, 12, 'VW 508 00, 0W-20', 100, 140, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 650, 200, 300, 'mild-hybrid'),
  ('DGEA', 110, 15000, 12, 'VW 504 00, 5W-30', 90, 120, 60000, NULL, 60000, 80, 120, 120000, 8, 500, 700, 200, 320, 'PHEV layout makes some maintenance harder'),
  ('DGTD', 59, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DGTE', 70, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DGTE', 85, 15000, 12, 'VW 507 00, 5W-30', 100, 140, 60000, 60000, NULL, NULL, NULL, 210000, 10, 450, 650, 200, 300, 'belt kit incl. water pump'),
  ('DKNA', 180, 15000, 12, 'VW 508 00, 0W-20', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 1000, 1500, 250, 380, 'longitudinal MHEV'),
  ('DKTB', 180, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen3'),
  ('DKZA', 140, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen3B'),
  ('DKZA', 150, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen3B'),
  ('DLAA', 81, 15000, 12, 'VW 508 00, 0W-20', 90, 130, 60000, NULL, 60000, 60, 90, 120000, 8, 400, 550, 180, 280, 'turbo 3-cyl Evo'),
  ('DLAB', 81, 15000, 12, 'VW 508 00, 0W-20', 90, 130, 60000, NULL, 60000, 60, 90, 120000, 8, 400, 550, 180, 280, 'mild-hybrid'),
  ('DLVB', 110, 15000, 12, 'VW 508 00, 0W-20', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 1000, 1500, 250, 380, 'B-cycle engine'),
  ('DMSA', 150, 15000, 12, 'VW 508 00, 0W-20', 110, 150, 60000, NULL, 60000, 90, 130, NULL, NULL, 1000, 1500, 250, 380, 'longitudinal MHEV'),
  ('DNFB', 228, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Cupra 310hp tune'),
  ('DNFB', 245, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'special anniversary/track tunes'),
  ('DNFC', 221, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4 high output'),
  ('DNFC', 228, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'S3 engine'),
  ('DNFC', 245, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4 333hp (e.g. Golf 8 R 20 Years / S3 facelift)'),
  ('DNFE', 195, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4'),
  ('DNFG', 235, 10000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'R high output version'),
  ('DNND', 152, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Polo GTI facelift tune'),
  ('DNPA', 150, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4'),
  ('DNPA', 180, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4 (e.g., Octavia 4 RS)'),
  ('DNPA', 195, 15000, 12, 'VW 508 00, 0W-20', 120, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'EA888 Gen4'),
  ('DNUA', 200, 15000, 12, 'VW 504 00, 5W-30', 110, 160, 60000, NULL, 60000, 90, 130, NULL, NULL, 800, 1200, 250, 380, 'Superb 3 272hp/280hp base'),
  ('DNWB', 287, 10000, 12, 'VW 504 00, 5W-30', 150, 200, 60000, NULL, 60000, 130, 180, NULL, NULL, 1500, 2000, 350, 500, 'legendary 5-cyl'),
  ('DNWC', 294, 10000, 12, 'VW 508 00, 0W-20', 160, 220, 60000, NULL, 60000, 130, 180, NULL, NULL, 1500, 2000, 350, 500, 'modern 5-cyl with GPF'),
  ('DPBC', 100, 15000, 12, 'VW 508 00, 0W-20', 100, 140, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 650, 200, 300, 'EA211 evo'),
  ('DPBE', 84, 15000, 12, 'VW 508 00, 0W-20', 100, 140, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 650, 200, 300, 'EA211 evo'),
  ('DTPA', 150, 15000, 12, 'VW 509 00, 0W-20', 110, 150, 60000, 60000, NULL, NULL, NULL, 210000, 10, 550, 800, 220, 350, 'mild-hybrid'),
  ('DTRD', 85, 15000, 12, 'VW 509 00, 0W-20', 110, 150, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 700, 220, 320, 'Evo engine, strict 0W-20 oil'),
  ('DTRE', 90, 15000, 12, 'VW 509 00, 0W-20', 110, 150, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 700, 220, 320, 'Evo engine, strict 0W-20 oil'),
  ('DTRF', 75, 15000, 12, 'VW 509 00, 0W-20', 110, 150, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 700, 220, 320, 'Evo engine, strict 0W-20 oil'),
  ('DXDB', 110, 15000, 12, 'VW 508 00, 0W-20', 100, 140, 60000, NULL, 60000, 80, 120, 120000, 8, 450, 650, 200, 300, 'mild-hybrid'),
  ('DXNM', 142, 15000, 12, 'VW 509 00, 0W-20', 110, 150, 60000, 60000, NULL, NULL, NULL, 210000, 10, 500, 700, 220, 320, 'Evo engine, strict 0W-20 oil');

DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad FROM _m m
  WHERE (SELECT count(*) FROM catalog_engines e WHERE e.code = m.code AND e.power_kw = m.kw) <> 1;
  IF bad <> 0 THEN RAISE EXCEPTION '% list engine(s) do not match exactly one catalog_engines row', bad; END IF;
  SELECT count(*) INTO bad FROM _m m JOIN catalog_engines e ON e.code = m.code AND e.power_kw = m.kw
  WHERE m.t_km IS NOT NULL AND e.timing_replacement_km IS NOT NULL AND e.timing_replacement_km <> m.t_km;
  IF bad <> 0 THEN RAISE EXCEPTION '% engine(s) would change an existing timing_replacement_km', bad; END IF;
END $$;

UPDATE catalog_engines e SET
  oil_change_interval_km      = m.oil_km,
  oil_change_interval_months  = m.oil_mo,
  oil_spec                    = m.spec,
  oil_service_cost_eur_min    = m.oil_min,
  oil_service_cost_eur_max    = m.oil_max,
  air_filter_interval_km      = m.air_km,
  fuel_filter_interval_km     = m.fuel_km,
  spark_plug_interval_km      = m.plug_km,
  spark_plug_cost_eur_min     = m.plug_min,
  spark_plug_cost_eur_max     = m.plug_max,
  timing_replacement_km       = COALESCE(e.timing_replacement_km, m.t_km),
  timing_replacement_years    = m.t_yr,
  timing_service_cost_eur_min = m.t_min,
  timing_service_cost_eur_max = m.t_max,
  yearly_maintenance_eur_min  = m.y_min,
  yearly_maintenance_eur_max  = m.y_max,
  maintenance_note            = m.note
FROM _m m
WHERE e.code = m.code AND e.power_kw = m.kw;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_engines WHERE yearly_maintenance_eur_min IS NOT NULL;
  IF n <> 130 THEN RAISE EXCEPTION 'Expected 130 engines with maintenance data, found %', n; END IF;
END $$;

COMMIT;
