-- Deletes 101 catalog_component_faults rows that are semantic duplicates of
-- another row on the same engine/unit -- the same real-world problem imported multiple times
-- with different wording from different old-vehicle source rows sharing one engine/gearbox.
-- One wording (the most specific) is kept per group; this migration removes the rest.
-- Reviewed group-by-group (unit | kept text | removed texts):
--   CAYC@77 (engine) | kept: "DPF clogging with short urban trips" | removed: "DPF clogging with short trips"
--   CAYC@77 (engine) | kept: "Piezo injectors — expensive to replace" | removed: "Piezo injectors expensive", "Piezo injectors — expensive replacement", "Piezo injectors expensive to replace"
--   CBZB@77 (engine) | kept: "Timing chain stretching and jumping (esp. 2010-2011)." | removed: "Timing chain stretching — primary and expensive concern", "Timing chain stretching — the primary concern", "Timing chain stretching — number one concern", "Timing chain stretching — number one concern and critical"
--   CBZB@77 (engine) | kept: "Water pump leak 60,000 – 80,000 km" | removed: "Water pump leak 60 – 80k km"
--   CBZB@77 (engine) | kept: "Turbo diverter valve — boost leaks" | removed: "Turbo diverter valve boost leaks"
--   CHHA@169 (engine) | kept: "Increased oil consumption — check every 1,000 km" | removed: "Oil consumption — check every 1,000 km"
--   CHHA@169 (engine) | kept: "Carbon deposits on intake valves (direct injection)" | removed: "Carbon deposits on intake valves"
--   CHHA@169 (engine) | kept: "Water pump — same issue as 1.4 TSI" | removed: "Water pump leak"
--   CHHA@169 (engine) | kept: "Turbo — higher stress, shorter life under hard driving" | removed: "Turbo stress under track use"
--   CHYA@44 (engine) | kept: "Ignition coils at very high mileage" | removed: "Ignition coils at higher mileage"
--   CHYA@44 (engine) | kept: "Thermostat — rare sticking" | removed: "Thermostat sticking"
--   CRBC@110 (engine) | kept: "DMF wear at 130,000 – 180,000 km" | removed: "DMF wear around 150,000 km", "DMF wear at 130 – 180k km"
--   CRBC@110 (engine) | kept: "Injectors — carbon build-up after 150,000+ km" | removed: "Injectors — carbon build-up after 150k+ km", "Injector carbon build-up after 150k+ km"
--   CRBC@110 (engine) | kept: "EGR cooler cracking at higher mileage" | removed: "EGR cooler cracking"
--   CRBC@110 (engine) | kept: "DPF clogging with city driving" | removed: "DPF regeneration issues with urban driving", "DPF with city driving"
--   CZDA@110 (engine) | kept: "Water pump with thermostat — leak around 80,000 km" | removed: "Water pump with thermostat leak around 80k km", "Water pump failure"
--   CZDA@110 (engine) | kept: "ACT cylinder deactivation — occasional vibrations" | removed: "ACT cylinder deactivation vibrations"
--   CZDA@110 (engine) | kept: "Carbon build-up on intake valves common with older EA211 engines driven predominantly in city traffic." | removed: "Carbon build-up", "Carbon build-up with city driving"
--   DADA@110 (engine) | kept: "Water pump plastic impeller — leak possible" | removed: "Water pump same 1.5 TSI family concern", "Water pump same family issue", "Water pump same concern", "Water pump — same family issue", "Water pump plastic impeller", "Water pump — same 1.5 TSI concern"
--   DADA@110 (engine) | kept: "OPF clogging with short city trips" | removed: "OPF clogging with exclusively short trips", "OPF clogging with short trips only", "OPF clogging with short trips"
--   DFFA@110 (engine) | kept: "DPF with city driving" | removed: "DPF"
--   DFGA@110 (engine) | kept: "Oil pump chain slack — EA288 concern" | removed: "Oil pump occasional issues at higher mileage", "Oil pump chain tensioner concern", "Oil pump chain slack", "Oil pump chain concern"
--   DFGA@110 (engine) | kept: "AdBlue system sensor and pump failures" | removed: "AdBlue sensor/pump failures", "AdBlue failures", "AdBlue sensor failures"
--   DFGA@110 (engine) | kept: "EGR improved but still sensitive to urban driving" | removed: "EGR sensitive to urban-only driving"
--   DFGA@110 (engine) | kept: "DPF requires regular highway drives" | removed: "DPF needs highway driving", "DPF needs regular highway drives", "DPF needs highway drives"
--   DFHA@140 (engine) | kept: "AdBlue sensor/pump failures after 80,000+ km" | removed: "AdBlue sensor/pump failures"
--   DFHA@140 (engine) | kept: "Oil pump chain concern" | removed: "Oil pump — known EA288 concern"
--   DKZA@140 (engine) | kept: "Oil consumption — check every 1,000 – 2,000 km" | removed: "Oil consumption — check regularly"
--   DKZA@140 (engine) | kept: "Carbon build-up on intake valves" | removed: "Carbon deposits on intake valves"
--   DLAA@81 (engine) | kept: "Water pump plastic impeller leak possible" | removed: "Water pump plastic impeller leak", "Water pump plastic impeller"
--   DLAA@81 (engine) | kept: "Turbo wastegate occasional rattle at idle" | removed: "Turbo wastegate occasional rattle", "Turbo wastegate rattle"
--   VW DQ200 (transmission) | kept: "Mechatronics unit failure — 800 – 1,500 EUR" | removed: "Mechatronics failure", "Mechatronics failure — same VW DQ200 issue", "Mechatronics failure — 800 – 1,500 EUR"
--   VW DQ200 (transmission) | kept: "Dry clutch plates — juddering on launch" | removed: "Dry clutch judder on launch", "Dry clutch judder in slow traffic", "Dry clutch judder in traffic", "Dry clutch judder", "Clutch shudder at low speed", "Dry clutch judder in slow traffic still possible"
--   VW DQ200 (transmission) | kept: "Input shaft bearing noise in neutral" | removed: "Input shaft bearing — noise in neutral", "Input shaft bearing noise"
--   VW DQ250 (transmission) | kept: "Mechatronics more robust than DQ200 but not trouble-free" | removed: "Mechatronics more robust than DQ200", "Mechatronics — more robust than DQ200", "Mechatronics — more robust than DQ200 but can fail", "Mechatronics — robust but not trouble-free", "Mechatronics can fail but more reliable than DQ200", "Mechatronic at very high mileage"
--   VW DQ250 (transmission) | kept: "Oil cooler — check for leaks at higher mileage" | removed: "Oil cooler — check for leaks", "Oil cooler leak possible", "Oil cooler check for leaks", "Oil cooler leaks possible"
--   VW DQ250 (transmission) | kept: "Valve body — rough shifting if oil neglected" | removed: "Valve body wear if oil neglected"
--   VW DQ381 (transmission) | kept: "Wet clutch — significantly more reliable than DQ200" | removed: "Wet clutch — much more reliable than DQ200", "Wet clutch — reliable", "Wet clutch — much more reliable than old DQ200"
--   VW DQ381 (transmission) | kept: "Software updates occasionally needed for shift quality" | removed: "Software updates occasionally needed", "Software updates needed occasionally"
--   VW DQ500 (transmission) | kept: "Mechatronics more durable but expensive — 1,200 – 2,000 EUR" | removed: "Mechatronics durable but expensive — 1,200 – 2,000 EUR"
--   VW MQ200 (transmission) | kept: "Cable shift slight play over time" | removed: "Cable shift slight play with age"
--   VW MQ200 (transmission) | kept: "Clutch cable stretching with age" | removed: "Cable clutch stretching", "Clutch cable stretching"
--   VW MQ200 (transmission) | kept: "Stiff shifting when cold in winter" | removed: "Stiff when cold in winter", "Stiff when cold"
--   VW MQ250 (transmission) | kept: "DMF wear with diesels around 180,000 – 250,000 km" | removed: "DMF wear with diesel engines", "DMF wear with diesels", "DMF wear with diesel"
--   VW MQ250 (transmission) | kept: "Synchros notchy on 1st/2nd after 200,000+ km" | removed: "Synchros gradual wear after 200k km"
--   VW MQ250 (transmission) | kept: "Cable shift mechanism can develop play" | removed: "Cable shift play over time", "Slight cable play over time"
--   VW MQ350 (transmission) | kept: "DMF wear with diesel at 150 – 200k km" | removed: "DMF wear with diesel engines", "DMF wear with diesels", "DMF wear with diesel"
--   VW MQ350 (transmission) | kept: "Synchros gradual wear after 200k+ km" | removed: "Synchros gradual wear", "Synchros wear after 200k km"
--
-- Generated by scripts/fill/write-fault-cleanup-migrations.mjs. Each DELETE is guarded on
-- both id and exact fault text (re-verified against live data at generation time).
--
-- Review-only: NOT run by this session. Independent of, and safe to run in either order
-- relative to, 20261012201548_remove_chain_belt_mismatch_engine_faults.sql (no id overlap).

BEGIN;

-- CAYC@77 (engine): kept "DPF clogging with short urban trips"
DELETE FROM catalog_component_faults
WHERE id = 'fc0a2a30-ba9f-46c1-860d-ff91360e3157'::uuid AND lower(fault) = lower('DPF clogging with short trips');
-- CAYC@77 (engine): kept "Piezo injectors — expensive to replace"
DELETE FROM catalog_component_faults
WHERE id = '73225bb3-73af-425e-95d8-8dab3eecbddd'::uuid AND lower(fault) = lower('Piezo injectors expensive');
-- CAYC@77 (engine): kept "Piezo injectors — expensive to replace"
DELETE FROM catalog_component_faults
WHERE id = '79576433-dd65-4fce-9631-36469bb4be68'::uuid AND lower(fault) = lower('Piezo injectors — expensive replacement');
-- CAYC@77 (engine): kept "Piezo injectors — expensive to replace"
DELETE FROM catalog_component_faults
WHERE id = 'a9d22e1a-cf21-4eb2-9ee0-5f50c49c1b2a'::uuid AND lower(fault) = lower('Piezo injectors expensive to replace');
-- CBZB@77 (engine): kept "Timing chain stretching and jumping (esp. 2010-2011)."
DELETE FROM catalog_component_faults
WHERE id = 'e69afff4-67d6-47a3-9d07-30e8e3ee45f6'::uuid AND lower(fault) = lower('Timing chain stretching — primary and expensive concern');
-- CBZB@77 (engine): kept "Timing chain stretching and jumping (esp. 2010-2011)."
DELETE FROM catalog_component_faults
WHERE id = 'b9eb426c-483f-4725-b302-b3398b564c3e'::uuid AND lower(fault) = lower('Timing chain stretching — the primary concern');
-- CBZB@77 (engine): kept "Timing chain stretching and jumping (esp. 2010-2011)."
DELETE FROM catalog_component_faults
WHERE id = 'e156f785-2542-444e-863f-858b0675d3e2'::uuid AND lower(fault) = lower('Timing chain stretching — number one concern');
-- CBZB@77 (engine): kept "Timing chain stretching and jumping (esp. 2010-2011)."
DELETE FROM catalog_component_faults
WHERE id = '5e44afe7-86e8-4d4a-8b84-1c16e512e975'::uuid AND lower(fault) = lower('Timing chain stretching — number one concern and critical');
-- CBZB@77 (engine): kept "Water pump leak 60,000 – 80,000 km"
DELETE FROM catalog_component_faults
WHERE id = '44720105-f68a-4b3d-9bd2-83ac310a93c8'::uuid AND lower(fault) = lower('Water pump leak 60 – 80k km');
-- CBZB@77 (engine): kept "Turbo diverter valve — boost leaks"
DELETE FROM catalog_component_faults
WHERE id = 'dfb7f173-c946-495c-b6d5-55cd0109a0fa'::uuid AND lower(fault) = lower('Turbo diverter valve boost leaks');
-- CHHA@169 (engine): kept "Increased oil consumption — check every 1,000 km"
DELETE FROM catalog_component_faults
WHERE id = '5e9eea17-7a6e-47ad-bbf7-1384988ceb0a'::uuid AND lower(fault) = lower('Oil consumption — check every 1,000 km');
-- CHHA@169 (engine): kept "Carbon deposits on intake valves (direct injection)"
DELETE FROM catalog_component_faults
WHERE id = 'a2acb469-b1ac-49ab-8ad0-27b642fe5493'::uuid AND lower(fault) = lower('Carbon deposits on intake valves');
-- CHHA@169 (engine): kept "Water pump — same issue as 1.4 TSI"
DELETE FROM catalog_component_faults
WHERE id = 'b2f163b3-9b71-437f-8f6f-6e4bd1911bf0'::uuid AND lower(fault) = lower('Water pump leak');
-- CHHA@169 (engine): kept "Turbo — higher stress, shorter life under hard driving"
DELETE FROM catalog_component_faults
WHERE id = '516443b5-0560-40d7-9135-d4e03c2f64f9'::uuid AND lower(fault) = lower('Turbo stress under track use');
-- CHYA@44 (engine): kept "Ignition coils at very high mileage"
DELETE FROM catalog_component_faults
WHERE id = 'ddb94edb-17dc-421e-961f-9df9e42a9a4c'::uuid AND lower(fault) = lower('Ignition coils at higher mileage');
-- CHYA@44 (engine): kept "Thermostat — rare sticking"
DELETE FROM catalog_component_faults
WHERE id = 'b1d7cd5d-9935-4d06-b570-0a088c365e5d'::uuid AND lower(fault) = lower('Thermostat sticking');
-- CRBC@110 (engine): kept "DMF wear at 130,000 – 180,000 km"
DELETE FROM catalog_component_faults
WHERE id = '06391b99-ce74-4275-a78d-4a76fab713b9'::uuid AND lower(fault) = lower('DMF wear around 150,000 km');
-- CRBC@110 (engine): kept "DMF wear at 130,000 – 180,000 km"
DELETE FROM catalog_component_faults
WHERE id = '1da8373e-6e19-4e89-9ce2-9e30ded90761'::uuid AND lower(fault) = lower('DMF wear at 130 – 180k km');
-- CRBC@110 (engine): kept "Injectors — carbon build-up after 150,000+ km"
DELETE FROM catalog_component_faults
WHERE id = '83cf75f2-a031-4ae6-9949-f75265fa2247'::uuid AND lower(fault) = lower('Injectors — carbon build-up after 150k+ km');
-- CRBC@110 (engine): kept "Injectors — carbon build-up after 150,000+ km"
DELETE FROM catalog_component_faults
WHERE id = 'b002a3b2-6e61-4884-8a3f-99101c7910d4'::uuid AND lower(fault) = lower('Injector carbon build-up after 150k+ km');
-- CRBC@110 (engine): kept "EGR cooler cracking at higher mileage"
DELETE FROM catalog_component_faults
WHERE id = '68573728-8514-4f36-bfcb-309ae129ddb7'::uuid AND lower(fault) = lower('EGR cooler cracking');
-- CRBC@110 (engine): kept "DPF clogging with city driving"
DELETE FROM catalog_component_faults
WHERE id = 'c89a9b4c-69db-4442-8b1a-36f912170ca7'::uuid AND lower(fault) = lower('DPF regeneration issues with urban driving');
-- CRBC@110 (engine): kept "DPF clogging with city driving"
DELETE FROM catalog_component_faults
WHERE id = '3624f6a3-1d9f-443e-a90f-5e7ac264d3c6'::uuid AND lower(fault) = lower('DPF with city driving');
-- CZDA@110 (engine): kept "Water pump with thermostat — leak around 80,000 km"
DELETE FROM catalog_component_faults
WHERE id = '2600924c-045a-452c-a39e-456eda3360e5'::uuid AND lower(fault) = lower('Water pump with thermostat leak around 80k km');
-- CZDA@110 (engine): kept "Water pump with thermostat — leak around 80,000 km"
DELETE FROM catalog_component_faults
WHERE id = '5592740a-cd5e-44da-b9d5-c18ec0d00c7f'::uuid AND lower(fault) = lower('Water pump failure');
-- CZDA@110 (engine): kept "ACT cylinder deactivation — occasional vibrations"
DELETE FROM catalog_component_faults
WHERE id = '34afdd18-105b-4ef4-93e0-d943eb706351'::uuid AND lower(fault) = lower('ACT cylinder deactivation vibrations');
-- CZDA@110 (engine): kept "Carbon build-up on intake valves common with older EA211 engines driven predominantly in city traffic."
DELETE FROM catalog_component_faults
WHERE id = '564ca0c8-53c9-4abb-add6-5df48e63a03f'::uuid AND lower(fault) = lower('Carbon build-up');
-- CZDA@110 (engine): kept "Carbon build-up on intake valves common with older EA211 engines driven predominantly in city traffic."
DELETE FROM catalog_component_faults
WHERE id = 'bb41a8dc-f9e2-4c51-b9fd-ba0644446cc7'::uuid AND lower(fault) = lower('Carbon build-up with city driving');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = 'b9836701-776c-42ce-9d9d-d27bef48bbf3'::uuid AND lower(fault) = lower('Water pump same 1.5 TSI family concern');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = '78262453-90bc-43a2-a161-fd1e901f97ef'::uuid AND lower(fault) = lower('Water pump same family issue');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = 'ef03d903-a209-453f-81d0-6aa13b9c5a52'::uuid AND lower(fault) = lower('Water pump same concern');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = 'ee1c99e4-c6bf-4732-b0ec-e770ad89df67'::uuid AND lower(fault) = lower('Water pump — same family issue');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = 'ee374ad9-28b3-4958-883a-6dd5881602ee'::uuid AND lower(fault) = lower('Water pump plastic impeller');
-- DADA@110 (engine): kept "Water pump plastic impeller — leak possible"
DELETE FROM catalog_component_faults
WHERE id = '2d034b88-af8a-45a4-b54d-6fde6ca8710e'::uuid AND lower(fault) = lower('Water pump — same 1.5 TSI concern');
-- DADA@110 (engine): kept "OPF clogging with short city trips"
DELETE FROM catalog_component_faults
WHERE id = '9bfb286d-44c0-4451-9a6d-fe3f943b94c6'::uuid AND lower(fault) = lower('OPF clogging with exclusively short trips');
-- DADA@110 (engine): kept "OPF clogging with short city trips"
DELETE FROM catalog_component_faults
WHERE id = '0f73897b-e59e-4cea-8691-135af518a2c8'::uuid AND lower(fault) = lower('OPF clogging with short trips only');
-- DADA@110 (engine): kept "OPF clogging with short city trips"
DELETE FROM catalog_component_faults
WHERE id = 'c765cd72-6bb0-4e16-a9cf-cabec7b76fbc'::uuid AND lower(fault) = lower('OPF clogging with short trips');
-- DFFA@110 (engine): kept "DPF with city driving"
DELETE FROM catalog_component_faults
WHERE id = '6b7f5e97-2460-4920-a1e7-e24aa6075e0c'::uuid AND lower(fault) = lower('DPF');
-- DFGA@110 (engine): kept "Oil pump chain slack — EA288 concern"
DELETE FROM catalog_component_faults
WHERE id = '1e36624e-32b9-4877-aabd-e91f647645e3'::uuid AND lower(fault) = lower('Oil pump occasional issues at higher mileage');
-- DFGA@110 (engine): kept "Oil pump chain slack — EA288 concern"
DELETE FROM catalog_component_faults
WHERE id = '9d723bc3-d84f-403a-a5ce-fb9c7f29e8ff'::uuid AND lower(fault) = lower('Oil pump chain tensioner concern');
-- DFGA@110 (engine): kept "Oil pump chain slack — EA288 concern"
DELETE FROM catalog_component_faults
WHERE id = '96625585-7649-4b96-acc1-20cdb0a63116'::uuid AND lower(fault) = lower('Oil pump chain slack');
-- DFGA@110 (engine): kept "Oil pump chain slack — EA288 concern"
DELETE FROM catalog_component_faults
WHERE id = '526c5d14-06e0-4475-9920-746b517b9c3c'::uuid AND lower(fault) = lower('Oil pump chain concern');
-- DFGA@110 (engine): kept "AdBlue system sensor and pump failures"
DELETE FROM catalog_component_faults
WHERE id = '4c38b91a-66ff-4b1d-b2ab-a4b4030e9ccc'::uuid AND lower(fault) = lower('AdBlue sensor/pump failures');
-- DFGA@110 (engine): kept "AdBlue system sensor and pump failures"
DELETE FROM catalog_component_faults
WHERE id = 'a126aaad-5675-427b-8122-78729f9d6ab5'::uuid AND lower(fault) = lower('AdBlue failures');
-- DFGA@110 (engine): kept "AdBlue system sensor and pump failures"
DELETE FROM catalog_component_faults
WHERE id = '9f989adb-8d7a-4d0e-8dee-35f806a8f5f4'::uuid AND lower(fault) = lower('AdBlue sensor failures');
-- DFGA@110 (engine): kept "EGR improved but still sensitive to urban driving"
DELETE FROM catalog_component_faults
WHERE id = '801e786f-bf6e-4279-845e-e08f40b1a3ab'::uuid AND lower(fault) = lower('EGR sensitive to urban-only driving');
-- DFGA@110 (engine): kept "DPF requires regular highway drives"
DELETE FROM catalog_component_faults
WHERE id = '65e306a3-fe35-4ed6-a202-99b920a2f047'::uuid AND lower(fault) = lower('DPF needs highway driving');
-- DFGA@110 (engine): kept "DPF requires regular highway drives"
DELETE FROM catalog_component_faults
WHERE id = '59fd4a19-e506-46f1-989f-64aa89f5d059'::uuid AND lower(fault) = lower('DPF needs regular highway drives');
-- DFGA@110 (engine): kept "DPF requires regular highway drives"
DELETE FROM catalog_component_faults
WHERE id = 'd53634ca-9db6-4dea-a26b-71ba09e91e47'::uuid AND lower(fault) = lower('DPF needs highway drives');
-- DFHA@140 (engine): kept "AdBlue sensor/pump failures after 80,000+ km"
DELETE FROM catalog_component_faults
WHERE id = 'eff86e7c-c00c-497d-8c0e-59873eb81aac'::uuid AND lower(fault) = lower('AdBlue sensor/pump failures');
-- DFHA@140 (engine): kept "Oil pump chain concern"
DELETE FROM catalog_component_faults
WHERE id = '5c265a3c-2ae6-4306-a23a-4728f3d51f20'::uuid AND lower(fault) = lower('Oil pump — known EA288 concern');
-- DKZA@140 (engine): kept "Oil consumption — check every 1,000 – 2,000 km"
DELETE FROM catalog_component_faults
WHERE id = '505263a9-6d1b-43e7-a199-b241633cc612'::uuid AND lower(fault) = lower('Oil consumption — check regularly');
-- DKZA@140 (engine): kept "Carbon build-up on intake valves"
DELETE FROM catalog_component_faults
WHERE id = 'f04e85e1-b736-4151-82e5-e3c4dad9a727'::uuid AND lower(fault) = lower('Carbon deposits on intake valves');
-- DLAA@81 (engine): kept "Water pump plastic impeller leak possible"
DELETE FROM catalog_component_faults
WHERE id = '0e8d7413-b494-4ae0-bb1a-855ef1b81175'::uuid AND lower(fault) = lower('Water pump plastic impeller leak');
-- DLAA@81 (engine): kept "Water pump plastic impeller leak possible"
DELETE FROM catalog_component_faults
WHERE id = '73a7f1be-3c06-4b93-9373-8d31af027e11'::uuid AND lower(fault) = lower('Water pump plastic impeller');
-- DLAA@81 (engine): kept "Turbo wastegate occasional rattle at idle"
DELETE FROM catalog_component_faults
WHERE id = '537affa9-5565-405c-a7f9-bb5157af717d'::uuid AND lower(fault) = lower('Turbo wastegate occasional rattle');
-- DLAA@81 (engine): kept "Turbo wastegate occasional rattle at idle"
DELETE FROM catalog_component_faults
WHERE id = '37952100-9ca0-4626-b400-c71ea78a6c80'::uuid AND lower(fault) = lower('Turbo wastegate rattle');
-- VW DQ200 (transmission): kept "Mechatronics unit failure — 800 – 1,500 EUR"
DELETE FROM catalog_component_faults
WHERE id = '47879ed9-969d-45c8-8fb0-dab6e381d809'::uuid AND lower(fault) = lower('Mechatronics failure');
-- VW DQ200 (transmission): kept "Mechatronics unit failure — 800 – 1,500 EUR"
DELETE FROM catalog_component_faults
WHERE id = '71181f66-4306-484e-a4cf-790d13bebd84'::uuid AND lower(fault) = lower('Mechatronics failure — same VW DQ200 issue');
-- VW DQ200 (transmission): kept "Mechatronics unit failure — 800 – 1,500 EUR"
DELETE FROM catalog_component_faults
WHERE id = '3269c863-11d7-4398-aa12-bc9b8417cf36'::uuid AND lower(fault) = lower('Mechatronics failure — 800 – 1,500 EUR');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = 'd2d16171-5db9-4b00-bd57-ef5f7edb84eb'::uuid AND lower(fault) = lower('Dry clutch judder on launch');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = '9ffdf33f-4a69-453f-aa78-881429876ab9'::uuid AND lower(fault) = lower('Dry clutch judder in slow traffic');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = '991c527f-33a8-4881-a648-996dab341b9f'::uuid AND lower(fault) = lower('Dry clutch judder in traffic');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = 'fc5a87e5-b014-47d5-bff6-b6a14c1ffa08'::uuid AND lower(fault) = lower('Dry clutch judder');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = 'bb9e40a1-84a5-4b8f-89a7-038995e235aa'::uuid AND lower(fault) = lower('Clutch shudder at low speed');
-- VW DQ200 (transmission): kept "Dry clutch plates — juddering on launch"
DELETE FROM catalog_component_faults
WHERE id = '7be1caa3-78ec-44a8-8c26-44f725e871b8'::uuid AND lower(fault) = lower('Dry clutch judder in slow traffic still possible');
-- VW DQ200 (transmission): kept "Input shaft bearing noise in neutral"
DELETE FROM catalog_component_faults
WHERE id = '62b3e6df-f76f-49e2-851e-0be8e413db4f'::uuid AND lower(fault) = lower('Input shaft bearing — noise in neutral');
-- VW DQ200 (transmission): kept "Input shaft bearing noise in neutral"
DELETE FROM catalog_component_faults
WHERE id = '91299ab8-3623-4c09-a07f-86d5485b4952'::uuid AND lower(fault) = lower('Input shaft bearing noise');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = 'bd4aeb1f-5a49-42c7-9366-e08258a20784'::uuid AND lower(fault) = lower('Mechatronics more robust than DQ200');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = '3239eec8-1cd9-4d80-8494-3a4dd3db708c'::uuid AND lower(fault) = lower('Mechatronics — more robust than DQ200');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = 'd508fe44-a424-43c6-916d-227fcf7230c7'::uuid AND lower(fault) = lower('Mechatronics — more robust than DQ200 but can fail');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = '259c3dec-e1e5-4d04-84e1-056aa8d6edef'::uuid AND lower(fault) = lower('Mechatronics — robust but not trouble-free');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = 'b313a11a-b379-476c-9252-99ff6cad2fe9'::uuid AND lower(fault) = lower('Mechatronics can fail but more reliable than DQ200');
-- VW DQ250 (transmission): kept "Mechatronics more robust than DQ200 but not trouble-free"
DELETE FROM catalog_component_faults
WHERE id = '581c7bae-8b4c-460d-99ba-a992feb77706'::uuid AND lower(fault) = lower('Mechatronic at very high mileage');
-- VW DQ250 (transmission): kept "Oil cooler — check for leaks at higher mileage"
DELETE FROM catalog_component_faults
WHERE id = 'b6e7a827-92d5-4505-8658-dbda99dd654f'::uuid AND lower(fault) = lower('Oil cooler — check for leaks');
-- VW DQ250 (transmission): kept "Oil cooler — check for leaks at higher mileage"
DELETE FROM catalog_component_faults
WHERE id = '00d7908d-d2e6-4244-be3c-aa0ee877ea17'::uuid AND lower(fault) = lower('Oil cooler leak possible');
-- VW DQ250 (transmission): kept "Oil cooler — check for leaks at higher mileage"
DELETE FROM catalog_component_faults
WHERE id = '371ce08a-8031-44a9-8ac8-489fc564bb74'::uuid AND lower(fault) = lower('Oil cooler check for leaks');
-- VW DQ250 (transmission): kept "Oil cooler — check for leaks at higher mileage"
DELETE FROM catalog_component_faults
WHERE id = 'ac0a62e8-125f-4ff8-b82b-09d05ec5b010'::uuid AND lower(fault) = lower('Oil cooler leaks possible');
-- VW DQ250 (transmission): kept "Valve body — rough shifting if oil neglected"
DELETE FROM catalog_component_faults
WHERE id = '8c8a82d3-6a4d-4aaf-b0d7-5aa708de3077'::uuid AND lower(fault) = lower('Valve body wear if oil neglected');
-- VW DQ381 (transmission): kept "Wet clutch — significantly more reliable than DQ200"
DELETE FROM catalog_component_faults
WHERE id = '502b4542-aa43-4c81-ae4e-4f51c36b927c'::uuid AND lower(fault) = lower('Wet clutch — much more reliable than DQ200');
-- VW DQ381 (transmission): kept "Wet clutch — significantly more reliable than DQ200"
DELETE FROM catalog_component_faults
WHERE id = '980c3f38-b105-4330-b9d9-bc2852ed9eb7'::uuid AND lower(fault) = lower('Wet clutch — reliable');
-- VW DQ381 (transmission): kept "Wet clutch — significantly more reliable than DQ200"
DELETE FROM catalog_component_faults
WHERE id = '746d17cb-e83c-467a-87f1-3056ef0af594'::uuid AND lower(fault) = lower('Wet clutch — much more reliable than old DQ200');
-- VW DQ381 (transmission): kept "Software updates occasionally needed for shift quality"
DELETE FROM catalog_component_faults
WHERE id = '0f20df5b-780a-463e-bfe3-2c2ab1111ba4'::uuid AND lower(fault) = lower('Software updates occasionally needed');
-- VW DQ381 (transmission): kept "Software updates occasionally needed for shift quality"
DELETE FROM catalog_component_faults
WHERE id = 'cd383053-5a90-4ab8-95d7-526afb2394e3'::uuid AND lower(fault) = lower('Software updates needed occasionally');
-- VW DQ500 (transmission): kept "Mechatronics more durable but expensive — 1,200 – 2,000 EUR"
DELETE FROM catalog_component_faults
WHERE id = 'd9f7e6ef-6ee5-405c-9fed-35c4f027cb30'::uuid AND lower(fault) = lower('Mechatronics durable but expensive — 1,200 – 2,000 EUR');
-- VW MQ200 (transmission): kept "Cable shift slight play over time"
DELETE FROM catalog_component_faults
WHERE id = 'c6888f78-f494-4139-b4ce-d1140d48acf8'::uuid AND lower(fault) = lower('Cable shift slight play with age');
-- VW MQ200 (transmission): kept "Clutch cable stretching with age"
DELETE FROM catalog_component_faults
WHERE id = '269b9199-f70d-4242-8f66-e55b4aaab1d8'::uuid AND lower(fault) = lower('Cable clutch stretching');
-- VW MQ200 (transmission): kept "Clutch cable stretching with age"
DELETE FROM catalog_component_faults
WHERE id = 'b6387f16-ad7b-49f3-8ee0-d1f85fb96344'::uuid AND lower(fault) = lower('Clutch cable stretching');
-- VW MQ200 (transmission): kept "Stiff shifting when cold in winter"
DELETE FROM catalog_component_faults
WHERE id = 'f21c7c6e-39d2-47b1-973c-b33f17cf3a3c'::uuid AND lower(fault) = lower('Stiff when cold in winter');
-- VW MQ200 (transmission): kept "Stiff shifting when cold in winter"
DELETE FROM catalog_component_faults
WHERE id = 'fdc522ce-75a0-47ff-b60d-bc00f74c8c84'::uuid AND lower(fault) = lower('Stiff when cold');
-- VW MQ250 (transmission): kept "DMF wear with diesels around 180,000 – 250,000 km"
DELETE FROM catalog_component_faults
WHERE id = '98a7c8b3-d312-4caa-b773-4a4bbda8e5e4'::uuid AND lower(fault) = lower('DMF wear with diesel engines');
-- VW MQ250 (transmission): kept "DMF wear with diesels around 180,000 – 250,000 km"
DELETE FROM catalog_component_faults
WHERE id = 'fe340b7a-4c71-43b7-89bd-c25243cbbf3d'::uuid AND lower(fault) = lower('DMF wear with diesels');
-- VW MQ250 (transmission): kept "DMF wear with diesels around 180,000 – 250,000 km"
DELETE FROM catalog_component_faults
WHERE id = '927a1711-b432-4a01-9417-3eeb7aea0ea9'::uuid AND lower(fault) = lower('DMF wear with diesel');
-- VW MQ250 (transmission): kept "Synchros notchy on 1st/2nd after 200,000+ km"
DELETE FROM catalog_component_faults
WHERE id = 'b712c308-dfc3-437d-9810-8162ad0e0016'::uuid AND lower(fault) = lower('Synchros gradual wear after 200k km');
-- VW MQ250 (transmission): kept "Cable shift mechanism can develop play"
DELETE FROM catalog_component_faults
WHERE id = 'e0eef238-e722-4220-b289-b0207936b010'::uuid AND lower(fault) = lower('Cable shift play over time');
-- VW MQ250 (transmission): kept "Cable shift mechanism can develop play"
DELETE FROM catalog_component_faults
WHERE id = 'f7a3e43c-a429-4eb3-8186-84d9fdcf40c1'::uuid AND lower(fault) = lower('Slight cable play over time');
-- VW MQ350 (transmission): kept "DMF wear with diesel at 150 – 200k km"
DELETE FROM catalog_component_faults
WHERE id = 'abe5b59c-081f-4d36-a646-9981ff6bc16d'::uuid AND lower(fault) = lower('DMF wear with diesel engines');
-- VW MQ350 (transmission): kept "DMF wear with diesel at 150 – 200k km"
DELETE FROM catalog_component_faults
WHERE id = '28450139-a3ae-4a4a-84ac-66e666fce49f'::uuid AND lower(fault) = lower('DMF wear with diesels');
-- VW MQ350 (transmission): kept "DMF wear with diesel at 150 – 200k km"
DELETE FROM catalog_component_faults
WHERE id = '3994a2b3-5ba3-4573-a1bc-5a411de64f58'::uuid AND lower(fault) = lower('DMF wear with diesel');
-- VW MQ350 (transmission): kept "Synchros gradual wear after 200k+ km"
DELETE FROM catalog_component_faults
WHERE id = '427fdb57-3bca-4bda-9f6b-b0a9a71e1538'::uuid AND lower(fault) = lower('Synchros gradual wear');
-- VW MQ350 (transmission): kept "Synchros gradual wear after 200k+ km"
DELETE FROM catalog_component_faults
WHERE id = '4e75aca6-1712-4733-8ef3-2b337f28046e'::uuid AND lower(fault) = lower('Synchros wear after 200k km');

-- Postcondition: none of these ids exist any more.
DO $$
DECLARE remaining_n integer;
BEGIN
  SELECT count(*) INTO remaining_n FROM catalog_component_faults WHERE id IN (
    'fc0a2a30-ba9f-46c1-860d-ff91360e3157'::uuid,
    '73225bb3-73af-425e-95d8-8dab3eecbddd'::uuid,
    '79576433-dd65-4fce-9631-36469bb4be68'::uuid,
    'a9d22e1a-cf21-4eb2-9ee0-5f50c49c1b2a'::uuid,
    'e69afff4-67d6-47a3-9d07-30e8e3ee45f6'::uuid,
    'b9eb426c-483f-4725-b302-b3398b564c3e'::uuid,
    'e156f785-2542-444e-863f-858b0675d3e2'::uuid,
    '5e44afe7-86e8-4d4a-8b84-1c16e512e975'::uuid,
    '44720105-f68a-4b3d-9bd2-83ac310a93c8'::uuid,
    'dfb7f173-c946-495c-b6d5-55cd0109a0fa'::uuid,
    '5e9eea17-7a6e-47ad-bbf7-1384988ceb0a'::uuid,
    'a2acb469-b1ac-49ab-8ad0-27b642fe5493'::uuid,
    'b2f163b3-9b71-437f-8f6f-6e4bd1911bf0'::uuid,
    '516443b5-0560-40d7-9135-d4e03c2f64f9'::uuid,
    'ddb94edb-17dc-421e-961f-9df9e42a9a4c'::uuid,
    'b1d7cd5d-9935-4d06-b570-0a088c365e5d'::uuid,
    '06391b99-ce74-4275-a78d-4a76fab713b9'::uuid,
    '1da8373e-6e19-4e89-9ce2-9e30ded90761'::uuid,
    '83cf75f2-a031-4ae6-9949-f75265fa2247'::uuid,
    'b002a3b2-6e61-4884-8a3f-99101c7910d4'::uuid,
    '68573728-8514-4f36-bfcb-309ae129ddb7'::uuid,
    'c89a9b4c-69db-4442-8b1a-36f912170ca7'::uuid,
    '3624f6a3-1d9f-443e-a90f-5e7ac264d3c6'::uuid,
    '2600924c-045a-452c-a39e-456eda3360e5'::uuid,
    '5592740a-cd5e-44da-b9d5-c18ec0d00c7f'::uuid,
    '34afdd18-105b-4ef4-93e0-d943eb706351'::uuid,
    '564ca0c8-53c9-4abb-add6-5df48e63a03f'::uuid,
    'bb41a8dc-f9e2-4c51-b9fd-ba0644446cc7'::uuid,
    'b9836701-776c-42ce-9d9d-d27bef48bbf3'::uuid,
    '78262453-90bc-43a2-a161-fd1e901f97ef'::uuid,
    'ef03d903-a209-453f-81d0-6aa13b9c5a52'::uuid,
    'ee1c99e4-c6bf-4732-b0ec-e770ad89df67'::uuid,
    'ee374ad9-28b3-4958-883a-6dd5881602ee'::uuid,
    '2d034b88-af8a-45a4-b54d-6fde6ca8710e'::uuid,
    '9bfb286d-44c0-4451-9a6d-fe3f943b94c6'::uuid,
    '0f73897b-e59e-4cea-8691-135af518a2c8'::uuid,
    'c765cd72-6bb0-4e16-a9cf-cabec7b76fbc'::uuid,
    '6b7f5e97-2460-4920-a1e7-e24aa6075e0c'::uuid,
    '1e36624e-32b9-4877-aabd-e91f647645e3'::uuid,
    '9d723bc3-d84f-403a-a5ce-fb9c7f29e8ff'::uuid,
    '96625585-7649-4b96-acc1-20cdb0a63116'::uuid,
    '526c5d14-06e0-4475-9920-746b517b9c3c'::uuid,
    '4c38b91a-66ff-4b1d-b2ab-a4b4030e9ccc'::uuid,
    'a126aaad-5675-427b-8122-78729f9d6ab5'::uuid,
    '9f989adb-8d7a-4d0e-8dee-35f806a8f5f4'::uuid,
    '801e786f-bf6e-4279-845e-e08f40b1a3ab'::uuid,
    '65e306a3-fe35-4ed6-a202-99b920a2f047'::uuid,
    '59fd4a19-e506-46f1-989f-64aa89f5d059'::uuid,
    'd53634ca-9db6-4dea-a26b-71ba09e91e47'::uuid,
    'eff86e7c-c00c-497d-8c0e-59873eb81aac'::uuid,
    '5c265a3c-2ae6-4306-a23a-4728f3d51f20'::uuid,
    '505263a9-6d1b-43e7-a199-b241633cc612'::uuid,
    'f04e85e1-b736-4151-82e5-e3c4dad9a727'::uuid,
    '0e8d7413-b494-4ae0-bb1a-855ef1b81175'::uuid,
    '73a7f1be-3c06-4b93-9373-8d31af027e11'::uuid,
    '537affa9-5565-405c-a7f9-bb5157af717d'::uuid,
    '37952100-9ca0-4626-b400-c71ea78a6c80'::uuid,
    '47879ed9-969d-45c8-8fb0-dab6e381d809'::uuid,
    '71181f66-4306-484e-a4cf-790d13bebd84'::uuid,
    '3269c863-11d7-4398-aa12-bc9b8417cf36'::uuid,
    'd2d16171-5db9-4b00-bd57-ef5f7edb84eb'::uuid,
    '9ffdf33f-4a69-453f-aa78-881429876ab9'::uuid,
    '991c527f-33a8-4881-a648-996dab341b9f'::uuid,
    'fc5a87e5-b014-47d5-bff6-b6a14c1ffa08'::uuid,
    'bb9e40a1-84a5-4b8f-89a7-038995e235aa'::uuid,
    '7be1caa3-78ec-44a8-8c26-44f725e871b8'::uuid,
    '62b3e6df-f76f-49e2-851e-0be8e413db4f'::uuid,
    '91299ab8-3623-4c09-a07f-86d5485b4952'::uuid,
    'bd4aeb1f-5a49-42c7-9366-e08258a20784'::uuid,
    '3239eec8-1cd9-4d80-8494-3a4dd3db708c'::uuid,
    'd508fe44-a424-43c6-916d-227fcf7230c7'::uuid,
    '259c3dec-e1e5-4d04-84e1-056aa8d6edef'::uuid,
    'b313a11a-b379-476c-9252-99ff6cad2fe9'::uuid,
    '581c7bae-8b4c-460d-99ba-a992feb77706'::uuid,
    'b6e7a827-92d5-4505-8658-dbda99dd654f'::uuid,
    '00d7908d-d2e6-4244-be3c-aa0ee877ea17'::uuid,
    '371ce08a-8031-44a9-8ac8-489fc564bb74'::uuid,
    'ac0a62e8-125f-4ff8-b82b-09d05ec5b010'::uuid,
    '8c8a82d3-6a4d-4aaf-b0d7-5aa708de3077'::uuid,
    '502b4542-aa43-4c81-ae4e-4f51c36b927c'::uuid,
    '980c3f38-b105-4330-b9d9-bc2852ed9eb7'::uuid,
    '746d17cb-e83c-467a-87f1-3056ef0af594'::uuid,
    '0f20df5b-780a-463e-bfe3-2c2ab1111ba4'::uuid,
    'cd383053-5a90-4ab8-95d7-526afb2394e3'::uuid,
    'd9f7e6ef-6ee5-405c-9fed-35c4f027cb30'::uuid,
    'c6888f78-f494-4139-b4ce-d1140d48acf8'::uuid,
    '269b9199-f70d-4242-8f66-e55b4aaab1d8'::uuid,
    'b6387f16-ad7b-49f3-8ee0-d1f85fb96344'::uuid,
    'f21c7c6e-39d2-47b1-973c-b33f17cf3a3c'::uuid,
    'fdc522ce-75a0-47ff-b60d-bc00f74c8c84'::uuid,
    '98a7c8b3-d312-4caa-b773-4a4bbda8e5e4'::uuid,
    'fe340b7a-4c71-43b7-89bd-c25243cbbf3d'::uuid,
    '927a1711-b432-4a01-9417-3eeb7aea0ea9'::uuid,
    'b712c308-dfc3-437d-9810-8162ad0e0016'::uuid,
    'e0eef238-e722-4220-b289-b0207936b010'::uuid,
    'f7a3e43c-a429-4eb3-8186-84d9fdcf40c1'::uuid,
    'abe5b59c-081f-4d36-a646-9981ff6bc16d'::uuid,
    '28450139-a3ae-4a4a-84ac-66e666fce49f'::uuid,
    '3994a2b3-5ba3-4573-a1bc-5a411de64f58'::uuid,
    '427fdb57-3bca-4bda-9f6b-b0a9a71e1538'::uuid,
    '4e75aca6-1712-4733-8ef3-2b337f28046e'::uuid
  );
  IF remaining_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 of these % rows to remain, found %.', 101, remaining_n;
  END IF;
END $$;

COMMIT;
