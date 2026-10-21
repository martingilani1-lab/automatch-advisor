-- Seeds car-level faults (catalog_component_faults, component_type = 'vehicle') for the 20
-- Cupra + SEAT phases -- batch 2 of the vehicle-faults fill. Source: Martin's list,
-- scripts/fill/vehicle-faults-batch2-cupra-seat.txt (75 faults), parsed verbatim.
-- The first block arrived without a header line; it is the Cupra Formentor KM7 Pre-facelift
-- (next phase in the template order after Audi, and its content matches that car).
--
-- Same shape and guards as batch 1 (20261021103000): each group must match exactly one phase
-- (brand-qualified -- León exists under SEAT and Cupra), no target phase may already have
-- vehicle faults. Additive INSERT only; Martin supplied the content and asked for it in the DB.

BEGIN;

CREATE TEMP TABLE _vf (brand text, model text, gen text, phase text, category text, severity text, fault text) ON COMMIT DROP;

INSERT INTO _vf VALUES
  ('Cupra','Formentor','KM7','Pre-facelift','electrical','critical','MIB3 infotainment system freezing, lagging, and randomly rebooting'),
  ('Cupra','Formentor','KM7','Pre-facelift','electrical','moderate','Travel Assist unavailable warnings due to faulty capacitive steering wheel sensors'),
  ('Cupra','Formentor','KM7','Pre-facelift','electrical','moderate','SOS emergency call (eCall) module hardware failure'),
  ('Cupra','Formentor','KM7','Pre-facelift','climate','moderate','Unilluminated and unresponsive climate control touch sliders'),
  ('Cupra','Formentor','KM7','Pre-facelift','interior','minor','Cheap plastics in the lower cabin easily scratching'),
  ('Cupra','Formentor','KM7','Facelift','electrical','moderate','Early software glitches and connectivity drops in the new infotainment screen'),
  ('Cupra','Formentor','KM7','Facelift','interior','minor','Minor interior rattles from the dashboard area'),
  ('Cupra','León','KL','Pre-facelift','electrical','critical','MIB3 software freezing, rebooting, and complete loss of audio output'),
  ('Cupra','León','KL','Pre-facelift','electrical','moderate','Travel Assist error due to faulty capacitive steering wheel'),
  ('Cupra','León','KL','Pre-facelift','electrical','moderate','SOS eCall module failure and backup battery drain'),
  ('Cupra','León','KL','Pre-facelift','climate','moderate','Unilluminated and unresponsive climate touch sliders'),
  ('Cupra','León','KL','Facelift','electrical','moderate','Early software glitches in the new MIB4 infotainment system'),
  ('Cupra','León','KL','Facelift','interior','minor','Minor interior rattles from the dashboard area'),
  ('Cupra','Terramar','KP','Pre-facelift','electrical','moderate','Early software glitches in the infotainment and digital dashboard system'),
  ('SEAT','Arona','KJ7','Pre-facelift','electrical','moderate','Infotainment screen freezing or restarting randomly'),
  ('SEAT','Arona','KJ7','Pre-facelift','interior','minor','Seatbelt buckle height adjuster rattling against the B-pillar'),
  ('SEAT','Arona','KJ7','Pre-facelift','interior','minor','Scratch-prone hard dashboard plastics'),
  ('SEAT','Arona','KJ7','Pre-facelift','suspension','minor','Rear shock absorbers weeping fluid prematurely'),
  ('SEAT','Arona','KJ7','Facelift','electrical','minor','Wireless Apple CarPlay/Android Auto dropping connection frequently'),
  ('SEAT','Arona','KJ7','Facelift','electrical','minor','Infotainment screen lagging during startup'),
  ('SEAT','Arona','KJ7','Facelift','interior','minor','Seatbelt buckle height adjuster rattling'),
  ('SEAT','Ateca','KH7','Pre-facelift','body_rust','moderate','Water ingress into the cabin from blocked AC drains or panoramic sunroof drains'),
  ('SEAT','Ateca','KH7','Pre-facelift','electrical','minor','Keyless entry (KESSY) door handles failing in wet weather'),
  ('SEAT','Ateca','KH7','Pre-facelift','suspension','minor','Creaking front anti-roll bar bushes over speed bumps'),
  ('SEAT','Ateca','KH7','Pre-facelift','interior','minor','Rattle from the rear parcel shelf'),
  ('SEAT','Ateca','KH7','Facelift','electrical','moderate','MIB3 Infotainment system lagging and freezing'),
  ('SEAT','Ateca','KH7','Facelift','electrical','minor','KESSY door handle sensors failing'),
  ('SEAT','Ateca','KH7','Facelift','suspension','minor','Creaking front anti-roll bar bushes over speed bumps'),
  ('SEAT','Ibiza','KJ','Pre-facelift','electrical','moderate','Infotainment screen freezing or rebooting randomly'),
  ('SEAT','Ibiza','KJ','Pre-facelift','interior','minor','Seatbelt buckle height adjuster rattling against the B-pillar'),
  ('SEAT','Ibiza','KJ','Pre-facelift','suspension','minor','Rear shock absorbers weeping fluid prematurely'),
  ('SEAT','Ibiza','KJ','Pre-facelift','interior','minor','Hard plastics on the lower dashboard scratching easily'),
  ('SEAT','Ibiza','KJ','Facelift','electrical','minor','Infotainment connectivity drops with Apple CarPlay/Android Auto'),
  ('SEAT','Ibiza','KJ','Facelift','interior','minor','Seatbelt buckle height adjuster rattling'),
  ('SEAT','Ibiza','KJ','Facelift','suspension','minor','Rear shock absorbers weeping fluid prematurely'),
  ('SEAT','León','1M','Pre-facelift','body_rust','critical','Severe water ingress into footwells through deteriorating inner door carrier seals'),
  ('SEAT','León','1M','Pre-facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('SEAT','León','1M','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing interior lights/alarm issues'),
  ('SEAT','León','1M','Pre-facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off interior trims'),
  ('SEAT','León','1M','Pre-facelift','suspension','minor','Premature wear of front anti-roll bar bushes'),
  ('SEAT','León','1M','Facelift','body_rust','critical','Severe water ingress into footwells through deteriorating inner door carrier seals'),
  ('SEAT','León','1M','Facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('SEAT','León','1M','Facelift','electrical','moderate','Door lock microswitches failing, causing interior lights/alarm issues'),
  ('SEAT','León','1M','Facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off interior trims'),
  ('SEAT','León','1M','Facelift','suspension','minor','Premature wear of front anti-roll bar bushes'),
  ('SEAT','León','5F','Pre-facelift','suspension','moderate','Creaking front suspension over speed bumps (strut mounts/bushings)'),
  ('SEAT','León','5F','Pre-facelift','electrical','moderate','LED daytime running lights failing or yellowing due to heat'),
  ('SEAT','León','5F','Pre-facelift','body_rust','moderate','Water ingress into the cabin through deteriorated rear speaker seals in the doors'),
  ('SEAT','León','5F','Pre-facelift','interior','minor','Rattling from the door panels, especially with upgraded Seat Sound audio'),
  ('SEAT','León','5F','Pre-facelift','climate','minor','Heater matrix clogging if silica bag in coolant tank ruptures'),
  ('SEAT','León','5F','Facelift','electrical','moderate','Infotainment touch screen digitizer dead zones (ghost touches)'),
  ('SEAT','León','5F','Facelift','suspension','minor','Creaking front suspension over speed bumps (strut mounts/bushings)'),
  ('SEAT','León','5F','Facelift','interior','minor','Rattling from the door panels'),
  ('SEAT','León','5F','Facelift','climate','minor','Heater matrix clogging if silica bag in coolant tank ruptures'),
  ('SEAT','León','KL','Pre-facelift','electrical','critical','MIB3 software freezing, rebooting, and complete loss of audio output'),
  ('SEAT','León','KL','Pre-facelift','electrical','moderate','Travel Assist error due to faulty capacitive steering wheel'),
  ('SEAT','León','KL','Pre-facelift','electrical','moderate','SOS eCall module failure and backup battery drain'),
  ('SEAT','León','KL','Pre-facelift','climate','moderate','Unilluminated and unresponsive climate touch sliders'),
  ('SEAT','León','KL','Pre-facelift','interior','minor','Rattle from the LED ambient lighting strip on the dashboard'),
  ('SEAT','León','KL','Facelift','electrical','moderate','Early software glitches in the new infotainment screen'),
  ('SEAT','León','KL','Facelift','interior','minor','Rattle from the LED ambient lighting strip on the dashboard'),
  ('SEAT','Tarraco','KN2','Pre-facelift','electrical','moderate','MIB3 Infotainment system freezes and lagging'),
  ('SEAT','Tarraco','KN2','Pre-facelift','interior','minor','Creaking and rattling from the third-row seats when unoccupied'),
  ('SEAT','Tarraco','KN2','Pre-facelift','suspension','minor','DCC adaptive suspension knocking noise over uneven roads'),
  ('SEAT','Tarraco','KN2','Pre-facelift','body_rust','minor','Water ingress from blocked panoramic sunroof drains'),
  ('SEAT','Toledo','1M2','Pre-facelift','body_rust','critical','Severe water ingress into footwells through deteriorating inner door carrier seals'),
  ('SEAT','Toledo','1M2','Pre-facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('SEAT','Toledo','1M2','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing interior lights/alarm issues'),
  ('SEAT','Toledo','1M2','Pre-facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off interior trims'),
  ('SEAT','Toledo','1M2','Pre-facelift','suspension','minor','Premature wear of front anti-roll bar bushes'),
  ('SEAT','Toledo','1M2','Facelift','body_rust','critical','Severe water ingress into footwells through deteriorating inner door carrier seals'),
  ('SEAT','Toledo','1M2','Facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('SEAT','Toledo','1M2','Facelift','electrical','moderate','Door lock microswitches failing, causing interior lights/alarm issues'),
  ('SEAT','Toledo','1M2','Facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off interior trims'),
  ('SEAT','Toledo','1M2','Facelift','suspension','minor','Premature wear of front anti-roll bar bushes')
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
  IF n <> 157 THEN RAISE EXCEPTION 'expected 157 (82 batch 1 + 75) vehicle faults after insert, found %', n; END IF;
END $$;

COMMIT;
