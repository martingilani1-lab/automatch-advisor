// FROZEN VOCABULARY — exactly these 8 slugs. Hand-curation (the CSV template
// filled by hand, one column per slug) depends on this list never changing
// shape without a deliberate re-tagging pass. Do not add/rename/remove a
// slug here without updating the matching check constraint in
// supabase/migrations/20260802120000_add_vehicles_tags.sql.
//
// Distinct from BODY_TILE_MAP/primary_body (app/api/cars/route.ts) — those
// are derived from body_type and answer "what shape is this car"; tags are
// hand-assigned and answer "who is this car for". A car may carry 0..8 tags.
//
// Nothing reads `tags` yet (Track A Step 1 is additive-only — see CLAUDE.md).

export interface LifestyleTag {
  slug: string;
  emoji: string;
  label: string;
}

export const LIFESTYLE_TAGS: LifestyleTag[] = [
  { slug: "family", emoji: "👨‍👩‍👧‍👦", label: "Family Space" },
  { slug: "city", emoji: "🏙️", label: "City & Commuting" },
  { slug: "travel", emoji: "🛣️", label: "Travel & Roadtrips" },
  { slug: "luxury", emoji: "💼", label: "Luxury & Prestige" },
  { slug: "work", emoji: "🛠️", label: "Work & Construction" },
  { slug: "budget", emoji: "💸", label: "Budget & Low Maintenance" },
  { slug: "offroad", emoji: "⛰️", label: "Off-road & Cabin" },
  { slug: "driving_fun", emoji: "🏎️", label: "Driving Fun" },
];

export const LIFESTYLE_TAG_SLUGS = LIFESTYLE_TAGS.map((t) => t.slug);
