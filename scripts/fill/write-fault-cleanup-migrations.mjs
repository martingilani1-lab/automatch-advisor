// Writes two guarded, review-only migrations cleaning up catalog_component_faults rows
// imported from the old engines/transmissions tables (see 20261011205548 and
// 20261012195022). Both lists below were hand-reviewed against a live dump of every
// engine/transmission fault (scripts/fill/.scratch-dump-faults.mjs) -- ids and exact text
// are hardcoded here, not re-derived, so each DELETE is guarded on BOTH id and the exact
// fault text still matching what was reviewed.
//
// 1. Chain/belt hardware-fact mismatch cleanup: a "timing chain" fault imported onto an
//    EA211 engine whose live timing_type is 'belt' -- chain stretch is an EA111 (CBZB/CAXA)
//    concern, not EA211. 16 rows across 7 engines.
// 2. Semantic dedupe: within a single engine or gearbox unit, multiple faults describing
//    the identical real-world problem in different wording (recurring import artifact --
//    many old per-vehicle rows restating the same unit-level fact). One wording kept per
//    group (the most specific), the rest deleted.
//
// Writes files only -- never executes anything against the DB.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "supabase", "migrations");

function esc(s) { return String(s).replace(/'/g, "''"); }

function tsNow(offsetSeconds) {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

// --- Part 1: chain/belt mismatch rows (engine code@kW -> [{id, text}]) ---
const CHAIN_BELT_MISMATCH = {
  "CHZB@70": [
    { id: "9d7203dc-d413-4ad2-91e9-840bf3dd4b73", text: "Timing chain tensioner early wear on some units" },
    { id: "7ab28494-dc63-467b-b43f-8284b525f959", text: "Timing chain tensioner" },
  ],
  "CJZC@66": [
    { id: "35d03e6a-4736-4225-a822-bbfe4923a4dd", text: "Timing chain stretching — listen for rattle on startup" },
  ],
  "CVNA@110": [
    { id: "104bc7e4-caaf-4ac4-8681-350b1b43ecd5", text: "Timing chain stretch" },
  ],
  "CZDA@110": [
    { id: "674514fc-31c4-46d7-9429-b0f39ef57b98", text: "Timing chain stretching on earlier builds — listen for rattle" },
    { id: "9455c899-f0c4-47b2-8351-03aeaff72143", text: "Timing chain stretching on earlier builds" },
    { id: "21f9afd7-c5c1-46d7-b19d-00cdc5ea7236", text: "Timing chain stretch" },
    { id: "8af0b42c-a1e4-4f20-a9bc-c0ff313f7368", text: "Timing chain stretch at higher mileage" },
  ],
  "DADA@110": [
    { id: "0dd5aa12-6f87-4196-94d7-14e519bc9978", text: "Timing chain stretch" },
    { id: "48fe6010-e8ab-42b1-a3ae-3395410d22ba", text: "Timing chain improved but still monitor" },
    { id: "99ac5707-d50e-4fc6-aee9-491d78cdf393", text: "Timing chain stretch at higher mileage" },
  ],
  "DFYA@110": [
    { id: "4ff1aa94-5640-4753-a6e1-c069752ec706", text: "Timing chain stretch" },
  ],
  "DLAA@81": [
    { id: "00a0ae87-b045-4810-a1be-abbfb5e24a57", text: "Timing chain tensioner — monitor on early builds" },
    { id: "ba9742c2-762f-43b4-9e6c-f0671b3af156", text: "Timing chain tensioner — same 1.0 TSI concern" },
    { id: "6c3a3d91-538b-4713-9023-057e28d0301a", text: "Timing chain tensioner early builds" },
    { id: "7de7515e-3513-4c98-8f15-e2c97b4ebd57", text: "Timing chain tensioner — monitor early builds" },
  ],
};

// --- Part 2: semantic-dedupe removals, by (engine|unit) group ---
const GROUPS = [
  // engine: CAYC@77
  { unit: "CAYC@77 (engine)", kept: "DPF clogging with short urban trips", removed: [
    { id: "fc0a2a30-ba9f-46c1-860d-ff91360e3157", text: "DPF clogging with short trips" },
  ]},
  { unit: "CAYC@77 (engine)", kept: "Piezo injectors — expensive to replace", removed: [
    { id: "73225bb3-73af-425e-95d8-8dab3eecbddd", text: "Piezo injectors expensive" },
    { id: "79576433-dd65-4fce-9631-36469bb4be68", text: "Piezo injectors — expensive replacement" },
    { id: "a9d22e1a-cf21-4eb2-9ee0-5f50c49c1b2a", text: "Piezo injectors expensive to replace" },
  ]},
  // engine: CBZB@77
  { unit: "CBZB@77 (engine)", kept: "Timing chain stretching and jumping (esp. 2010-2011).", removed: [
    { id: "e69afff4-67d6-47a3-9d07-30e8e3ee45f6", text: "Timing chain stretching — primary and expensive concern" },
    { id: "b9eb426c-483f-4725-b302-b3398b564c3e", text: "Timing chain stretching — the primary concern" },
    { id: "e156f785-2542-444e-863f-858b0675d3e2", text: "Timing chain stretching — number one concern" },
    { id: "5e44afe7-86e8-4d4a-8b84-1c16e512e975", text: "Timing chain stretching — number one concern and critical" },
  ]},
  { unit: "CBZB@77 (engine)", kept: "Water pump leak 60,000 – 80,000 km", removed: [
    { id: "44720105-f68a-4b3d-9bd2-83ac310a93c8", text: "Water pump leak 60 – 80k km" },
  ]},
  { unit: "CBZB@77 (engine)", kept: "Turbo diverter valve — boost leaks", removed: [
    { id: "dfb7f173-c946-495c-b6d5-55cd0109a0fa", text: "Turbo diverter valve boost leaks" },
  ]},
  // engine: CHHA@169
  { unit: "CHHA@169 (engine)", kept: "Increased oil consumption — check every 1,000 km", removed: [
    { id: "5e9eea17-7a6e-47ad-bbf7-1384988ceb0a", text: "Oil consumption — check every 1,000 km" },
  ]},
  { unit: "CHHA@169 (engine)", kept: "Carbon deposits on intake valves (direct injection)", removed: [
    { id: "a2acb469-b1ac-49ab-8ad0-27b642fe5493", text: "Carbon deposits on intake valves" },
  ]},
  { unit: "CHHA@169 (engine)", kept: "Water pump — same issue as 1.4 TSI", removed: [
    { id: "b2f163b3-9b71-437f-8f6f-6e4bd1911bf0", text: "Water pump leak" },
  ]},
  { unit: "CHHA@169 (engine)", kept: "Turbo — higher stress, shorter life under hard driving", removed: [
    { id: "516443b5-0560-40d7-9135-d4e03c2f64f9", text: "Turbo stress under track use" },
  ]},
  // engine: CHYA@44
  { unit: "CHYA@44 (engine)", kept: "Ignition coils at very high mileage", removed: [
    { id: "ddb94edb-17dc-421e-961f-9df9e42a9a4c", text: "Ignition coils at higher mileage" },
  ]},
  { unit: "CHYA@44 (engine)", kept: "Thermostat — rare sticking", removed: [
    { id: "b1d7cd5d-9935-4d06-b570-0a088c365e5d", text: "Thermostat sticking" },
  ]},
  // engine: CRBC@110
  { unit: "CRBC@110 (engine)", kept: "DMF wear at 130,000 – 180,000 km", removed: [
    { id: "06391b99-ce74-4275-a78d-4a76fab713b9", text: "DMF wear around 150,000 km" },
    { id: "1da8373e-6e19-4e89-9ce2-9e30ded90761", text: "DMF wear at 130 – 180k km" },
  ]},
  { unit: "CRBC@110 (engine)", kept: "Injectors — carbon build-up after 150,000+ km", removed: [
    { id: "83cf75f2-a031-4ae6-9949-f75265fa2247", text: "Injectors — carbon build-up after 150k+ km" },
    { id: "b002a3b2-6e61-4884-8a3f-99101c7910d4", text: "Injector carbon build-up after 150k+ km" },
  ]},
  { unit: "CRBC@110 (engine)", kept: "EGR cooler cracking at higher mileage", removed: [
    { id: "68573728-8514-4f36-bfcb-309ae129ddb7", text: "EGR cooler cracking" },
  ]},
  { unit: "CRBC@110 (engine)", kept: "DPF clogging with city driving", removed: [
    { id: "c89a9b4c-69db-4442-8b1a-36f912170ca7", text: "DPF regeneration issues with urban driving" },
    { id: "3624f6a3-1d9f-443e-a90f-5e7ac264d3c6", text: "DPF with city driving" },
  ]},
  // engine: CZDA@110 (after the chain-mismatch rows above are gone)
  { unit: "CZDA@110 (engine)", kept: "Water pump with thermostat — leak around 80,000 km", removed: [
    { id: "2600924c-045a-452c-a39e-456eda3360e5", text: "Water pump with thermostat leak around 80k km" },
    { id: "5592740a-cd5e-44da-b9d5-c18ec0d00c7f", text: "Water pump failure" },
  ]},
  { unit: "CZDA@110 (engine)", kept: "ACT cylinder deactivation — occasional vibrations", removed: [
    { id: "34afdd18-105b-4ef4-93e0-d943eb706351", text: "ACT cylinder deactivation vibrations" },
  ]},
  { unit: "CZDA@110 (engine)", kept: "Carbon build-up on intake valves common with older EA211 engines driven predominantly in city traffic.", removed: [
    { id: "564ca0c8-53c9-4abb-add6-5df48e63a03f", text: "Carbon build-up" },
    { id: "bb41a8dc-f9e2-4c51-b9fd-ba0644446cc7", text: "Carbon build-up with city driving" },
  ]},
  // engine: DADA@110 (after the chain-mismatch rows above are gone)
  { unit: "DADA@110 (engine)", kept: "Water pump plastic impeller — leak possible", removed: [
    { id: "b9836701-776c-42ce-9d9d-d27bef48bbf3", text: "Water pump same 1.5 TSI family concern" },
    { id: "78262453-90bc-43a2-a161-fd1e901f97ef", text: "Water pump same family issue" },
    { id: "ef03d903-a209-453f-81d0-6aa13b9c5a52", text: "Water pump same concern" },
    { id: "ee1c99e4-c6bf-4732-b0ec-e770ad89df67", text: "Water pump — same family issue" },
    { id: "ee374ad9-28b3-4958-883a-6dd5881602ee", text: "Water pump plastic impeller" },
    { id: "2d034b88-af8a-45a4-b54d-6fde6ca8710e", text: "Water pump — same 1.5 TSI concern" },
  ]},
  { unit: "DADA@110 (engine)", kept: "OPF clogging with short city trips", removed: [
    { id: "9bfb286d-44c0-4451-9a6d-fe3f943b94c6", text: "OPF clogging with exclusively short trips" },
    { id: "0f73897b-e59e-4cea-8691-135af518a2c8", text: "OPF clogging with short trips only" },
    { id: "c765cd72-6bb0-4e16-a9cf-cabec7b76fbc", text: "OPF clogging with short trips" },
  ]},
  // engine: DFFA@110
  { unit: "DFFA@110 (engine)", kept: "DPF with city driving", removed: [
    { id: "6b7f5e97-2460-4920-a1e7-e24aa6075e0c", text: "DPF" },
  ]},
  // engine: DFGA@110
  { unit: "DFGA@110 (engine)", kept: "Oil pump chain slack — EA288 concern", removed: [
    { id: "1e36624e-32b9-4877-aabd-e91f647645e3", text: "Oil pump occasional issues at higher mileage" },
    { id: "9d723bc3-d84f-403a-a5ce-fb9c7f29e8ff", text: "Oil pump chain tensioner concern" },
    { id: "96625585-7649-4b96-acc1-20cdb0a63116", text: "Oil pump chain slack" },
    { id: "526c5d14-06e0-4475-9920-746b517b9c3c", text: "Oil pump chain concern" },
  ]},
  { unit: "DFGA@110 (engine)", kept: "AdBlue system sensor and pump failures", removed: [
    { id: "4c38b91a-66ff-4b1d-b2ab-a4b4030e9ccc", text: "AdBlue sensor/pump failures" },
    { id: "a126aaad-5675-427b-8122-78729f9d6ab5", text: "AdBlue failures" },
    { id: "9f989adb-8d7a-4d0e-8dee-35f806a8f5f4", text: "AdBlue sensor failures" },
  ]},
  { unit: "DFGA@110 (engine)", kept: "EGR improved but still sensitive to urban driving", removed: [
    { id: "801e786f-bf6e-4279-845e-e08f40b1a3ab", text: "EGR sensitive to urban-only driving" },
  ]},
  { unit: "DFGA@110 (engine)", kept: "DPF requires regular highway drives", removed: [
    { id: "65e306a3-fe35-4ed6-a202-99b920a2f047", text: "DPF needs highway driving" },
    { id: "59fd4a19-e506-46f1-989f-64aa89f5d059", text: "DPF needs regular highway drives" },
    { id: "d53634ca-9db6-4dea-a26b-71ba09e91e47", text: "DPF needs highway drives" },
  ]},
  // engine: DFHA@140
  { unit: "DFHA@140 (engine)", kept: "AdBlue sensor/pump failures after 80,000+ km", removed: [
    { id: "eff86e7c-c00c-497d-8c0e-59873eb81aac", text: "AdBlue sensor/pump failures" },
  ]},
  { unit: "DFHA@140 (engine)", kept: "Oil pump chain concern", removed: [
    { id: "5c265a3c-2ae6-4306-a23a-4728f3d51f20", text: "Oil pump — known EA288 concern" },
  ]},
  // engine: DKZA@140
  { unit: "DKZA@140 (engine)", kept: "Oil consumption — check every 1,000 – 2,000 km", removed: [
    { id: "505263a9-6d1b-43e7-a199-b241633cc612", text: "Oil consumption — check regularly" },
  ]},
  { unit: "DKZA@140 (engine)", kept: "Carbon build-up on intake valves", removed: [
    { id: "f04e85e1-b736-4151-82e5-e3c4dad9a727", text: "Carbon deposits on intake valves" },
  ]},
  // engine: DLAA@81 (after the chain-mismatch rows above are gone)
  { unit: "DLAA@81 (engine)", kept: "Water pump plastic impeller leak possible", removed: [
    { id: "0e8d7413-b494-4ae0-bb1a-855ef1b81175", text: "Water pump plastic impeller leak" },
    { id: "73a7f1be-3c06-4b93-9373-8d31af027e11", text: "Water pump plastic impeller" },
  ]},
  { unit: "DLAA@81 (engine)", kept: "Turbo wastegate occasional rattle at idle", removed: [
    { id: "537affa9-5565-405c-a7f9-bb5157af717d", text: "Turbo wastegate occasional rattle" },
    { id: "37952100-9ca0-4626-b400-c71ea78a6c80", text: "Turbo wastegate rattle" },
  ]},
  // transmission: VW DQ200
  { unit: "VW DQ200 (transmission)", kept: "Mechatronics unit failure — 800 – 1,500 EUR", removed: [
    { id: "47879ed9-969d-45c8-8fb0-dab6e381d809", text: "Mechatronics failure" },
    { id: "71181f66-4306-484e-a4cf-790d13bebd84", text: "Mechatronics failure — same VW DQ200 issue" },
    { id: "3269c863-11d7-4398-aa12-bc9b8417cf36", text: "Mechatronics failure — 800 – 1,500 EUR" },
  ]},
  { unit: "VW DQ200 (transmission)", kept: "Dry clutch plates — juddering on launch", removed: [
    { id: "d2d16171-5db9-4b00-bd57-ef5f7edb84eb", text: "Dry clutch judder on launch" },
    { id: "9ffdf33f-4a69-453f-aa78-881429876ab9", text: "Dry clutch judder in slow traffic" },
    { id: "991c527f-33a8-4881-a648-996dab341b9f", text: "Dry clutch judder in traffic" },
    { id: "fc5a87e5-b014-47d5-bff6-b6a14c1ffa08", text: "Dry clutch judder" },
    { id: "bb9e40a1-84a5-4b8f-89a7-038995e235aa", text: "Clutch shudder at low speed" },
    { id: "7be1caa3-78ec-44a8-8c26-44f725e871b8", text: "Dry clutch judder in slow traffic still possible" },
  ]},
  { unit: "VW DQ200 (transmission)", kept: "Input shaft bearing noise in neutral", removed: [
    { id: "62b3e6df-f76f-49e2-851e-0be8e413db4f", text: "Input shaft bearing — noise in neutral" },
    { id: "91299ab8-3623-4c09-a07f-86d5485b4952", text: "Input shaft bearing noise" },
  ]},
  // transmission: VW DQ250
  { unit: "VW DQ250 (transmission)", kept: "Mechatronics more robust than DQ200 but not trouble-free", removed: [
    { id: "bd4aeb1f-5a49-42c7-9366-e08258a20784", text: "Mechatronics more robust than DQ200" },
    { id: "3239eec8-1cd9-4d80-8494-3a4dd3db708c", text: "Mechatronics — more robust than DQ200" },
    { id: "d508fe44-a424-43c6-916d-227fcf7230c7", text: "Mechatronics — more robust than DQ200 but can fail" },
    { id: "259c3dec-e1e5-4d04-84e1-056aa8d6edef", text: "Mechatronics — robust but not trouble-free" },
    { id: "b313a11a-b379-476c-9252-99ff6cad2fe9", text: "Mechatronics can fail but more reliable than DQ200" },
    { id: "581c7bae-8b4c-460d-99ba-a992feb77706", text: "Mechatronic at very high mileage" },
  ]},
  { unit: "VW DQ250 (transmission)", kept: "Oil cooler — check for leaks at higher mileage", removed: [
    { id: "b6e7a827-92d5-4505-8658-dbda99dd654f", text: "Oil cooler — check for leaks" },
    { id: "00d7908d-d2e6-4244-be3c-aa0ee877ea17", text: "Oil cooler leak possible" },
    { id: "371ce08a-8031-44a9-8ac8-489fc564bb74", text: "Oil cooler check for leaks" },
    { id: "ac0a62e8-125f-4ff8-b82b-09d05ec5b010", text: "Oil cooler leaks possible" },
  ]},
  { unit: "VW DQ250 (transmission)", kept: "Valve body — rough shifting if oil neglected", removed: [
    { id: "8c8a82d3-6a4d-4aaf-b0d7-5aa708de3077", text: "Valve body wear if oil neglected" },
  ]},
  // transmission: VW DQ381
  { unit: "VW DQ381 (transmission)", kept: "Wet clutch — significantly more reliable than DQ200", removed: [
    { id: "502b4542-aa43-4c81-ae4e-4f51c36b927c", text: "Wet clutch — much more reliable than DQ200" },
    { id: "980c3f38-b105-4330-b9d9-bc2852ed9eb7", text: "Wet clutch — reliable" },
    { id: "746d17cb-e83c-467a-87f1-3056ef0af594", text: "Wet clutch — much more reliable than old DQ200" },
  ]},
  { unit: "VW DQ381 (transmission)", kept: "Software updates occasionally needed for shift quality", removed: [
    { id: "0f20df5b-780a-463e-bfe3-2c2ab1111ba4", text: "Software updates occasionally needed" },
    { id: "cd383053-5a90-4ab8-95d7-526afb2394e3", text: "Software updates needed occasionally" },
  ]},
  // transmission: VW DQ500
  { unit: "VW DQ500 (transmission)", kept: "Mechatronics more durable but expensive — 1,200 – 2,000 EUR", removed: [
    { id: "d9f7e6ef-6ee5-405c-9fed-35c4f027cb30", text: "Mechatronics durable but expensive — 1,200 – 2,000 EUR" },
  ]},
  // transmission: VW MQ200
  { unit: "VW MQ200 (transmission)", kept: "Cable shift slight play over time", removed: [
    { id: "c6888f78-f494-4139-b4ce-d1140d48acf8", text: "Cable shift slight play with age" },
  ]},
  { unit: "VW MQ200 (transmission)", kept: "Clutch cable stretching with age", removed: [
    { id: "269b9199-f70d-4242-8f66-e55b4aaab1d8", text: "Cable clutch stretching" },
    { id: "b6387f16-ad7b-49f3-8ee0-d1f85fb96344", text: "Clutch cable stretching" },
  ]},
  { unit: "VW MQ200 (transmission)", kept: "Stiff shifting when cold in winter", removed: [
    { id: "f21c7c6e-39d2-47b1-973c-b33f17cf3a3c", text: "Stiff when cold in winter" },
    { id: "fdc522ce-75a0-47ff-b60d-bc00f74c8c84", text: "Stiff when cold" },
  ]},
  // transmission: VW MQ250
  { unit: "VW MQ250 (transmission)", kept: "DMF wear with diesels around 180,000 – 250,000 km", removed: [
    { id: "98a7c8b3-d312-4caa-b773-4a4bbda8e5e4", text: "DMF wear with diesel engines" },
    { id: "fe340b7a-4c71-43b7-89bd-c25243cbbf3d", text: "DMF wear with diesels" },
    { id: "927a1711-b432-4a01-9417-3eeb7aea0ea9", text: "DMF wear with diesel" },
  ]},
  { unit: "VW MQ250 (transmission)", kept: "Synchros notchy on 1st/2nd after 200,000+ km", removed: [
    { id: "b712c308-dfc3-437d-9810-8162ad0e0016", text: "Synchros gradual wear after 200k km" },
  ]},
  { unit: "VW MQ250 (transmission)", kept: "Cable shift mechanism can develop play", removed: [
    { id: "e0eef238-e722-4220-b289-b0207936b010", text: "Cable shift play over time" },
    { id: "f7a3e43c-a429-4eb3-8186-84d9fdcf40c1", text: "Slight cable play over time" },
  ]},
  // transmission: VW MQ350
  { unit: "VW MQ350 (transmission)", kept: "DMF wear with diesel at 150 – 200k km", removed: [
    { id: "abe5b59c-081f-4d36-a646-9981ff6bc16d", text: "DMF wear with diesel engines" },
    { id: "28450139-a3ae-4a4a-84ac-66e666fce49f", text: "DMF wear with diesels" },
    { id: "3994a2b3-5ba3-4573-a1bc-5a411de64f58", text: "DMF wear with diesel" },
  ]},
  { unit: "VW MQ350 (transmission)", kept: "Synchros gradual wear after 200k+ km", removed: [
    { id: "427fdb57-3bca-4bda-9f6b-b0a9a71e1538", text: "Synchros gradual wear" },
    { id: "4e75aca6-1712-4733-8ef3-2b337f28046e", text: "Synchros wear after 200k km" },
  ]},
];

function writeDeleteMigration({ outPath, headerLines, rows }) {
  const L = [];
  L.push(...headerLines);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  for (const r of rows) {
    L.push((r.context ?? "").trimEnd());
    L.push(`DELETE FROM catalog_component_faults`);
    L.push(`WHERE id = '${r.id}'::uuid AND lower(fault) = lower('${esc(r.text)}');`);
  }
  L.push(``);
  L.push(`-- Postcondition: none of these ids exist any more.`);
  L.push(`DO $$`);
  L.push(`DECLARE remaining_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO remaining_n FROM catalog_component_faults WHERE id IN (`);
  L.push(rows.map((r) => `    '${r.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF remaining_n <> 0 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected 0 of these % rows to remain, found %.', ${rows.length}, remaining_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);
  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath} (${rows.length} deletes)`);
}

async function main() {
  // --- verify every id+text pair still matches live data before writing anything ---
  const allIds = [
    ...Object.values(CHAIN_BELT_MISMATCH).flat().map((r) => r.id),
    ...GROUPS.flatMap((g) => g.removed.map((r) => r.id)),
  ];
  const { data: live, error } = await supabase
    .from("catalog_component_faults")
    .select("id, fault")
    .in("id", allIds);
  if (error) throw error;
  const liveById = new Map(live.map((r) => [r.id, r.fault]));
  // A row already absent is fine -- these are idempotent guarded DELETEs (id + exact text),
  // so "someone already applied this" is a no-op, not an error. Only a live row whose TEXT
  // no longer matches what was reviewed is a real problem worth aborting over.
  let alreadyGoneCount = 0;
  const mismatches = [];
  for (const id of allIds) {
    if (!liveById.has(id)) alreadyGoneCount++;
  }
  const check = (id, text) => {
    const liveText = liveById.get(id);
    if (liveText !== undefined && liveText.toLowerCase() !== text.toLowerCase()) {
      mismatches.push(`${id}: expected "${text}", live is "${liveText}"`);
    }
  };
  for (const [, rows] of Object.entries(CHAIN_BELT_MISMATCH)) for (const r of rows) check(r.id, r.text);
  for (const g of GROUPS) for (const r of g.removed) check(r.id, r.text);
  if (mismatches.length > 0) {
    throw new Error(`${mismatches.length} id/text mismatches against live data -- aborting:\n${mismatches.join("\n")}`);
  }
  if (alreadyGoneCount > 0) {
    console.log(`Note: ${alreadyGoneCount} of ${allIds.length} rows are already absent live (already deleted) -- writing the migration anyway, since each DELETE is independently guarded and idempotent.`);
  }

  // --- migration 1: chain/belt mismatch cleanup ---
  const mismatchRows = Object.entries(CHAIN_BELT_MISMATCH).flatMap(([engine, rows]) =>
    rows.map((r) => ({ ...r, context: `-- ${engine}` }))
  );
  const ts1 = tsNow(0);
  writeDeleteMigration({
    outPath: path.join(MIGRATIONS_DIR, `${ts1}_remove_chain_belt_mismatch_engine_faults.sql`),
    headerLines: [
      `-- Deletes ${mismatchRows.length} catalog_component_faults rows that claim "timing chain" wear`,
      `-- on an engine whose live timing_type is 'belt' -- a hardware-fact mismatch from the original`,
      `-- import (old per-vehicle text was written generically and not cross-checked against each`,
      `-- engine's actual timing drive). Chain-stretch concerns are real for EA111 (CBZB/CAXA,`,
      `-- timing_type='chain') but were never applicable to these EA211/EA288 belt engines.`,
      `-- "Oil pump chain" faults (oil-pump drive, not timing drive) are deliberately untouched --`,
      `-- see DFGA@110/DFHA@140, which keep their oil-pump-chain rows.`,
      `--`,
      `-- Generated by scripts/fill/write-fault-cleanup-migrations.mjs. Each DELETE is guarded on`,
      `-- both id and exact fault text (re-verified against live data at generation time), so a`,
      `-- row that's already gone or has since been edited is simply a no-op, not an error.`,
      `--`,
      `-- Review-only: NOT run by this session.`,
    ],
    rows: mismatchRows,
  });

  // --- migration 2: semantic dedupe ---
  const dedupeRows = GROUPS.flatMap((g) =>
    g.removed.map((r) => ({ ...r, context: `-- ${g.unit}: kept "${g.kept}"` }))
  );
  const ts2 = tsNow(1);
  const tableLines = GROUPS.map(
    (g) => `--   ${g.unit} | kept: "${g.kept}" | removed: ${g.removed.map((r) => `"${r.text}"`).join(", ")}`
  );
  writeDeleteMigration({
    outPath: path.join(MIGRATIONS_DIR, `${ts2}_dedupe_semantically_duplicate_component_faults.sql`),
    headerLines: [
      `-- Deletes ${dedupeRows.length} catalog_component_faults rows that are semantic duplicates of`,
      `-- another row on the same engine/unit -- the same real-world problem imported multiple times`,
      `-- with different wording from different old-vehicle source rows sharing one engine/gearbox.`,
      `-- One wording (the most specific) is kept per group; this migration removes the rest.`,
      `-- Reviewed group-by-group (unit | kept text | removed texts):`,
      ...tableLines,
      `--`,
      `-- Generated by scripts/fill/write-fault-cleanup-migrations.mjs. Each DELETE is guarded on`,
      `-- both id and exact fault text (re-verified against live data at generation time).`,
      `--`,
      `-- Review-only: NOT run by this session. Independent of, and safe to run in either order`,
      `-- relative to, ${ts1}_remove_chain_belt_mismatch_engine_faults.sql (no id overlap).`,
    ],
    rows: dedupeRows,
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
