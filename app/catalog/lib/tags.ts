// Two-tier car tags -- the TypeScript side of catalog_tags / catalog_phase_tags /
// catalog_configuration_tags (supabase/migrations/20261102230000_create_catalog_tags.sql).
// TAG_DEFINITIONS mirrors the seeded catalog_tags rows; change both together.
//
//   Tier 1 (model):          on a catalog phase -- applies to every configuration of that car.
//   Tier 2 (configuration):  on one engine + gearbox + body + drivetrain configuration.
//   'both':                  allowed on either level, depending on the car.
//
// Colour lives here only as a SEMANTIC category; components map it to the design system
// (TagBadge.tsx), so the data layer never carries a CSS class.
//
// Distinct from app/lib/tags.ts (the legacy vehicles-table lifestyle tags read by /prehlad).

// ---- Semantic colour categories, in display priority --------------------------------------
export const COLOR_CATEGORIES = ["daily", "economy", "utility", "performance", "premium"] as const;
export type ColorCategory = (typeof COLOR_CATEGORIES)[number];

export const COLOR_CATEGORY_LABELS: Record<ColorCategory, string> = {
  daily: "Daily use & family",
  economy: "Economy & reliability",
  utility: "Utility & offroad",
  performance: "Dynamics & performance",
  premium: "Premium & status",
};

// ---- Slugs per tier (type-level, so a model-only tag can't be put on a configuration) -----
export type ModelOnlyTagSlug = "stroller_friendly" | "isofix_3x" | "value_retainer" | "cargo_van" | "representative" | "head_turner";
export type ConfigurationOnlyTagSlug =
  | "city_commuter" | "highway_cruiser" | "seven_seater" | "bulletproof_reliability" | "ultra_efficient"
  | "green_zone" | "heavy_tower" | "roadtrip_camper" | "winter_ready" | "true_offroad" | "hot_hatch" | "sleeper";
export type SharedTagSlug = "family_ideal" | "value_choice" | "workhorse" | "drivers_choice" | "sport" | "comfort_cruiser";

export type TagSlug = ModelOnlyTagSlug | ConfigurationOnlyTagSlug | SharedTagSlug;
export type ModelLevelTagSlug = ModelOnlyTagSlug | SharedTagSlug;
export type ConfigurationLevelTagSlug = ConfigurationOnlyTagSlug | SharedTagSlug;
export type TagTier = "model" | "configuration" | "both";

export interface TagDefinition<S extends TagSlug = TagSlug> {
  slug: S;
  label: string;
  tier: TagTier;
  colorCategory: ColorCategory;
  sortOrder: number; // within its colour category
}

const def = <S extends TagSlug>(slug: S, label: string, tier: TagTier, colorCategory: ColorCategory, sortOrder: number): TagDefinition<S> =>
  ({ slug, label, tier, colorCategory, sortOrder });

export const TAG_DEFINITIONS: { readonly [S in TagSlug]: TagDefinition<S> } = {
  family_ideal: def("family_ideal", "Family ideal", "both", "daily", 10),
  city_commuter: def("city_commuter", "City commuter", "configuration", "daily", 20),
  highway_cruiser: def("highway_cruiser", "Highway cruiser", "configuration", "daily", 30),
  seven_seater: def("seven_seater", "7-seater", "configuration", "daily", 40),
  stroller_friendly: def("stroller_friendly", "Stroller friendly", "model", "daily", 50),
  isofix_3x: def("isofix_3x", "3x ISOFIX", "model", "daily", 60),

  bulletproof_reliability: def("bulletproof_reliability", "Bulletproof reliability", "configuration", "economy", 10),
  ultra_efficient: def("ultra_efficient", "Ultra efficient", "configuration", "economy", 20),
  value_choice: def("value_choice", "Value choice", "both", "economy", 30),
  value_retainer: def("value_retainer", "Value retainer", "model", "economy", 40),
  green_zone: def("green_zone", "Green zone (EV/PHEV)", "configuration", "economy", 50),

  workhorse: def("workhorse", "Workhorse", "both", "utility", 10),
  heavy_tower: def("heavy_tower", "Heavy tower", "configuration", "utility", 20),
  roadtrip_camper: def("roadtrip_camper", "Roadtrip/Camper", "configuration", "utility", 30),
  winter_ready: def("winter_ready", "Winter ready (AWD)", "configuration", "utility", 40),
  true_offroad: def("true_offroad", "True offroad", "configuration", "utility", 50),
  cargo_van: def("cargo_van", "Cargo van", "model", "utility", 60),

  hot_hatch: def("hot_hatch", "Hot-hatch", "configuration", "performance", 10),
  drivers_choice: def("drivers_choice", "Driver's choice", "both", "performance", 20),
  sport: def("sport", "Sport", "both", "performance", 30),
  sleeper: def("sleeper", "Sleeper", "configuration", "performance", 40),

  representative: def("representative", "Representative", "model", "premium", 10),
  comfort_cruiser: def("comfort_cruiser", "Comfort cruiser", "both", "premium", 20),
  head_turner: def("head_turner", "Head-turner", "model", "premium", 30),
};

export const ALL_TAG_SLUGS = Object.keys(TAG_DEFINITIONS) as TagSlug[];
export const isTagSlug = (s: string): s is TagSlug => s in TAG_DEFINITIONS;
export const isModelLevel = (s: TagSlug): s is ModelLevelTagSlug => TAG_DEFINITIONS[s].tier !== "configuration";
export const isConfigurationLevel = (s: TagSlug): s is ConfigurationLevelTagSlug => TAG_DEFINITIONS[s].tier !== "model";

// ---- Car shapes the merge works on ----------------------------------------------------------
// Minimal on purpose: anything with tags at the right level fits (the db-test DetailData, the
// /catalog PhaseBundle, a quiz result...). "Model" here is one catalog phase, see the header.
export interface CarModel {
  id: string;
  tags: readonly ModelLevelTagSlug[];
}

export interface CarConfiguration {
  id: string;
  tags: readonly ConfigurationLevelTagSlug[];
}

export interface ResolvedTag extends TagDefinition {
  // Where it came from on THIS configuration: 'both' when model and configuration both carry it.
  source: "model" | "configuration" | "both";
}

const CATEGORY_RANK: Record<ColorCategory, number> = Object.fromEntries(COLOR_CATEGORIES.map((c, i) => [c, i])) as Record<ColorCategory, number>;

// Model + configuration tags -> one deduplicated list, ordered by colour-category priority
// (COLOR_CATEGORIES), then the tag's own sortOrder. Pure; unknown slugs (a DB tag the app
// doesn't know yet) are dropped rather than rendered without a definition.
export function getTagsForConfiguration(model: CarModel, configuration: CarConfiguration): ResolvedTag[] {
  const sources = new Map<TagSlug, ResolvedTag["source"]>();
  for (const s of model.tags) if (isTagSlug(s)) sources.set(s, "model");
  for (const s of configuration.tags) if (isTagSlug(s)) sources.set(s, sources.has(s) ? "both" : "configuration");
  return [...sources.entries()]
    .map(([slug, source]) => ({ ...TAG_DEFINITIONS[slug], source }))
    .sort((a, b) => CATEGORY_RANK[a.colorCategory] - CATEGORY_RANK[b.colorCategory] || a.sortOrder - b.sortOrder);
}

// Same ordering for one level alone (e.g. the model tags in a car page header).
export function resolveTags(slugs: readonly string[], source: ResolvedTag["source"]): ResolvedTag[] {
  return [...new Set(slugs)]
    .filter(isTagSlug)
    .map((slug) => ({ ...TAG_DEFINITIONS[slug], source }))
    .sort((a, b) => CATEGORY_RANK[a.colorCategory] - CATEGORY_RANK[b.colorCategory] || a.sortOrder - b.sortOrder);
}
