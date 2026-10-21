// Pure formatting/grouping/comparison helpers for catalog_trims -- shared by /catalog's
// TrimCards.tsx (Garage Tailwind tokens) and /db-test's CarDetail.tsx (.eng-card/.eng-badge/
// .pro-item classes), which render this exact same structure with two different visual
// languages. Keeping the base-trim pick, tier grouping, "+N over X" naming, and compare-table
// inclusion logic here (not duplicated per page) is the whole point -- two copies of this much
// data interpretation would drift the moment one page got a tweak the other didn't.
import type { CatalogTrim } from "./types";

// catalog_trims.tier is a CHECK-constrained text column, '1'..'4' live today (confirmed
// against all rows) -- but stored as text, not smallint, so it's never assumed numeric
// without parsing first. Unlabeled/unexpected tiers fall back to "Tier N" rather than
// guessing a name; a null tier (no live rows today, but the column allows it) gets no label
// at all, not "Tier null".
const TIER_LABELS: Record<string, string> = { "1": "Base", "2": "Mid", "3": "High", "4": "Top" };

export function tierLabel(tier: string | null): string | null {
  if (tier == null) return null;
  return TIER_LABELS[tier] ?? `Tier ${tier}`;
}

// A handful of phases have a tier that isn't a plain digit string, or (defensively) null --
// treated as "higher than every real tier" everywhere a tier is compared numerically, so an
// unparseable trim sorts after every known one instead of colliding at 0 (which would
// wrongly claim to be the base). Exported because both pages' own tier-comparison code
// (the old per-page `numericTier`/`trimTierNumber` duplicates) now goes through this one
// instead.
export function numericTier(tier: string | null): number {
  return tier != null && /^\d+$/.test(tier) ? Number(tier) : Infinity;
}

// Ascending by tier, alphabetical by name as the tie-break within a tier -- 42 live phases
// have several trims on the same tier (parallel alternatives: Arona KJ7 tier 3's FR/
// Xcellence, Golf 5G tier 3's Highline/R-Line), and without an explicit tie-break their
// relative order would just be whatever catalog_trims happened to return, not the
// deterministic "FR / Xcellence"-style alphabetical join both pages' "+N over X" labels and
// "same level" groups depend on.
export function sortTrimsByTier(trims: CatalogTrim[]): CatalogTrim[] {
  return [...trims].sort((a, b) => {
    const diff = numericTier(a.tier) - numericTier(b.tier);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export interface TrimGroup {
  tier: string | null;
  trims: CatalogTrim[];
}

export interface TrimLayout {
  // The "Standard equipment" block -- the first trim of the lowest tier present (sortTrimsByTier
  // order), full list always expanded. Six live phases have no tier '1' trim at all; the base
  // is simply whichever tier is lowest for that phase, never hardcoded to '1'.
  base: CatalogTrim;
  // Every OTHER trim, grouped by tier ascending (a group can hold one trim, or several when
  // that tier has parallel alternatives -- including the base's own tier, when the base has
  // same-tier siblings like Octavia 1U Facelift's Classic/Tour).
  groups: TrimGroup[];
}

export function buildTrimLayout(trims: CatalogTrim[]): TrimLayout | null {
  if (trims.length === 0) return null;
  const sorted = sortTrimsByTier(trims);
  const base = sorted[0];
  const groups: TrimGroup[] = [];
  for (const trim of sorted.slice(1)) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.tier === trim.tier) lastGroup.trims.push(trim);
    else groups.push({ tier: trim.tier, trims: [trim] });
  }
  return { base, groups };
}

// The header line for every non-base trim: "+ {N} over {X}" where X is the nearest STRICTLY
// LOWER tier's trim name(s) (joined " / ", alphabetical), or "Alternative to {base name}" for
// a trim that shares the base's own tier -- there's no lower tier to compare it against, it's
// a parallel option at the same level (Octavia 1U Facelift's "Tour" next to base "Classic").
// Never compares a trim against a same-tier sibling (that comparison belongs to the compare
// table's inclusion rule below, not this label).
export function trimComparisonLabel(trim: CatalogTrim, base: CatalogTrim, allTrims: CatalogTrim[]): string {
  if (numericTier(trim.tier) === numericTier(base.tier)) return `Alternative to ${base.name}`;
  const trimTier = numericTier(trim.tier);
  const lowerTiers = allTrims.map((t) => numericTier(t.tier)).filter((n) => n < trimTier);
  const nearestLower = lowerTiers.length ? Math.max(...lowerTiers) : null;
  const overNames = nearestLower == null
    ? []
    : [...new Set(allTrims.filter((t) => numericTier(t.tier) === nearestLower).map((t) => t.name))]
        .sort((a, b) => a.localeCompare(b));
  const overText = overNames.length ? overNames.join(" / ") : base.name;
  return `+ ${trim.features.length} over ${overText}`;
}

export interface CompareCell {
  trimId: string;
  status: "included" | "optional" | "none";
}

export interface CompareRow {
  feature: string;
  cells: CompareCell[];
}

// Rows = every distinct feature text across the comparable trims (first-seen order, tier-
// ascending then within-tier trim order -- NOT deduplicated away from the per-trim lists
// those come from; a feature can legitimately be listed by more than one trim, e.g. "Sport
// seats" swapped for velour at a middle tier then reintroduced higher up, and every trim
// that explicitly lists a feature is still itself "included" for it regardless of what any
// other trim does).
//
// A cell is "included"/"optional" when EITHER that exact trim explicitly lists the feature
// itself, OR the feature's lowest introducing tier is STRICTLY below that trim's own tier.
// This is the fix for the bug the previous version had: comparing only by
// `trim.tier >= introTier` let a same-tier sibling silently inherit a feature it never
// actually listed (FR introduces something at tier 3 -> Xcellence, also tier 3, showed
// "included" too, which was wrong -- Xcellence must show "–" unless it lists that feature
// itself; only a trim at tier 4 or higher correctly inherits it).
export function buildCompareRows(comparableTrims: CatalogTrim[]): CompareRow[] {
  const featureOrder: string[] = [];
  const seenFeatures = new Set<string>();
  for (const trim of comparableTrims) {
    for (const f of trim.features) {
      if (!seenFeatures.has(f.feature)) {
        seenFeatures.add(f.feature);
        featureOrder.push(f.feature);
      }
    }
  }

  return featureOrder.map((feature) => {
    const explicitTrims = comparableTrims.filter((t) => t.features.some((f) => f.feature === feature));
    const minIntroTier = Math.min(...explicitTrims.map((t) => numericTier(t.tier)));
    const cells: CompareCell[] = comparableTrims.map((trim) => {
      const ownFeature = trim.features.find((f) => f.feature === feature);
      const inheritedFromLower = numericTier(trim.tier) > minIntroTier;
      if (!ownFeature && !inheritedFromLower) return { trimId: trim.id, status: "none" };
      // ownFeature's own isOptional wins when this trim lists the feature itself; otherwise
      // (purely inherited from a lower tier) use the lowest-tier introducing trim's flag --
      // there's exactly one lowest tier by construction (minIntroTier), though possibly
      // several trims at it, so this picks whichever of them listed it (their isOptional
      // values would only disagree if the same feature were simultaneously standard on one
      // tier-minIntroTier sibling and optional on another, a data inconsistency this reads
      // through rather than resolves).
      const isOptional = ownFeature
        ? ownFeature.isOptional
        : (explicitTrims.find((t) => numericTier(t.tier) === minIntroTier)?.features.find((f) => f.feature === feature)?.isOptional ?? false);
      return { trimId: trim.id, status: isOptional ? "optional" : "included" };
    });
    return { feature, cells };
  });
}
