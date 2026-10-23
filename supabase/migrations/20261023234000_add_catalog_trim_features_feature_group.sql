-- Adds catalog_trim_features.feature_group: which "slot" a trim feature fills (wheels, seats,
-- climate, windows, infotainment, ...), so the Trims tab can show that a higher trim REPLACES a
-- lower trim's version of the same thing (Manual windows -> Front power windows, Manual AC ->
-- Climatronic, Sport seats -> Velour upholstery) instead of listing both -- the old version greyed
-- out as "inherited" next to the new one, which is what Martin flagged on 2026-10-23.
--
-- NULL = standalone feature with no replacement relationship (ABS, ESP, Front Assist, chrome
-- styling, panoramic roof, ...): it is simply added at some tier and inherited above it.
-- Frozen-vocabulary CHECK, same closed-list pattern as transmission_units.family etc. -- a genuinely
-- new group is a real migration, never free text. Mirrored in scripts/catalog-vocabularies.json
-- (updated in the same commit, per CLAUDE.md).
--
-- Groups chosen from a full read of all 406 distinct live feature names (1,240 rows), 2026-10-23.
-- Deliberate splits: seat type (seats) vs heating/ventilation/massage (seat_comfort) vs electric
-- adjustment (seat_adjustment); headlights vs fog_lights; infotainment (the radio/screen) vs
-- smartphone (App-Connect/SmartLink) vs sound (Canton etc.) -- each of those pairs is added
-- independently on real trims, so one must never hide the other.
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab,
-- BEFORE 20261023234500 (which fills the column).

BEGIN;

ALTER TABLE catalog_trim_features ADD COLUMN feature_group text;

ALTER TABLE catalog_trim_features ADD CONSTRAINT catalog_trim_features_feature_group_check
  CHECK (feature_group IN ('airbags', 'ambient_lighting', 'armrests', 'bumpers', 'climate', 'cruise', 'fog_lights', 'headlights', 'infotainment', 'instruments', 'interior_trim', 'light_rain_sensors', 'locking', 'mirrors', 'parking', 'rear_spoiler', 'roof_rails', 'seat_adjustment', 'seat_comfort', 'seats', 'sliding_doors', 'smartphone', 'sound', 'steering_wheel', 'suspension', 'wheels', 'windows'));

COMMIT;
