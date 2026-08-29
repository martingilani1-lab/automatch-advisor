# Safety features — DRAFT content for review

Everything below is **draft, unreviewed text** — every `how_it_works`, `sensors_used`,
and `how_to_disable` field is mine to draft and yours to correct, same as
`safety-features-draft.md` before it. Nothing here has been fact-checked against a
specific manufacturer's actual implementation; treat it as a plausible-sounding first
pass, not verified engineering fact.

**Scope correction**: an earlier version of this doc said the frozen list was all 15
beyond-baseline features — that was wrong. The actual freeze is **exactly 8**:
blind_spot_monitoring, rear_cross_traffic_alert, adaptive_cruise_control,
lane_centering, camera_360, parking_assist, adaptive_matrix_headlights,
head_up_display. **17 features total** (9 GSR2-mandated + 8 beyond-baseline).

The other 7 (traffic_jam_assist, driver_monitoring_camera, night_vision,
front_cross_traffic_alert, exit_warning, trailer_assist, highway_motorway_assist)
were explicitly cut and are removed from this doc and the migration seed — they
must not become per-car tagging columns later without an explicit unfreeze.

Migration file (schema + this exact seed content, NOT run):
`supabase/migrations/20260824090000_add_safety_features_reference_table.sql`

Two clarifications preserved, as asked:
- **Lane Centering** (beyond-baseline, continuous gentle steering) vs. the mandated
  **Emergency Lane-Keeping** (only intervenes at the moment of a lane-departure) —
  same core camera, different behaviour.
- **360° Camera** (beyond-baseline, 4+ cameras stitched into a full bird's-eye view)
  vs. the mandated **Reversing Detection** (rear-only ultrasonic/camera obstacle
  warning) — different scope and different hardware.

---

## Section 1 — GSR2-mandated (9)

### Autonomous Emergency Braking — `aeb`
- **Marketing names**: AEB, Pre-Safe Brake, City Safety, Forward Collision Warning w/ Autobrake
- **What it does**: Automatically brakes if it detects an imminent collision the driver hasn't reacted to.
- **How it works** (DRAFT — review): Forward-facing radar and/or camera continuously track the distance and closing speed to the vehicle or object ahead. If the system calculates a collision is imminent and the driver hasn't braked (or hasn't braked hard enough), it first warns the driver, then applies the brakes automatically — partially or to a full stop.
- **Sensors used** (DRAFT — review): Forward radar + forward camera (fused); some systems add LiDAR or ultrasonic sensors for close-range detection.
- **How to disable** (DRAFT — review): Usually cannot be fully disabled — GSR2 requires it active by default at every engine start. Some cars let the driver reduce sensitivity or delay the warning via a settings menu, but the system re-enables automatically next start-up.

### Intelligent Speed Assistance — `isa`
- **Marketing names**: ISA, Speed Limit Assist, Speed Limiter
- **What it does**: Reads speed-limit signs/map data and warns or gently limits engine power when you exceed the limit.
- **How it works** (DRAFT — review): A forward camera reads speed-limit signs (often cross-checked against GPS map data) and compares the car's current speed to the detected limit. If the driver exceeds it, the system gives an audible/visual warning and may briefly resist accelerator input; it does not brake the car.
- **Sensors used** (DRAFT — review): Forward-facing camera (sign recognition) + GPS/navigation map data.
- **How to disable** (DRAFT — review): The driver can mute the audible warning or switch to a passive display-only mode each drive, but under GSR2 the system defaults back to active every start-up — it cannot be permanently turned off.

### Emergency Lane-Keeping — `emergency_lane_keeping`
- **Marketing names**: Emergency Lane Keeping System, Lane Departure Warning w/ intervention
- **What it does**: Actively steers/brakes to pull the car back if it drifts out of its lane without signaling.
- **How it works** (DRAFT — review): A forward camera tracks the lane markings on either side of the car. If the car drifts toward or crosses a marking without the indicator being used, and the system judges the drift unintentional, it applies a corrective steering torque (and sometimes light one-side braking) to bring the car back inside the lane.
- **Sensors used** (DRAFT — review): Forward-facing camera (lane-marking detection); some systems add a steering-wheel torque sensor to detect hands-on/hands-off.
- **How to disable** (DRAFT — review): Can typically be switched off for the current drive via a steering-wheel button or menu toggle, but resets to active every engine start, per GSR2.

### Driver Drowsiness & Attention Warning — `driver_drowsiness_attention_warning`
- **Marketing names**: Attention Assist, Driver Alert Control, Fatigue Detection
- **What it does**: Monitors driving patterns/eye behavior and alerts the driver if it detects fatigue or inattention.
- **How it works** (DRAFT — review): The system analyses inputs like steering corrections, lane position, and trip duration to build a model of "normal" driving, then flags anomalies consistent with fatigue or distraction. Some newer systems add a driver-facing camera to track eye closure and head position directly. When drowsiness is suspected, it gives an audible/visual alert suggesting a break.
- **Sensors used** (DRAFT — review): Steering-angle sensor + lane-position camera (behavioural model); increasingly paired with an in-cabin driver-facing camera on newer models.
- **How to disable** (DRAFT — review): Alert sensitivity can sometimes be adjusted in the settings menu, but the system itself cannot be permanently disabled — active by default every start-up under GSR2.

### Emergency Stop Signal — `emergency_stop_signal`
- **Marketing names**: ESS, Adaptive Brake Lights
- **What it does**: Flashes brake lights/hazards rapidly during hard braking to warn traffic behind.
- **How it works** (DRAFT — review): When the car detects very hard, sudden braking (or ABS activation), it flashes the brake lights rapidly or switches on the hazard lights automatically, without driver input, to catch the attention of vehicles behind before they close the distance.
- **Sensors used** (DRAFT — review): Brake-pressure/deceleration sensor + ABS system signal (no camera or radar needed).
- **How to disable** (DRAFT — review): Not a driver-facing toggle in virtually any implementation — a low-level safety behaviour tied directly to the braking system, always active.

### Reversing Detection — `reversing_detection`
- **Marketing names**: Rear Parking Sensors, Rear-View Camera
- **What it does**: Detects pedestrians/objects behind the car when reversing and warns the driver.
- **How it works** (DRAFT — review): Ultrasonic sensors in the rear bumper (and/or a rear-view camera) detect people or objects behind the car while reversing and sound an increasingly urgent warning tone as the car gets closer; camera-equipped systems also display the area live on the infotainment screen.
- **Sensors used** (DRAFT — review): Rear ultrasonic parking sensors and/or a rear-view camera.
- **How to disable** (DRAFT — review): The audible warning can usually be muted for the current drive via a dashboard button, but detection restarts by default on the next engine start.

### Event Data Recorder — `event_data_recorder`
- **Marketing names**: EDR, "black box"
- **What it does**: Logs vehicle data (speed, braking, etc.) in the seconds around a crash for post-incident analysis.
- **How it works** (DRAFT — review): A dedicated module continuously buffers a rolling few seconds of vehicle data — speed, braking, steering angle, belt status, airbag deployment — and permanently locks that buffer in place when it detects a crash-like event, for later retrieval by investigators.
- **Sensors used** (DRAFT — review): Reads from the car's existing sensor/CAN bus network (speed, brake, steering, airbag sensors) — no dedicated external sensor of its own.
- **How to disable** (DRAFT — review): Not user-disableable — a passive recorder with no driver-facing control, required to be present and functioning under GSR2.

### Tyre Pressure Monitoring — `tyre_pressure_monitoring`
- **Marketing names**: TPMS
- **What it does**: Alerts the driver when a tyre's pressure drops significantly below the recommended level.
- **How it works** (DRAFT — review): Pressure sensors mounted inside each wheel (or an indirect system using the ABS wheel-speed sensors to infer pressure from rolling-radius differences) continuously report tyre pressure; if any tyre drops meaningfully below the recommended level, a warning light appears on the dashboard.
- **Sensors used** (DRAFT — review): Direct: a pressure sensor inside each wheel. Indirect: ABS wheel-speed sensors (no dedicated pressure sensor).
- **How to disable** (DRAFT — review): Cannot be disabled — a passive dashboard warning system with no off switch.

### Seatbelt Reminders (all seats) — `seatbelt_reminders`
- **Marketing names**: Seatbelt Reminder, Belt-Minder
- **What it does**: Audible/visual alert if any occupied seat's belt isn't fastened, not just the driver's.
- **How it works** (DRAFT — review): Buckle switches in every seating position report belt status to the car's electronics; combined with a seat-occupancy sensor (weight-based or camera-based) in each seat, the system sounds a chime and shows a warning icon if an occupied seat's belt isn't fastened, escalating the longer it stays unbuckled.
- **Sensors used** (DRAFT — review): Seatbelt buckle switches + seat-occupancy sensors (weight or camera-based) in every seating position.
- **How to disable** (DRAFT — review): Cannot be disabled — required to be present and active at all times under GSR2.

---

## Section 2 — Beyond-baseline (8)

### Blind Spot Monitoring — `blind_spot_monitoring`
- **Marketing names**: Side Assist, BLIS, Blind Spot Warning
- **What it does**: Watches adjacent lanes and warns if a vehicle is in your blind spot when you signal to change lanes.
- **How it works** (DRAFT — review): Short-range radar units in the rear bumper corners continuously scan the lanes on either side and slightly behind the car. If a vehicle is detected in the blind spot, a warning icon lights up in the corresponding side mirror; if the driver signals a lane change into an occupied blind spot, the warning becomes more prominent (flashing icon and/or audible chime).
- **Sensors used** (DRAFT — review): Rear-corner short/medium-range radar (one per side).
- **How to disable** (DRAFT — review): Usually toggled off via the infotainment settings menu; on most cars the setting persists across engine starts (not GSR2-regulated).

### Adaptive Cruise Control — `adaptive_cruise_control`
- **Marketing names**: ACC, Distronic, Dynamic Cruise Control
- **What it does**: Automatically maintains a set distance from the car ahead, speeding up and slowing down with traffic.
- **How it works** (DRAFT — review): Forward radar and/or camera measure the distance and closing speed to the car ahead. The driver sets a target speed and following gap; the system automatically brakes and accelerates within that gap to match the flow of traffic, falling back to the set cruising speed once the road ahead is clear.
- **Sensors used** (DRAFT — review): Forward radar (primary), often fused with a forward camera for lane/vehicle classification.
- **How to disable** (DRAFT — review): Simply not activated by the driver (it's opt-in per drive via a steering-wheel button), or can be switched off entirely in settings on some models.

### Rear Cross-Traffic Alert — `rear_cross_traffic_alert`
- **Marketing names**: RCTA, Cross Traffic Alert
- **What it does**: Warns of approaching vehicles from the side when reversing out of a parking space.
- **How it works** (DRAFT — review): The same rear-corner radar sensors used for Blind Spot Monitoring widen their field of view when the car is in reverse, detecting vehicles approaching from the side (e.g. in a car park) before they're visible to the driver, and sound a warning.
- **Sensors used** (DRAFT — review): Rear-corner radar (shared hardware with Blind Spot Monitoring, different software mode when reversing).
- **How to disable** (DRAFT — review): Toggled via the infotainment settings menu; setting typically persists across drives.

### 360° Camera — `camera_360`
- **Marketing names**: Around View Monitor, Surround View
- **What it does**: Stitches multiple cameras into a top-down view of the car for tight parking/maneuvering.
- **How it works** (DRAFT — review): Four or more wide-angle cameras (front, rear, both door mirrors) each capture a fisheye view of the surrounding area; software stitches and warps these into a single simulated bird's-eye view of the car, displayed on the infotainment screen to help judge distances when parking or manoeuvring in tight spaces. Distinct from the mandated Reversing Detection: that's rear-only ultrasonic/camera obstacle warning, this is a full 360° stitched visual reference from more cameras.
- **Sensors used** (DRAFT — review): Four or more wide-angle cameras (front grille, rear bumper, both wing mirrors), stitched by an image-processing ECU.
- **How to disable** (DRAFT — review): Not something you disable — it only activates at low speed or when reverse/a parking mode is selected, switching off automatically once driving normally.

### Lane Centering — `lane_centering`
- **Marketing names**: Lane Centering Assist, Active Lane Keep Assist
- **What it does**: Continuously steers to keep the car centered in its lane, beyond just correcting drift.
- **How it works** (DRAFT — review): Unlike the mandated Emergency Lane-Keeping (which only intervenes when the car is about to leave its lane), Lane Centering uses the same forward camera to continuously and gently steer the car to stay near the middle of the lane throughout the drive, as an ongoing assist rather than a last-moment correction.
- **Sensors used** (DRAFT — review): Forward-facing camera (lane-marking detection) — the same core sensor as Emergency Lane-Keeping, used continuously rather than as a threshold trigger.
- **How to disable** (DRAFT — review): Toggled on/off per drive via a steering-wheel button or menu — a comfort feature, not GSR2-mandated, so it does not have to re-enable itself at start-up (though some manufacturers default it on anyway).

### Adaptive / Matrix Headlights — `adaptive_matrix_headlights`
- **Marketing names**: Matrix LED, IntelliBeam, Adaptive Highbeam Assist
- **What it does**: Automatically shapes or dims the headlight beam to avoid dazzling other drivers while maximizing visibility.
- **How it works** (DRAFT — review): A forward-facing camera detects the headlights/taillights of oncoming and preceding traffic. The headlight unit (using individually-controllable LED segments in Matrix systems, or a mechanically swivelling/masked beam in simpler adaptive systems) keeps main beam on everywhere except a "shadow" cut out around other vehicles, so the driver gets maximum high-beam illumination without dazzling anyone.
- **Sensors used** (DRAFT — review): Forward-facing camera (glare/vehicle detection) + a segmented LED or motorised headlight unit.
- **How to disable** (DRAFT — review): Can be switched back to standard automatic or manual headlight mode via the light-control stalk or menu.

### Head-Up Display — `head_up_display`
- **Marketing names**: HUD
- **What it does**: Projects speed, navigation, and alerts onto the windshield in the driver's line of sight.
- **How it works** (DRAFT — review): A projector unit in the dashboard projects an image onto a small combiner screen (or directly onto the windscreen) positioned in the driver's normal line of sight, showing information like speed, navigation directions, and active-safety alerts so the driver doesn't need to look down at the instrument cluster.
- **Sensors used** (DRAFT — review): No external sensor of its own — displays data already gathered by the car's other systems (speed, navigation, ADAS alerts) via a projector unit.
- **How to disable** (DRAFT — review): Turned on/off, and its height/brightness adjusted, via the infotainment or instrument-cluster settings menu.

### Parking Assist / Self-Park — `parking_assist`
- **Marketing names**: Park Assist, Active Park Assist
- **What it does**: Automatically steers (sometimes also brakes/accelerates) the car into a parking space.
- **How it works** (DRAFT — review): Ultrasonic sensors (and often the 360° camera system) scan alongside the car as it drives slowly past parking spaces to detect one big enough to fit. Once a suitable space is found and the driver engages the system, it takes over steering (the driver usually still controls the pedals, though some systems are fully automatic) to reverse or pull into the space.
- **Sensors used** (DRAFT — review): Ultrasonic parking sensors (front + rear + sides) plus, on more capable systems, the 360° camera array.
- **How to disable** (DRAFT — review): Activated only when the driver presses the parking-assist button; otherwise inactive by default.

---

## Next step (not yet started)

Once this content is reviewed/corrected here, the follow-on work is per-car tagging
for the 8 beyond-baseline features only (the 9 mandated ones stay derived from
GSR2-era status, never stored per-car) — same shape as the lifestyle-tags rollout:
a migration adding the per-car link, a hand-tagging template, and an apply script.
None of that exists yet.
