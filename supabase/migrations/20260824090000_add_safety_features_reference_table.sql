-- Reference table for the safety-feature vocabulary — same freeze-before-build
-- pattern as transmission_units (20260724120000) and vehicles.tags
-- (20260802120000): the naming/content work (scripts/safety-features-draft.md,
-- scripts/safety-features-content.md) happens BEFORE this runs, and this file
-- itself is written for review, NOT executed as part of this task.
--
-- STRUCTURE DECISION (locked): the 9 GSR2-mandated features are DERIVED from
-- a car's GSR2-era status (production still active past 2022 — see the
-- read-only query that found 261/334 cars qualify) — they are NOT stored
-- per-car anywhere. Only the 8 beyond-baseline features will eventually get
-- per-car storage, and that's a separate future migration (not this one).
-- This table holds only the write-once EXPLANATION content for all 17
-- features (9 mandated + 8 beyond-baseline) — what each feature is, not
-- which cars have it.
--
-- ALL CONTENT IN THE SEED BELOW IS DRAFT, UNREVIEWED TEXT — see the header of
-- scripts/safety-features-content.md. Nothing here has been corrected yet.
-- Review that doc, edit it, then this migration's seed values before running.
--
-- FROZEN VOCABULARY — 17 slugs. Do not add/rename/remove without updating
-- both this file and scripts/safety-features-content.md together. 7 slugs
-- were explicitly CUT from an earlier 15-item beyond-baseline draft and must
-- NOT be re-added without an explicit unfreeze: traffic_jam_assist,
-- driver_monitoring_camera, night_vision, front_cross_traffic_alert,
-- exit_warning, trailer_assist, highway_motorway_assist.
--   GSR2-mandated (9): aeb, isa, emergency_lane_keeping,
--     driver_drowsiness_attention_warning, emergency_stop_signal,
--     reversing_detection, event_data_recorder, tyre_pressure_monitoring,
--     seatbelt_reminders
--   Beyond-baseline (8): blind_spot_monitoring, adaptive_cruise_control,
--     rear_cross_traffic_alert, camera_360, lane_centering,
--     adaptive_matrix_headlights, head_up_display, parking_assist

create table safety_features (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  universal_name text not null,
  category text not null check (category in ('gsr2_mandated', 'beyond_baseline')),
  marketing_names text[],
  what_it_does text,
  how_it_works text,
  sensors_used text,
  how_to_disable text,
  gsr2 boolean not null default false,
  -- gsr2 and category are two views of the same fact (category is the
  -- display string, gsr2 is the quick boolean filter) — this constraint
  -- keeps them from ever silently disagreeing.
  check ((category = 'gsr2_mandated') = gsr2)
);

comment on table safety_features is 'Explanation content for the safety-feature vocabulary (what each feature is), split into GSR2-mandated (derived from a car''s GSR2-era status, not stored per-car) and beyond-baseline (future per-car tagging, not yet built). See scripts/safety-features-content.md for the reviewable draft this seed comes from.';

insert into safety_features
  (slug, universal_name, category, marketing_names, what_it_does, how_it_works, sensors_used, how_to_disable, gsr2)
values

-- ══════════════════════════ GSR2-mandated (9) ══════════════════════════

('aeb', 'Autonomous Emergency Braking', 'gsr2_mandated',
 array['AEB','Pre-Safe Brake','City Safety','Forward Collision Warning w/ Autobrake'],
 'Automatically brakes if it detects an imminent collision the driver hasn''t reacted to.',
 $$Forward-facing radar and/or camera continuously track the distance and closing speed to the vehicle or object ahead. If the system calculates a collision is imminent and the driver hasn't braked (or hasn't braked hard enough), it first warns the driver, then applies the brakes automatically — partially or to a full stop.$$,
 'Forward radar + forward camera (fused); some systems add LiDAR or ultrasonic sensors for close-range detection.',
 $$Usually cannot be fully disabled — GSR2 requires it active by default at every engine start. Some cars let the driver reduce sensitivity or delay the warning via a settings menu, but the system re-enables automatically next start-up.$$,
 true),

('isa', 'Intelligent Speed Assistance', 'gsr2_mandated',
 array['ISA','Speed Limit Assist','Speed Limiter'],
 'Reads speed-limit signs/map data and warns or gently limits engine power when you exceed the limit.',
 $$A forward camera reads speed-limit signs (often cross-checked against GPS map data) and compares the car's current speed to the detected limit. If the driver exceeds it, the system gives an audible/visual warning and may briefly resist accelerator input; it does not brake the car.$$,
 'Forward-facing camera (sign recognition) + GPS/navigation map data.',
 $$The driver can mute the audible warning or switch to a passive display-only mode each drive, but under GSR2 the system defaults back to active every start-up — it cannot be permanently turned off.$$,
 true),

('emergency_lane_keeping', 'Emergency Lane-Keeping', 'gsr2_mandated',
 array['Emergency Lane Keeping System','Lane Departure Warning w/ intervention'],
 'Actively steers/brakes to pull the car back if it drifts out of its lane without signaling.',
 $$A forward camera tracks the lane markings on either side of the car. If the car drifts toward or crosses a marking without the indicator being used, and the system judges the drift unintentional, it applies a corrective steering torque (and sometimes light one-side braking) to bring the car back inside the lane.$$,
 'Forward-facing camera (lane-marking detection); some systems add a steering-wheel torque sensor to detect hands-on/hands-off.',
 $$Can typically be switched off for the current drive via a steering-wheel button or menu toggle, but resets to active every engine start, per GSR2.$$,
 true),

('driver_drowsiness_attention_warning', 'Driver Drowsiness & Attention Warning', 'gsr2_mandated',
 array['Attention Assist','Driver Alert Control','Fatigue Detection'],
 'Monitors driving patterns/eye behavior and alerts the driver if it detects fatigue or inattention.',
 $$The system analyses inputs like steering corrections, lane position, and trip duration to build a model of "normal" driving, then flags anomalies consistent with fatigue or distraction. Some newer systems add a driver-facing camera to track eye closure and head position directly. When drowsiness is suspected, it gives an audible/visual alert suggesting a break.$$,
 'Steering-angle sensor + lane-position camera (behavioural model); increasingly paired with an in-cabin driver-facing camera on newer models.',
 $$Alert sensitivity can sometimes be adjusted in the settings menu, but the system itself cannot be permanently disabled — active by default every start-up under GSR2.$$,
 true),

('emergency_stop_signal', 'Emergency Stop Signal', 'gsr2_mandated',
 array['ESS','Adaptive Brake Lights'],
 'Flashes brake lights/hazards rapidly during hard braking to warn traffic behind.',
 $$When the car detects very hard, sudden braking (or ABS activation), it flashes the brake lights rapidly or switches on the hazard lights automatically, without driver input, to catch the attention of vehicles behind before they close the distance.$$,
 'Brake-pressure/deceleration sensor + ABS system signal (no camera or radar needed).',
 'Not a driver-facing toggle in virtually any implementation — a low-level safety behaviour tied directly to the braking system, always active.',
 true),

('reversing_detection', 'Reversing Detection', 'gsr2_mandated',
 array['Rear Parking Sensors','Rear-View Camera'],
 'Detects pedestrians/objects behind the car when reversing and warns the driver.',
 $$Ultrasonic sensors in the rear bumper (and/or a rear-view camera) detect people or objects behind the car while reversing and sound an increasingly urgent warning tone as the car gets closer; camera-equipped systems also display the area live on the infotainment screen.$$,
 'Rear ultrasonic parking sensors and/or a rear-view camera.',
 $$The audible warning can usually be muted for the current drive via a dashboard button, but detection restarts by default on the next engine start.$$,
 true),

('event_data_recorder', 'Event Data Recorder', 'gsr2_mandated',
 array['EDR','"black box"'],
 'Logs vehicle data (speed, braking, etc.) in the seconds around a crash for post-incident analysis.',
 $$A dedicated module continuously buffers a rolling few seconds of vehicle data — speed, braking, steering angle, belt status, airbag deployment — and permanently locks that buffer in place when it detects a crash-like event, for later retrieval by investigators.$$,
 'Reads from the car''s existing sensor/CAN bus network (speed, brake, steering, airbag sensors) — no dedicated external sensor of its own.',
 'Not user-disableable — a passive recorder with no driver-facing control, required to be present and functioning under GSR2.',
 true),

('tyre_pressure_monitoring', 'Tyre Pressure Monitoring', 'gsr2_mandated',
 array['TPMS'],
 'Alerts the driver when a tyre''s pressure drops significantly below the recommended level.',
 $$Pressure sensors mounted inside each wheel (or an indirect system using the ABS wheel-speed sensors to infer pressure from rolling-radius differences) continuously report tyre pressure; if any tyre drops meaningfully below the recommended level, a warning light appears on the dashboard.$$,
 'Direct: a pressure sensor inside each wheel. Indirect: ABS wheel-speed sensors (no dedicated pressure sensor).',
 'Cannot be disabled — a passive dashboard warning system with no off switch.',
 true),

('seatbelt_reminders', 'Seatbelt Reminders (all seats)', 'gsr2_mandated',
 array['Seatbelt Reminder','Belt-Minder'],
 'Audible/visual alert if any occupied seat''s belt isn''t fastened, not just the driver''s.',
 $$Buckle switches in every seating position report belt status to the car's electronics; combined with a seat-occupancy sensor (weight-based or camera-based) in each seat, the system sounds a chime and shows a warning icon if an occupied seat's belt isn't fastened, escalating the longer it stays unbuckled.$$,
 'Seatbelt buckle switches + seat-occupancy sensors (weight or camera-based) in every seating position.',
 'Cannot be disabled — required to be present and active at all times under GSR2.',
 true),

-- ══════════════════════════ Beyond-baseline (8) ══════════════════════════

('blind_spot_monitoring', 'Blind Spot Monitoring', 'beyond_baseline',
 array['Side Assist','BLIS','Blind Spot Warning'],
 'Watches adjacent lanes and warns if a vehicle is in your blind spot when you signal to change lanes.',
 $$Short-range radar units in the rear bumper corners continuously scan the lanes on either side and slightly behind the car. If a vehicle is detected in the blind spot, a warning icon lights up in the corresponding side mirror; if the driver signals a lane change into an occupied blind spot, the warning becomes more prominent (flashing icon and/or audible chime).$$,
 'Rear-corner short/medium-range radar (one per side).',
 'Usually toggled off via the infotainment settings menu; on most cars the setting persists across engine starts (not GSR2-regulated).',
 false),

('adaptive_cruise_control', 'Adaptive Cruise Control', 'beyond_baseline',
 array['ACC','Distronic','Dynamic Cruise Control'],
 'Automatically maintains a set distance from the car ahead, speeding up and slowing down with traffic.',
 $$Forward radar and/or camera measure the distance and closing speed to the car ahead. The driver sets a target speed and following gap; the system automatically brakes and accelerates within that gap to match the flow of traffic, falling back to the set cruising speed once the road ahead is clear.$$,
 'Forward radar (primary), often fused with a forward camera for lane/vehicle classification.',
 $$Simply not activated by the driver (it's opt-in per drive via a steering-wheel button), or can be switched off entirely in settings on some models.$$,
 false),

('rear_cross_traffic_alert', 'Rear Cross-Traffic Alert', 'beyond_baseline',
 array['RCTA','Cross Traffic Alert'],
 'Warns of approaching vehicles from the side when reversing out of a parking space.',
 $$The same rear-corner radar sensors used for Blind Spot Monitoring widen their field of view when the car is in reverse, detecting vehicles approaching from the side (e.g. in a car park) before they're visible to the driver, and sound a warning.$$,
 'Rear-corner radar (shared hardware with Blind Spot Monitoring, different software mode when reversing).',
 'Toggled via the infotainment settings menu; setting typically persists across drives.',
 false),

('camera_360', '360° Camera', 'beyond_baseline',
 array['Around View Monitor','Surround View'],
 'Stitches multiple cameras into a top-down view of the car for tight parking/maneuvering.',
 $$Four or more wide-angle cameras (front, rear, both door mirrors) each capture a fisheye view of the surrounding area; software stitches and warps these into a single simulated bird's-eye view of the car, displayed on the infotainment screen to help judge distances when parking or manoeuvring in tight spaces. Distinct from the mandated Reversing Detection: that's rear-only ultrasonic/camera obstacle warning, this is a full 360° stitched visual reference from more cameras.$$,
 'Four or more wide-angle cameras (front grille, rear bumper, both wing mirrors), stitched by an image-processing ECU.',
 $$Not something you disable — it only activates at low speed or when reverse/a parking mode is selected, switching off automatically once driving normally.$$,
 false),

('lane_centering', 'Lane Centering', 'beyond_baseline',
 array['Lane Centering Assist','Active Lane Keep Assist'],
 'Continuously steers to keep the car centered in its lane, beyond just correcting drift.',
 $$Unlike the mandated Emergency Lane-Keeping (which only intervenes when the car is about to leave its lane), Lane Centering uses the same forward camera to continuously and gently steer the car to stay near the middle of the lane throughout the drive, as an ongoing assist rather than a last-moment correction.$$,
 'Forward-facing camera (lane-marking detection) — the same core sensor as Emergency Lane-Keeping, used continuously rather than as a threshold trigger.',
 $$Toggled on/off per drive via a steering-wheel button or menu — a comfort feature, not GSR2-mandated, so it does not have to re-enable itself at start-up (though some manufacturers default it on anyway).$$,
 false),

('adaptive_matrix_headlights', 'Adaptive / Matrix Headlights', 'beyond_baseline',
 array['Matrix LED','IntelliBeam','Adaptive Highbeam Assist'],
 'Automatically shapes or dims the headlight beam to avoid dazzling other drivers while maximizing visibility.',
 $$A forward-facing camera detects the headlights/taillights of oncoming and preceding traffic. The headlight unit (using individually-controllable LED segments in Matrix systems, or a mechanically swivelling/masked beam in simpler adaptive systems) keeps main beam on everywhere except a "shadow" cut out around other vehicles, so the driver gets maximum high-beam illumination without dazzling anyone.$$,
 'Forward-facing camera (glare/vehicle detection) + a segmented LED or motorised headlight unit.',
 'Can be switched back to standard automatic or manual headlight mode via the light-control stalk or menu.',
 false),

('head_up_display', 'Head-Up Display', 'beyond_baseline',
 array['HUD'],
 'Projects speed, navigation, and alerts onto the windshield in the driver''s line of sight.',
 $$A projector unit in the dashboard projects an image onto a small combiner screen (or directly onto the windscreen) positioned in the driver's normal line of sight, showing information like speed, navigation directions, and active-safety alerts so the driver doesn't need to look down at the instrument cluster.$$,
 'No external sensor of its own — displays data already gathered by the car''s other systems (speed, navigation, ADAS alerts) via a projector unit.',
 'Turned on/off, and its height/brightness adjusted, via the infotainment or instrument-cluster settings menu.',
 false),

('parking_assist', 'Parking Assist / Self-Park', 'beyond_baseline',
 array['Park Assist','Active Park Assist'],
 'Automatically steers (sometimes also brakes/accelerates) the car into a parking space.',
 $$Ultrasonic sensors (and often the 360° camera system) scan alongside the car as it drives slowly past parking spaces to detect one big enough to fit. Once a suitable space is found and the driver engages the system, it takes over steering (the driver usually still controls the pedals, though some systems are fully automatic) to reverse or pull into the space.$$,
 'Ultrasonic parking sensors (front + rear + sides) plus, on more capable systems, the 360° camera array.',
 'Activated only when the driver presses the parking-assist button; otherwise inactive by default.',
 false);
