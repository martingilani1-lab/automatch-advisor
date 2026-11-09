// Column lists for the "dilemma" fields (Martin, 2026-11-04: DPF/AdBlue, bi-fuel, test cycle,
// towing/weight per configuration, off-road, family) -- the ONE place intake-to-template.mjs,
// validate-template.mjs and generate-seed.mjs read them from, so the three scripts can't drift
// apart on which new column exists or what type it is (the same reason catalog-vocabularies.json
// exists for the frozen vocabularies).
//
// Schema: 20261104200000-202000 + 20261104210000 (has_scr -> has_adblue).
// Off-road hardware (has_low_range / *_diff_lock) is deliberately NOT here: it lives on
// drivetrain_systems, shared reference data that a car import never creates or edits (CLAUDE.md
// rule 2c) -- a new 4x4 system with its flags is its own reviewed migration.

// catalog_engines -- after-treatment. Booleans. For a NEW diesel engine has_dpf and has_adblue
// are REQUIRED (catalog_engines_diesel_flags_check rejects a diesel with either one NULL);
// has_gpf stays optional.
export const ENGINE_FLAG_FIELDS = ["has_dpf", "has_gpf", "has_adblue"];

// catalog_engines -- injection, wet belt, and the electrified powertrain (20261105150000). The
// engine row IS the powertrain variant (motor + battery for an EV), so battery size, charging
// and battery cooling live here; range / energy use stay per configuration (body, wheels).
export const ENGINE_POWERTRAIN_FIELDS = [
  "injection_type",
  "battery_capacity_net_kwh", "max_ac_charging_kw", "max_dc_charging_kw",
  "battery_thermal_management", "heat_pump",
];

// Every non-identity engine column this module adds, in engines.csv column order.
export const ENGINE_EXTRA_FIELDS = [...ENGINE_FLAG_FIELDS, ...ENGINE_POWERTRAIN_FIELDS];

// catalog_phases -- the phase's structure. Frozen vocabulary (catalog_phases.chassis_type).
export const PHASE_EXTRA_FIELDS = ["chassis_type"];

// phases.csv only, NOT a catalog_phases column: the default test cycle for every configuration
// of the phase. A config_facts.csv row can override it per configuration.
export const PHASE_TEMPLATE_ONLY_FIELDS = ["consumption_cycle"];

// phase_body_dimensions -- towing loads, off-road geometry, family space.
export const DIM_EXTRA_FIELDS = [
  "nose_weight_kg", "roof_load_kg",
  "approach_angle_deg", "departure_angle_deg", "breakover_angle_deg", "wading_depth_mm",
  "isofix_count", "isofix_front_passenger", "seats_optional_max",
  "boot_capacity_7_seats_liters", "boot_sill_height_mm",
];

// catalog_vehicle_configurations -- facts that differ by engine x gearbox x drivetrain x body.
// One config_facts.csv row per configuration that has any of them (optional file). driven_axle
// is NOT here: it is derived from the config grid's drivetrain column (FWD -> front, RWD ->
// rear, an AWD system code -> all) and never typed by hand.
export const CONFIG_FACT_FIELDS = [
  "fuel_consumption_l100km", "energy_consumption_kwh100km", "consumption_cycle",
  "secondary_fuel_type", "secondary_consumption_l100km",
  "fuel_consumption_urban_l100km", "fuel_consumption_extra_urban_l100km",
  "towing_braked_kg", "towing_unbraked_kg", "curb_weight_kg",
  "acceleration_0_100", "top_speed_kmh", "co2_emissions_g_km", "ev_range_km",
];

// SQL type of every field above that isn't plain text -- generate-seed.mjs casts every VALUES
// literal (the all-NULL-column type-inference bug), validate-template.mjs checks the format.
export const FIELD_TYPES = {
  has_dpf: "boolean", has_gpf: "boolean", has_adblue: "boolean",
  isofix_front_passenger: "boolean",
  battery_capacity_net_kwh: "numeric", max_ac_charging_kw: "numeric", max_dc_charging_kw: "numeric",
  nose_weight_kg: "integer", roof_load_kg: "integer", wading_depth_mm: "integer",
  isofix_count: "integer", seats_optional_max: "integer",
  boot_capacity_7_seats_liters: "integer", boot_sill_height_mm: "integer",
  approach_angle_deg: "numeric", departure_angle_deg: "numeric", breakover_angle_deg: "numeric",
  fuel_consumption_l100km: "numeric", energy_consumption_kwh100km: "numeric",
  secondary_consumption_l100km: "numeric",
  fuel_consumption_urban_l100km: "numeric", fuel_consumption_extra_urban_l100km: "numeric",
  towing_braked_kg: "integer", towing_unbraked_kg: "integer", curb_weight_kg: "integer",
  acceleration_0_100: "numeric", top_speed_kmh: "integer", co2_emissions_g_km: "integer",
  ev_range_km: "integer",
};

// Which frozen vocabulary (catalog-vocabularies.json key) a text field must match.
export const FIELD_VOCAB = {
  chassis_type: "catalog_phases.chassis_type",
  consumption_cycle: "catalog_vehicle_configurations.consumption_cycle",
  secondary_fuel_type: "catalog_vehicle_configurations.secondary_fuel_type",
  injection_type: "catalog_engines.injection_type",
  battery_thermal_management: "catalog_engines.battery_thermal_management",
  heat_pump: "catalog_engines.heat_pump",
};

// Template drivetrain column -> catalog_vehicle_configurations.driven_axle. "FWD" / "RWD" are
// the two no-AWD-system sentinels; anything else is a drivetrain_systems code = all wheels.
export function drivenAxleOf(drivetrain) {
  if (drivetrain === "FWD") return "front";
  if (drivetrain === "RWD") return "rear";
  return "all";
}

// Format check for one cell: "" is always fine (NULL over invention); otherwise booleans are
// exactly "true"/"false", numbers must parse, vocab fields must be in the list. Returns an error
// message, or null.
export function checkFieldValue(field, value, vocab) {
  if (value === "" || value == null) return null;
  const type = FIELD_TYPES[field];
  if (type === "boolean" && value !== "true" && value !== "false") {
    return `${field} '${value}' must be true or false (or empty = unknown)`;
  }
  if ((type === "integer" && !/^-?\d+$/.test(value)) || (type === "numeric" && !/^-?\d+(\.\d+)?$/.test(value))) {
    return `${field} '${value}' is not a valid ${type}`;
  }
  const vocabKey = FIELD_VOCAB[field];
  if (vocabKey && !(vocab[vocabKey] || []).includes(value)) {
    return `${field} '${value}' is not in the frozen vocabulary (${(vocab[vocabKey] || []).join(", ")})`;
  }
  return null;
}
