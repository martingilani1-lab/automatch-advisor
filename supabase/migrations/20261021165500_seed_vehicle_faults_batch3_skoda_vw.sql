-- Seeds car-level faults (catalog_component_faults, component_type = 'vehicle') for the 52
-- Škoda + Volkswagen phases -- batch 3, the last of the vehicle-faults fill (all 88 phases covered
-- after this). Source: Martin's list, scripts/fill/vehicle-faults-batch3-skoda-vw.txt (159 faults),
-- parsed verbatim.
--
-- Same shape and guards as batches 1-2 (20261021103000, 20261021110500): each group must match
-- exactly one brand-qualified phase, no target phase may already have vehicle faults.
-- Additive INSERT only; Martin supplied the content and asked for it in the DB.

BEGIN;

CREATE TEMP TABLE _vf (brand text, model text, gen text, phase text, category text, severity text, fault text) ON COMMIT DROP;

INSERT INTO _vf VALUES
  ('Škoda','Fabia','NJ','Pre-facelift','electrical','minor','Front Assist radar false alarms in heavy rain or snow'),
  ('Škoda','Fabia','NJ','Pre-facelift','interior','minor','Creaking dashboard plastics and door panels'),
  ('Škoda','Fabia','NJ','Pre-facelift','climate','moderate','AC compressor failure or noisy operation'),
  ('Škoda','Fabia','NJ','Facelift','electrical','minor','Front Assist radar false alarms in heavy rain or snow'),
  ('Škoda','Fabia','NJ','Facelift','interior','minor','Creaking dashboard plastics and door panels'),
  ('Škoda','Fabia','NJ','Facelift','climate','moderate','AC compressor failure or noisy operation'),
  ('Škoda','Fabia','PJ','Pre-facelift','electrical','moderate','MIB3 Infotainment system lagging and randomly rebooting'),
  ('Škoda','Fabia','PJ','Pre-facelift','interior','minor','Rattle from the B-pillar seatbelt height adjuster trim'),
  ('Škoda','Fabia','PJ','Pre-facelift','electrical','minor','Lane Assist overly aggressive steering intervention'),
  ('Škoda','Fabia','PJ','Facelift','electrical','moderate','MIB3 Infotainment system lagging and randomly rebooting'),
  ('Škoda','Fabia','PJ','Facelift','interior','minor','Rattle from the B-pillar trim'),
  ('Škoda','Kamiq','NW4','Pre-facelift','electrical','moderate','Infotainment system (Bolero/Amundsen) freezing and restarting'),
  ('Škoda','Kamiq','NW4','Pre-facelift','suspension','minor','Creaking from the rear torsion beam axle over speed bumps'),
  ('Škoda','Kamiq','NW4','Pre-facelift','electrical','moderate','Front assist and Lane assist sensors throwing random errors'),
  ('Škoda','Kamiq','NW4','Facelift','electrical','moderate','Infotainment system freezing and restarting'),
  ('Škoda','Kamiq','NW4','Facelift','suspension','minor','Creaking from the rear torsion beam axle'),
  ('Škoda','Kamiq','NW4','Facelift','electrical','moderate','Front assist and Lane assist sensors throwing random errors'),
  ('Škoda','Karoq','NU7','Pre-facelift','electrical','minor','KESSY door handle sensors failing to unlock in wet conditions'),
  ('Škoda','Karoq','NU7','Pre-facelift','interior','minor','VarioFlex rear seats rattling when unoccupied'),
  ('Škoda','Karoq','NU7','Pre-facelift','suspension','minor','Creaking front anti-roll bar bushes'),
  ('Škoda','Karoq','NU7','Facelift','electrical','minor','MIB3 Infotainment freezes and slow startup'),
  ('Škoda','Karoq','NU7','Facelift','interior','minor','VarioFlex rear seats rattling when unoccupied'),
  ('Škoda','Karoq','NU7','Facelift','suspension','minor','Creaking front anti-roll bar bushes'),
  ('Škoda','Kodiaq','NS7','Pre-facelift','electrical','moderate','Infotainment screen freezes and SOS module errors'),
  ('Škoda','Kodiaq','NS7','Pre-facelift','interior','minor','Door edge protector mechanisms breaking and scratching the door paint'),
  ('Škoda','Kodiaq','NS7','Pre-facelift','body_rust','moderate','Water ingress into the cabin from blocked panoramic roof drains'),
  ('Škoda','Kodiaq','NS7','Pre-facelift','suspension','minor','DCC adaptive dampers leaking fluid or knocking'),
  ('Škoda','Kodiaq','NS7','Facelift','electrical','moderate','Infotainment screen freezes and SOS module errors'),
  ('Škoda','Kodiaq','NS7','Facelift','interior','minor','Door edge protector mechanisms breaking and scratching the door paint'),
  ('Škoda','Kodiaq','NS7','Facelift','body_rust','moderate','Water ingress from blocked panoramic roof drains'),
  ('Škoda','Kodiaq','PS','Pre-facelift','electrical','moderate','Early software glitches with infotainment and Smart Dials'),
  ('Škoda','Octavia','1U','Pre-facelift','body_rust','moderate','Rust on the front fenders, door sills, and tailgate around the license plate lights'),
  ('Škoda','Octavia','1U','Pre-facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Škoda','Octavia','1U','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing alarm and interior light issues'),
  ('Škoda','Octavia','1U','Pre-facelift','suspension','minor','Worn front anti-roll bar bushes causing knocking'),
  ('Škoda','Octavia','1U','Facelift','body_rust','moderate','Rust on the front fenders, door sills, and tailgate around the license plate lights'),
  ('Škoda','Octavia','1U','Facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Škoda','Octavia','1U','Facelift','electrical','moderate','Door lock microswitches failing, causing alarm and interior light issues'),
  ('Škoda','Octavia','1U','Facelift','suspension','minor','Worn front anti-roll bar bushes causing knocking'),
  ('Škoda','Octavia','1Z','Pre-facelift','body_rust','moderate','Rust on door sills, tailgate lower edge, and rear wheel arches'),
  ('Škoda','Octavia','1Z','Pre-facelift','climate','critical','AC compressor catastrophic failure (especially Sanden units)'),
  ('Škoda','Octavia','1Z','Pre-facelift','electrical','moderate','Wiring harness breaking in the driver''s door hinge bellow'),
  ('Škoda','Octavia','1Z','Pre-facelift','interior','minor','Peeling chrome coating on interior door handles'),
  ('Škoda','Octavia','1Z','Facelift','body_rust','moderate','Rust on door sills, tailgate lower edge, and rear wheel arches'),
  ('Škoda','Octavia','1Z','Facelift','climate','critical','AC compressor catastrophic failure (especially Sanden units)'),
  ('Škoda','Octavia','1Z','Facelift','electrical','moderate','Wiring harness breaking in the driver''s door hinge bellow'),
  ('Škoda','Octavia','1Z','Facelift','interior','minor','Peeling chrome coating on interior door handles'),
  ('Škoda','Octavia','5E','Pre-facelift','suspension','moderate','Creaking front lower control arm bushings (MacPherson strut) over speed bumps'),
  ('Škoda','Octavia','5E','Pre-facelift','electrical','critical','Infotainment screen touch digitizer failing (Columbus/Amundsen ghost touches)'),
  ('Škoda','Octavia','5E','Pre-facelift','interior','minor','Rattling from the dashboard and door panels'),
  ('Škoda','Octavia','5E','Pre-facelift','climate','moderate','Heater matrix clogging if the silica bag in the coolant expansion tank ruptures'),
  ('Škoda','Octavia','5E','Facelift','suspension','moderate','Creaking front lower control arm bushings over speed bumps'),
  ('Škoda','Octavia','5E','Facelift','electrical','critical','Infotainment screen touch digitizer failing (ghost touches and dead zones)'),
  ('Škoda','Octavia','5E','Facelift','climate','moderate','Heater matrix clogging if the silica bag in the coolant expansion tank ruptures'),
  ('Škoda','Octavia','NX','Pre-facelift','electrical','critical','MIB3 infotainment system crashing, rebooting, and losing all audio output'),
  ('Škoda','Octavia','NX','Pre-facelift','electrical','moderate','Travel Assist error due to faulty capacitive steering wheel sensors'),
  ('Škoda','Octavia','NX','Pre-facelift','electrical','moderate','SOS emergency call (eCall) module failure'),
  ('Škoda','Octavia','NX','Pre-facelift','climate','minor','Central air vents difficult to adjust manually'),
  ('Škoda','Scala','NW1','Pre-facelift','electrical','moderate','Infotainment system freezing and restarting'),
  ('Škoda','Scala','NW1','Pre-facelift','suspension','minor','Creaking from the rear torsion beam axle over bumps'),
  ('Škoda','Scala','NW1','Pre-facelift','electrical','moderate','Front assist and Lane assist random errors'),
  ('Škoda','Scala','NW1','Facelift','electrical','moderate','Infotainment system freezing and restarting'),
  ('Škoda','Scala','NW1','Facelift','suspension','minor','Creaking from the rear torsion beam axle'),
  ('Škoda','Scala','NW1','Facelift','electrical','moderate','Front assist and Lane assist random errors'),
  ('Škoda','Superb','3V','Pre-facelift','suspension','moderate','Rear suspension squeaking (trailing arm bushings)'),
  ('Škoda','Superb','3V','Pre-facelift','electrical','minor','Keyless entry (KESSY) sensor failure in door handles'),
  ('Škoda','Superb','3V','Pre-facelift','body_rust','minor','Chrome exterior window trims tarnishing or peeling'),
  ('Škoda','Superb','3V','Pre-facelift','interior','minor','Rattle from the panoramic sunroof frame'),
  ('Škoda','Superb','3V','Facelift','suspension','moderate','Rear suspension squeaking (trailing arm bushings)'),
  ('Škoda','Superb','3V','Facelift','electrical','minor','Keyless entry (KESSY) sensor failure in door handles'),
  ('Škoda','Superb','3V','Facelift','interior','minor','Rattle from the panoramic sunroof frame'),
  ('Škoda','Superb','PY','Pre-facelift','electrical','moderate','Early software glitches with infotainment and Smart Dials'),
  ('Volkswagen','Arteon','3H7','Pre-facelift','interior','moderate','Frameless door windows squeaking and freezing shut in winter conditions'),
  ('Volkswagen','Arteon','3H7','Pre-facelift','suspension','minor','DCC adaptive dampers leaking fluid or knocking'),
  ('Volkswagen','Arteon','3H7','Pre-facelift','electrical','moderate','Infotainment screen freezes and reboots'),
  ('Volkswagen','Arteon','3H7','Facelift','interior','moderate','Frameless door windows squeaking and freezing shut in winter conditions'),
  ('Volkswagen','Arteon','3H7','Facelift','electrical','moderate','MIB3 Infotainment screen freezes'),
  ('Volkswagen','Arteon','3H7','Facelift','suspension','minor','DCC adaptive dampers leaking fluid or knocking'),
  ('Volkswagen','Bora','1J','Pre-facelift','body_rust','moderate','Rust on front fenders and trunk lid around the handle'),
  ('Volkswagen','Bora','1J','Pre-facelift','interior','critical','Window regulator plastic clips breaking, causing glass to drop into the door'),
  ('Volkswagen','Bora','1J','Pre-facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off heavily'),
  ('Volkswagen','Bora','1J','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing interior light and alarm issues'),
  ('Volkswagen','Bora','1J','Facelift','body_rust','moderate','Rust on front fenders and trunk lid around the handle'),
  ('Volkswagen','Bora','1J','Facelift','interior','critical','Window regulator plastic clips breaking, causing glass to drop into the door'),
  ('Volkswagen','Bora','1J','Facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off heavily'),
  ('Volkswagen','Bora','1J','Facelift','electrical','moderate','Door lock microswitches failing, causing interior light and alarm issues'),
  ('Volkswagen','Caddy','SB','Pre-facelift','electrical','moderate','MIB3 infotainment freezing and randomly rebooting'),
  ('Volkswagen','Caddy','SB','Pre-facelift','interior','minor','Sliding door mechanism rattling or sticking'),
  ('Volkswagen','Caddy','SB','Pre-facelift','electrical','minor','Front Assist false interventions'),
  ('Volkswagen','Golf','1J','Pre-facelift','body_rust','moderate','Rust on front fenders, side sills, and tailgate handle'),
  ('Volkswagen','Golf','1J','Pre-facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Volkswagen','Golf','1J','Pre-facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off heavily'),
  ('Volkswagen','Golf','1J','Pre-facelift','electrical','moderate','Door lock microswitches failing, causing interior light and alarm issues'),
  ('Volkswagen','Golf','1J','Facelift','body_rust','moderate','Rust on front fenders, side sills, and tailgate handle'),
  ('Volkswagen','Golf','1J','Facelift','interior','critical','Window regulator plastic clips snapping, causing glass to drop into the door'),
  ('Volkswagen','Golf','1J','Facelift','interior','moderate','Soft-touch plastic coating turning sticky and peeling off heavily'),
  ('Volkswagen','Golf','1J','Facelift','electrical','moderate','Door lock microswitches failing, causing interior light and alarm issues'),
  ('Volkswagen','Golf','5G','Pre-facelift','suspension','moderate','Creaking front strut mounts and control arm bushings over speed bumps'),
  ('Volkswagen','Golf','5G','Pre-facelift','climate','moderate','Heater matrix clogging if the silica bag in the coolant expansion tank ruptures'),
  ('Volkswagen','Golf','5G','Pre-facelift','body_rust','moderate','Water ingress into the cabin through deteriorated rear speaker seals in the doors'),
  ('Volkswagen','Golf','5G','Pre-facelift','interior','minor','Rattling from the dashboard area and door panels'),
  ('Volkswagen','Golf','5G','Facelift','suspension','moderate','Creaking front strut mounts and control arm bushings over speed bumps'),
  ('Volkswagen','Golf','5G','Facelift','climate','moderate','Heater matrix clogging if the silica bag in the coolant expansion tank ruptures'),
  ('Volkswagen','Golf','5G','Facelift','body_rust','minor','Water ingress through rear door seals'),
  ('Volkswagen','Golf','5G','Facelift','electrical','moderate','Infotainment screen digitizer dead zones (Discover Pro)'),
  ('Volkswagen','Golf','CD1','Pre-facelift','electrical','critical','MIB3 infotainment system randomly rebooting, freezing, and losing audio'),
  ('Volkswagen','Golf','CD1','Pre-facelift','electrical','moderate','Travel Assist unavailable due to faulty capacitive steering wheel sensors'),
  ('Volkswagen','Golf','CD1','Pre-facelift','electrical','moderate','Capacitive touch sliders on dashboard unresponsive and unlit at night'),
  ('Volkswagen','Golf','CD1','Pre-facelift','electrical','moderate','SOS eCall module errors and dashboard warnings'),
  ('Volkswagen','Golf','CD1','Facelift','electrical','moderate','Minor MIB4 software bugs and screen lag'),
  ('Volkswagen','Multivan','T7','Pre-facelift','electrical','moderate','MIB3 infotainment freezing and glitching'),
  ('Volkswagen','Multivan','T7','Pre-facelift','interior','minor','Heavy individual rear seats difficult to move smoothly on floor rails'),
  ('Volkswagen','Multivan','T7','Pre-facelift','body_rust','minor','Paint chipping easily on the front bumper and hood'),
  ('Volkswagen','New Beetle','9C','Pre-facelift','interior','critical','Window regulator failure causing glass to drop into the door'),
  ('Volkswagen','New Beetle','9C','Pre-facelift','interior','moderate','Dashboard and door panel plastics cracking due to sun exposure'),
  ('Volkswagen','New Beetle','9C','Pre-facelift','electrical','moderate','Headlight bulbs extremely difficult to replace (requires removing the entire housing)'),
  ('Volkswagen','New Beetle','9C','Pre-facelift','interior','moderate','Soft-touch plastics turning sticky and peeling heavily'),
  ('Volkswagen','New Beetle','9C','Facelift','interior','critical','Window regulator failure causing glass to drop into the door'),
  ('Volkswagen','New Beetle','9C','Facelift','interior','moderate','Dashboard and door panel plastics cracking due to sun exposure'),
  ('Volkswagen','New Beetle','9C','Facelift','electrical','moderate','Headlight bulbs extremely difficult to replace (requires removing the entire housing)'),
  ('Volkswagen','Passat','3G','Pre-facelift','suspension','moderate','Creaking front suspension lower control arm bushings'),
  ('Volkswagen','Passat','3G','Pre-facelift','electrical','minor','LED headlights failing or internal lenses yellowing'),
  ('Volkswagen','Passat','3G','Pre-facelift','body_rust','moderate','Panoramic sunroof leaking into the headliner due to blocked drains'),
  ('Volkswagen','Passat','3G','Pre-facelift','interior','minor','Dashboard analog clock failing'),
  ('Volkswagen','Passat','3G','Facelift','suspension','moderate','Creaking front suspension lower control arm bushings'),
  ('Volkswagen','Passat','3G','Facelift','electrical','moderate','Infotainment MIB3 freezes and wireless Apple CarPlay disconnects'),
  ('Volkswagen','Passat','3G','Facelift','body_rust','moderate','Panoramic sunroof leaking into the headliner due to blocked drains'),
  ('Volkswagen','Passat','CJ','Pre-facelift','electrical','moderate','MIB4 software glitches and screen freezing'),
  ('Volkswagen','Polo','AW','Pre-facelift','interior','minor','Seatbelt buckle rattling against the center console'),
  ('Volkswagen','Polo','AW','Pre-facelift','electrical','moderate','Infotainment screen freezes and Apple CarPlay disconnects'),
  ('Volkswagen','Polo','AW','Pre-facelift','brakes','minor','Handbrake lever travel becomes excessively long, requiring regular adjustment'),
  ('Volkswagen','Polo','AW','Facelift','electrical','moderate','Infotainment screen freezes and Apple CarPlay disconnects'),
  ('Volkswagen','Polo','AW','Facelift','interior','minor','Capacitive steering wheel buttons easily pressed by accident during maneuvers'),
  ('Volkswagen','T-Cross','C11','Pre-facelift','electrical','moderate','Infotainment freezing and rebooting'),
  ('Volkswagen','T-Cross','C11','Pre-facelift','interior','minor','Hard plastics on dashboard prone to rattling and scratching'),
  ('Volkswagen','T-Cross','C11','Pre-facelift','suspension','minor','Rear shock absorbers failing or weeping fluid prematurely'),
  ('Volkswagen','T-Cross','C11','Facelift','electrical','moderate','Infotainment freezing and rebooting'),
  ('Volkswagen','T-Cross','C11','Facelift','suspension','minor','Rear shock absorbers weeping fluid prematurely'),
  ('Volkswagen','T-Roc','A11','Pre-facelift','interior','moderate','Pre-facelift model suffers from cheap, hard, and rattling dashboard plastics'),
  ('Volkswagen','T-Roc','A11','Pre-facelift','electrical','minor','KESSY keyless door handle issues in wet weather'),
  ('Volkswagen','T-Roc','A11','Pre-facelift','suspension','minor','Front suspension knocking over bumps'),
  ('Volkswagen','T-Roc','A11','Facelift','electrical','moderate','Infotainment system glitches and freezing'),
  ('Volkswagen','T-Roc','A11','Facelift','electrical','minor','KESSY door handle issues in wet weather'),
  ('Volkswagen','Taigo','CS','Pre-facelift','electrical','moderate','MIB3 Infotainment system freezing and rebooting'),
  ('Volkswagen','Taigo','CS','Pre-facelift','interior','minor','Hard dashboard plastics prone to creaking and scratching'),
  ('Volkswagen','Tiguan','AD1','Pre-facelift','body_rust','critical','Water ingress from blocked panoramic sunroof drains, flooding the footwells'),
  ('Volkswagen','Tiguan','AD1','Pre-facelift','suspension','moderate','Creaking front suspension lower control arm bushings over speed bumps'),
  ('Volkswagen','Tiguan','AD1','Pre-facelift','electrical','minor','Active Info Display (digital dash) software glitches'),
  ('Volkswagen','Tiguan','AD1','Pre-facelift','electrical','minor','Power tailgate strut failure'),
  ('Volkswagen','Tiguan','AD1','Facelift','body_rust','critical','Water ingress from blocked panoramic sunroof drains, flooding the footwells'),
  ('Volkswagen','Tiguan','AD1','Facelift','electrical','moderate','MIB3 Infotainment freezes and wireless connection drops'),
  ('Volkswagen','Tiguan','AD1','Facelift','climate','moderate','Capacitive touch climate controls unresponsive or difficult to use while driving'),
  ('Volkswagen','Tiguan','CT','Pre-facelift','electrical','moderate','Early MIB4 software issues, system lag, and screen freezing'),
  ('Volkswagen','Touran','5T','Pre-facelift','body_rust','critical','Panoramic sunroof leaking heavily due to blocked or disconnected drain tubes'),
  ('Volkswagen','Touran','5T','Pre-facelift','interior','minor','Rear individual seats rattling when unoccupied'),
  ('Volkswagen','Touran','5T','Pre-facelift','suspension','minor','Creaking front anti-roll bar and control arm bushings'),
  ('Volkswagen','Touran','5T','Facelift','body_rust','critical','Panoramic sunroof leaking heavily due to blocked or disconnected drain tubes'),
  ('Volkswagen','Touran','5T','Facelift','electrical','moderate','MIB3 Infotainment freezes'),
  ('Volkswagen','Touran','5T','Facelift','interior','minor','Rear individual seats rattling when unoccupied')
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
  IF n <> 316 THEN RAISE EXCEPTION 'expected 316 (82 + 75 + 159) vehicle faults after insert, found %', n; END IF;
END $$;

COMMIT;
