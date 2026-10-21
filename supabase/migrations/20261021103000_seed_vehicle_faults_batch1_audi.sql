-- Seeds car-level faults (catalog_component_faults, component_type = 'vehicle') for the 16 Audi
-- phases -- batch 1 of the vehicle-faults fill. Source: Martin's list,
-- scripts/fill/vehicle-faults-batch1-audi.txt (82 faults), parsed verbatim -- no wording changed.
--
-- Why 'vehicle' rows: the Common faults tab is meant for faults of the car itself (body, rust,
-- electrics, suspension, interior). Engine/gearbox/drivetrain faults already live on their own
-- units and are shown there; none of those belong here.
--
-- Phase is resolved by brand + model + generation_code + phase_label (brand is needed: "León"
-- exists under both SEAT and Cupra). Guards: every fill group must match exactly one phase, and
-- no target phase may already have vehicle faults (keeps this from double-inserting if re-run).
-- Additive INSERT only; Martin supplied the content and asked for it to go in the DB.

BEGIN;

CREATE TEMP TABLE _vf (brand text, model text, gen text, phase text, category text, severity text, fault text) ON COMMIT DROP;

INSERT INTO _vf VALUES
  ('Audi','A1','GB','Pre-facelift','interior','minor','Rattling plastics around the dashboard, center console, and door panels'),
  ('Audi','A1','GB','Pre-facelift','electrical','moderate','MMI infotainment screen freezing, blanking out, or randomly rebooting'),
  ('Audi','A1','GB','Pre-facelift','electrical','minor','Digital instrument cluster (Virtual Cockpit) display glitches'),
  ('Audi','A1','GB','Pre-facelift','suspension','minor','Creaking noises from front anti-roll bar bushings over speed bumps'),
  ('Audi','A1','GB','Pre-facelift','climate','minor','AC blower motor ticking or squeaking on low speeds'),
  ('Audi','A3','8L','Pre-facelift','electrical','critical','Instrument cluster (FIS/LCD) dead pixels and complete failure (Magneti Marelli units)'),
  ('Audi','A3','8L','Pre-facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Audi','A3','8L','Pre-facelift','body_rust','moderate','Rust developing on roof rails, lower door edges, and front fenders'),
  ('Audi','A3','8L','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing interior lights and alarm issues'),
  ('Audi','A3','8L','Pre-facelift','interior','moderate','Soft-touch plastics turning sticky and peeling off heavily'),
  ('Audi','A3','8L','Pre-facelift','climate','minor','LCD screen on the Climatronic unit bleeding or losing pixels'),
  ('Audi','A3','8L','Pre-facelift','suspension','minor','Front anti-roll bar bushes and links wearing out prematurely, causing knocking'),
  ('Audi','A3','8L','Facelift','electrical','critical','Instrument cluster (FIS/LCD) dead pixels and complete failure'),
  ('Audi','A3','8L','Facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Audi','A3','8L','Facelift','body_rust','moderate','Rust developing on roof rails, lower door edges, and front fenders'),
  ('Audi','A3','8L','Facelift','electrical','moderate','Door lock microswitches failing, causing interior lights and alarm issues'),
  ('Audi','A3','8L','Facelift','interior','moderate','Soft-touch plastics turning sticky and peeling off heavily'),
  ('Audi','A3','8L','Facelift','suspension','minor','Front anti-roll bar bushes and links wearing out prematurely, causing knocking'),
  ('Audi','A3','8V','Pre-facelift','electrical','critical','MMI pop-up screen mechanism gears stripping and failing to rise'),
  ('Audi','A3','8V','Pre-facelift','suspension','moderate','Creaking front lower control arm bushings (MacPherson strut) over speed bumps'),
  ('Audi','A3','8V','Pre-facelift','interior','minor','Rattling from the speaker grilles and door panels, especially with B&O audio'),
  ('Audi','A3','8V','Pre-facelift','electrical','moderate','MMI control wheel joystick failure or loss of touch-pad sensitivity'),
  ('Audi','A3','8V','Pre-facelift','body_rust','minor','Water ingress into the cabin from blocked panoramic sunroof drains'),
  ('Audi','A3','8V','Pre-facelift','climate','minor','Heater matrix clogging if silica bag in coolant tank ruptures'),
  ('Audi','A3','8V','Facelift','suspension','moderate','Creaking front lower control arm bushings over speed bumps'),
  ('Audi','A3','8V','Facelift','electrical','moderate','LED daytime running lights (DRL) burning out or yellowing due to heat degradation'),
  ('Audi','A3','8V','Facelift','electrical','minor','MMI screen freezing or restarting unexpectedly'),
  ('Audi','A3','8V','Facelift','body_rust','minor','Water ingress from blocked panoramic sunroof drains'),
  ('Audi','A3','8V','Facelift','interior','minor','Creaking center console armrest hinges'),
  ('Audi','A3','8Y','Pre-facelift','electrical','critical','MIB3 infotainment system crashing, rebooting, and losing all audio output'),
  ('Audi','A3','8Y','Pre-facelift','electrical','critical','SOS emergency call (eCall) module hardware failure triggering dashboard red warnings'),
  ('Audi','A3','8Y','Pre-facelift','electrical','moderate','Travel Assist unavailable errors due to faulty capacitive steering wheel sensors'),
  ('Audi','A3','8Y','Pre-facelift','interior','minor','Gloss black center console plastics scratching very easily'),
  ('Audi','A3','8Y','Pre-facelift','electrical','moderate','Reversing camera freezing or displaying a black screen'),
  ('Audi','A3','8Y','Pre-facelift','climate','minor','Unilluminated touch sliders for climate control making night use difficult'),
  ('Audi','A3','8Y','Facelift','electrical','moderate','MIB4 software glitches, wireless CarPlay disconnects, and screen freezing'),
  ('Audi','A3','8Y','Facelift','electrical','moderate','False collision warnings from overly sensitive Front Assist radar'),
  ('Audi','A3','8Y','Facelift','interior','minor','Piano black trims prone to rapid scratching'),
  ('Audi','A4','B9','Pre-facelift','suspension','moderate','Premature wear of front multi-link suspension control arm bushings causing clunking'),
  ('Audi','A4','B9','Pre-facelift','electrical','moderate','Pre-sense safety system false warnings and phantom braking interventions'),
  ('Audi','A4','B9','Pre-facelift','climate','moderate','Heater blower motor squeaking or completely failing'),
  ('Audi','A4','B9','Pre-facelift','interior','minor','Rattling from the rear parcel shelf (sedan) or cargo cover (Avant)'),
  ('Audi','A4','B9','Pre-facelift','electrical','minor','Keyless entry (Advanced Key) door handle sensors failing in wet weather'),
  ('Audi','A4','B9','Pre-facelift','steering','minor','Clicking noise from the steering column clock spring'),
  ('Audi','A4','B9','Facelift','suspension','moderate','Premature wear of front multi-link suspension control arm bushings'),
  ('Audi','A4','B9','Facelift','electrical','moderate','MMI touch screen unresponsiveness in cold weather or crashing during boot'),
  ('Audi','A4','B9','Facelift','electrical','minor','SOS eCall module backup battery failure causing persistent dashboard warnings'),
  ('Audi','A4','B9','Facelift','interior','minor','Creaking noises from the panoramic sunroof frame (Avant models)'),
  ('Audi','Q2','GA','Pre-facelift','steering','critical','Steering rack knocking noise over uneven surfaces (often requiring rack replacement)'),
  ('Audi','Q2','GA','Pre-facelift','interior','moderate','Creaking from the C-pillar interior trim and door cards'),
  ('Audi','Q2','GA','Pre-facelift','electrical','moderate','Power tailgate strut failure or unpredictable operation'),
  ('Audi','Q2','GA','Pre-facelift','electrical','minor','MMI navigation freezing or dropping Bluetooth connections'),
  ('Audi','Q2','GA','Pre-facelift','suspension','minor','Rear shock absorbers weeping fluid prematurely'),
  ('Audi','Q2','GA','Facelift','steering','moderate','Steering rack knocking noise over uneven surfaces'),
  ('Audi','Q2','GA','Facelift','electrical','moderate','MIB3 infotainment system freezing and dropping wireless smartphone integration'),
  ('Audi','Q2','GA','Facelift','interior','minor','Rattling from dashboard plastics and door panels'),
  ('Audi','Q2','GA','Facelift','electrical','minor','Power tailgate control module glitches'),
  ('Audi','Q3','F3','Pre-facelift','electrical','critical','Infotainment MMI entirely freezing and Apple CarPlay disconnecting randomly'),
  ('Audi','Q3','F3','Pre-facelift','body_rust','critical','Panoramic sunroof leaking heavily into the cabin due to blocked or disconnected drain tubes'),
  ('Audi','Q3','F3','Pre-facelift','interior','moderate','Rattling from the dashboard center console and door panels'),
  ('Audi','Q3','F3','Pre-facelift','electrical','moderate','SOS eCall module malfunctions and backup battery draining'),
  ('Audi','Q3','F3','Pre-facelift','suspension','minor','Knocking from front suspension top mounts'),
  ('Audi','TT','8N','Pre-facelift','electrical','critical','Instrument cluster (Magneti Marelli) complete failure causing immobilizer lockouts'),
  ('Audi','TT','8N','Pre-facelift','interior','critical','Window regulators failing, causing glass to drop and door locking issues'),
  ('Audi','TT','8N','Pre-facelift','body_rust','moderate','Rust developing on roof channels, side sills, and front arches'),
  ('Audi','TT','8N','Pre-facelift','interior','moderate','Sagging headliner fabric and peeling soft-touch dashboard plastics'),
  ('Audi','TT','8N','Pre-facelift','electrical','moderate','Comfort Control Module (CCM) water damage causing erratic central locking/windows'),
  ('Audi','TT','8N','Pre-facelift','electrical','minor','Pixel loss on the center FIS display'),
  ('Audi','TT','8N','Facelift','electrical','critical','Instrument cluster (Magneti Marelli) complete failure causing immobilizer lockouts'),
  ('Audi','TT','8N','Facelift','interior','critical','Window regulators failing, causing glass to drop'),
  ('Audi','TT','8N','Facelift','body_rust','moderate','Rust developing on roof channels, side sills, and front arches'),
  ('Audi','TT','8N','Facelift','interior','moderate','Sagging headliner fabric and peeling soft-touch dashboard plastics'),
  ('Audi','TT','8N','Facelift','electrical','minor','Pixel loss on the center FIS display'),
  ('Audi','TT','8S','Pre-facelift','electrical','critical','Virtual Cockpit display hardware failure, pixel death, or complete blanking'),
  ('Audi','TT','8S','Pre-facelift','interior','moderate','Rattling from the rear hatch area, parcel shelf, and C-pillars'),
  ('Audi','TT','8S','Pre-facelift','electrical','moderate','Window drop function failing in freezing temperatures, preventing door opening/closing'),
  ('Audi','TT','8S','Pre-facelift','body_rust','minor','Water pooling in the rear hatch due to blocked spoiler drains'),
  ('Audi','TT','8S','Pre-facelift','climate','minor','AC vent integrated display dials malfunctioning'),
  ('Audi','TT','8S','Facelift','electrical','moderate','Virtual Cockpit software freezing or requiring hard resets'),
  ('Audi','TT','8S','Facelift','interior','moderate','Rattling from the rear hatch area and parcel shelf'),
  ('Audi','TT','8S','Facelift','electrical','moderate','Window drop function failing in freezing temperatures'),
  ('Audi','TT','8S','Facelift','body_rust','minor','Water pooling in the rear hatch')
;

DO $$
DECLARE bad integer; busy integer;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT f.brand, f.model, f.gen, f.phase, count(p.id) n
    FROM (SELECT DISTINCT brand, model, gen, phase FROM _vf) f
    LEFT JOIN catalog_brands b ON b.name = f.brand
    LEFT JOIN catalog_models m ON m.brand_id = b.id AND m.name = f.model
    LEFT JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = f.gen AND p.phase_label = f.phase
    GROUP BY 1,2,3,4 HAVING count(p.id) <> 1
  ) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% fill group(s) do not match exactly one phase', bad; END IF;

  SELECT count(*) INTO busy FROM catalog_component_faults cf
  JOIN catalog_phases p ON p.id = cf.phase_id
  JOIN catalog_models m ON m.id = p.model_id
  JOIN catalog_brands b ON b.id = m.brand_id
  JOIN (SELECT DISTINCT brand, model, gen, phase FROM _vf) f
    ON b.name = f.brand AND m.name = f.model AND p.generation_code = f.gen AND p.phase_label = f.phase
  WHERE cf.component_type = 'vehicle';
  IF busy <> 0 THEN RAISE EXCEPTION 'target phases already have % vehicle fault(s)', busy; END IF;
END $$;

INSERT INTO catalog_component_faults (component_type, phase_id, category, severity, fault)
SELECT 'vehicle', p.id, f.category, f.severity, f.fault
FROM _vf f
JOIN catalog_brands b ON b.name = f.brand
JOIN catalog_models m ON m.brand_id = b.id AND m.name = f.model
JOIN catalog_phases p ON p.model_id = m.id AND p.generation_code = f.gen AND p.phase_label = f.phase;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_component_faults WHERE component_type = 'vehicle';
  IF n <> 82 THEN RAISE EXCEPTION 'expected 82 vehicle faults after insert, found %', n; END IF;
END $$;

COMMIT;
