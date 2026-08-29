-- Per-car storage for the 8 beyond-baseline safety features (Step 2 of the
-- safety-feature work — the 9 GSR2-mandated features are deliberately NOT
-- stored here or anywhere per-car; they're derived client-side from a car's
-- production years, see isGsr2Era in app/lib/carFields.ts). Migration
-- written for review, NOT run as part of this task.
--
-- STORAGE MODEL: a junction table, presence-only. A row means "this vehicle
-- HAS this feature, at this availability." No row means "not available" —
-- there is no explicit negative value stored anywhere. This is deliberate:
-- it keeps the table small (at most 261 vehicles × 8 features = 2088 rows,
-- realistically far fewer since most cells in the hand-tagging CSV end up
-- blank/N, not S/O), and it means a missing/wrong row can only ever
-- UNDER-claim a feature, never falsely claim one the car doesn't have.
--
-- feature_slug is constrained to exactly the 8 frozen beyond-baseline slugs
-- (not just any row in safety_features) — this is the enforcement mechanism
-- for the locked structure decision that the 9 gsr2_mandated features must
-- never be stored per-car: the FK to safety_features(slug) alone wouldn't
-- stop someone inserting feature_slug='aeb' here by mistake, so the CHECK
-- below closes that gap. Update it (and scripts/apply-safety-tags.ts) together
-- if the frozen 8 ever changes.

create table vehicle_safety_features (
  vehicle_id uuid not null references vehicles(id),
  feature_slug text not null references safety_features(slug) check (feature_slug in (
    'blind_spot_monitoring', 'rear_cross_traffic_alert', 'adaptive_cruise_control',
    'lane_centering', 'camera_360', 'parking_assist',
    'adaptive_matrix_headlights', 'head_up_display'
  )),
  availability text not null check (availability in ('standard', 'optional')),
  primary key (vehicle_id, feature_slug)
);

comment on table vehicle_safety_features is 'Per-car presence for the 8 beyond-baseline safety features. Presence-only: a row means the car HAS the feature (standard or optional); absence means not available. Hand-tagged via scripts/safety-tags-template.csv + scripts/apply-safety-tags.ts. The 9 GSR2-mandated features are never stored here or anywhere per-car — see app/lib/carFields.ts isGsr2Era.';
