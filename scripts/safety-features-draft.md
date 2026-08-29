# Master Safety Feature List — DRAFT for review

Vocabulary freeze exercise, same pattern as `app/lib/tags.ts` (the lifestyle tags):
this list gets edited/cut/renamed here, in this file, BEFORE any DB column, table,
or hand-tagging work starts. No schema or data has been touched to produce this —
it's a naming exercise only.

- **Section 1 (GSR2-mandated)** is fixed by EU regulation — the 9 rows are exactly
  what applies to all 261 GSR2-era cars (see the read-only query that established
  that count/list). Not up for debate on WHICH features are on the list, but the
  "Universal Name" wording itself is still just my draft phrasing — reword freely.
- **Section 2 (Beyond-baseline)** is **entirely my suggestion** — the Universal
  Names, the groupings, and the example marketing names are all draft, not
  authoritative. Cut, rename, merge, split, add — whatever the real vocabulary
  should be, this is a starting point, not a spec.

---

## Section 1 — GSR2-mandated

| Universal Name | Category | Common marketing names (examples) | What it does |
|---|---|---|---|
| Autonomous Emergency Braking | GSR2-mandated | AEB, Pre-Safe Brake, City Safety, Forward Collision Warning w/ Autobrake | Automatically brakes if it detects an imminent collision the driver hasn't reacted to. |
| Intelligent Speed Assistance | GSR2-mandated | ISA, Speed Limit Assist, Speed Limiter | Reads speed-limit signs or map data and warns (or gently resists the accelerator) when you exceed the limit. |
| Emergency Lane-Keeping | GSR2-mandated | Emergency Lane Keeping System, Lane Departure Warning w/ intervention | Actively steers or brakes to pull the car back if it drifts out of its lane without signalling. |
| Driver Drowsiness & Attention Warning | GSR2-mandated | Attention Assist, Driver Alert Control, Fatigue Detection | Monitors driving behaviour and alerts the driver if it detects fatigue or inattention. |
| Emergency Stop Signal | GSR2-mandated | ESS, Adaptive Brake Lights | Flashes the brake lights or hazards rapidly during hard braking to warn traffic behind. |
| Reversing Detection | GSR2-mandated | Rear Parking Sensors, Rear-View Camera | Detects pedestrians or objects behind the car when reversing and warns the driver. |
| Event Data Recorder | GSR2-mandated | EDR, "black box" | Logs vehicle data (speed, braking, etc.) from the seconds around a crash for post-incident analysis. |
| Tyre Pressure Monitoring | GSR2-mandated | TPMS | Alerts the driver when a tyre's pressure drops significantly below the recommended level. |
| Seatbelt Reminders (all seats) | GSR2-mandated | Seatbelt Reminder, Belt-Minder | Audible/visual alert if any occupied seat's belt isn't fastened — not just the driver's. |

---

## Section 2 — Beyond-baseline (SUGGESTED — edit freely)

| Universal Name (draft) | Category | Common marketing names (examples) | What it does |
|---|---|---|---|
| Blind Spot Monitoring | Beyond-baseline | Side Assist, BLIS, Blind Spot Warning | Watches adjacent lanes and warns if a vehicle is in your blind spot when you signal to change lanes. |
| Adaptive Cruise Control | Beyond-baseline | ACC, Distronic, Dynamic Cruise Control | Automatically maintains a set following distance from the car ahead, speeding up and slowing with traffic. |
| Rear Cross-Traffic Alert | Beyond-baseline | RCTA, Cross Traffic Alert | Warns of approaching vehicles from the side when reversing out of a parking space. |
| 360° Camera | Beyond-baseline | Around View Monitor, Surround View | Stitches multiple cameras into a top-down view of the car for tight parking and manoeuvring. |
| Lane Centering | Beyond-baseline | Lane Centering Assist, Active Lane Keep Assist | Continuously steers to keep the car centred in its lane, beyond just correcting drift. |
| Traffic Jam Assist | Beyond-baseline | Traffic Jam Pilot, Congestion Assist | Combines adaptive cruise and lane centring for semi-automated stop-and-go driving in traffic. |
| Adaptive / Matrix Headlights | Beyond-baseline | Matrix LED, IntelliBeam, Adaptive Highbeam Assist | Automatically shapes or dims the headlight beam to avoid dazzling other drivers while maximising visibility. |
| Head-Up Display | Beyond-baseline | HUD | Projects speed, navigation, and alerts onto the windscreen in the driver's line of sight. |
| Parking Assist / Self-Park | Beyond-baseline | Park Assist, Active Park Assist | Automatically steers (sometimes also brakes/accelerates) the car into a parking space. |
| Driver Monitoring Camera | Beyond-baseline | Cabin Camera, Driver Monitoring System | In-cabin eye/head-tracking camera for more precise attention monitoring than the GSR2 baseline system. |
| Night Vision | Beyond-baseline | Night Vision Assist, Thermal Imaging | Uses infrared/thermal cameras to spot pedestrians or animals beyond headlight range in the dark. |
| Front Cross-Traffic Alert | Beyond-baseline | Front Cross Traffic Warning | Warns of crossing traffic when pulling out of a driveway or blind junction. |
| Exit Warning | Beyond-baseline | Door Opening Warning, Safe Exit Assist | Warns occupants of approaching cyclists or traffic before they open a door. |
| Trailer Assist | Beyond-baseline | Trailer Backup Assist, Trailer Manoeuvre Assist | Helps steer a trailer while reversing, or auto-adjusts stability control for towing. |
| Highway / Motorway Assist | Beyond-baseline | Highway Driving Assist, Super Cruise | Sustained, more advanced semi-autonomous driving on motorways — combines lane centring, ACC, and lane-change assist. |

---

## Next step (not yet started)

Once this vocabulary is frozen (edited/approved here), the follow-on work — same
shape as the lifestyle-tags rollout — would be: a migration adding the column(s),
a hand-tagging template/CSV, and an apply script. None of that exists yet; this
file is the naming step only.
