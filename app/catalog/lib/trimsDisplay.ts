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

// Humanises a catalog_trim_features.feature_group id ("steering_wheel") into display text
// ("Steering wheel") -- underscores to spaces, first letter capitalised, nothing else, so a
// multi-word group never turns into Title Case ("Fog Lights" would look like a different
// naming convention from every other label on this page).
export function groupLabel(group: string): string {
  const words = group.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface GroupOccupant {
  feature: string;
  isOptional: boolean;
  safetyFeatureSlug: string | null;
}

export interface ResolvedFeatureRow {
  feature: string;
  isOptional: boolean;
  featureGroup: string | null;
  // "inherited" = came from base or a lower tier, unchanged. "new" = this trim's own feature,
  // either standalone (no group) or the first thing to occupy its group. "upgraded" = this
  // trim's own feature replaced a DIFFERENT inherited item in the same group.
  status: "inherited" | "new" | "upgraded";
  // Set only for a genuine (non-optional) replacement -- the text of whatever this row's
  // group held immediately before this trim's own features were applied. Null for
  // "inherited"/"new", and for an optional "upgraded" row (an optional feature never actually
  // replaces the standard one -- see resolveTrimFeatures -- so there is nothing it "was").
  replacedFeature: string | null;
  // catalog_trim_features.safety_feature_slug -- null for the ~800 ordinary equipment rows,
  // set for the 442 rows that are actually one of the 20 safety_features (ABS/ESP/airbags +
  // the 17 assists). For an "upgraded" row this is always the NEW item's slug, never the
  // replaced one -- read straight off the feature being processed, same as `feature` itself.
  safetyFeatureSlug: string | null;
}

// The full resolved equipment list for one trim: every feature it genuinely has, each tagged
// with where it stands relative to what came before it. Walks base, then every OTHER trim at
// a tier strictly below this one (ascending tier, alphabetical within a tier -- ties the same
// way sortTrimsByTier already does), then this trim's own rows -- a feature_group's current
// occupant is whatever the most recent step in that walk set it to, so a tier-3 trim correctly
// sees tier-2's upgrade of tier-1's item, not tier-1's original. base is ALWAYS walked first
// regardless of trim's own tier (even for a same-tier sibling of base, e.g. Octavia 1U
// Facelift's "Tour" next to base "Classic") -- that matches the plain-text inheritance this
// replaces: base is the universal floor every trim sits on, not just "whatever's below me".
// Same-tier siblings of EACH OTHER never contribute to one another, only to a trim at a
// strictly higher tier (when two parallel trims both occupy a group, the alphabetically-later
// one is what a still-higher trim sees as the prior occupant -- an inherent ambiguity in
// "which sibling does the next tier build on", not covered by name in any of this feature's
// verify cases, but deterministic).
//
// An optional feature_group row NEVER occupies the replaceable slot (rule: "an optional item
// never replaces a standard one") -- it's tracked separately and shown alongside whatever
// (if anything) the standard slot holds, so a lower trim's optional extra is never silently
// dropped just because a higher trim later adds its own optional alternative, and a standard
// item is never hidden by an optional one layered on top of it.
export function resolveTrimFeatures(trim: CatalogTrim, base: CatalogTrim, allTrims: CatalogTrim[]): ResolvedFeatureRow[] {
  const trimTier = numericTier(trim.tier);
  const lowerTrims = sortTrimsByTier(allTrims.filter((t) => numericTier(t.tier) < trimTier && t.id !== base.id));
  const chain = trim.id === base.id ? [base] : [base, ...lowerTrims];

  const groupState = new Map<string, GroupOccupant>();
  const standaloneSeen = new Map<string, GroupOccupant>();
  const optionalByGroup = new Map<string, GroupOccupant[]>();

  function apply(features: CatalogTrim["features"]) {
    for (const f of features) {
      if (!f.featureGroup) {
        const key = f.feature.toLowerCase();
        if (!standaloneSeen.has(key)) standaloneSeen.set(key, { feature: f.feature, isOptional: f.isOptional, safetyFeatureSlug: f.safetyFeatureSlug });
        continue;
      }
      if (f.isOptional) {
        const list = optionalByGroup.get(f.featureGroup) ?? [];
        if (!list.some((x) => x.feature.toLowerCase() === f.feature.toLowerCase())) list.push({ feature: f.feature, isOptional: true, safetyFeatureSlug: f.safetyFeatureSlug });
        optionalByGroup.set(f.featureGroup, list);
        continue;
      }
      groupState.set(f.featureGroup, { feature: f.feature, isOptional: false, safetyFeatureSlug: f.safetyFeatureSlug });
      // A STANDARD item supersedes everything in its group, optional extras included: once a
      // trim has Climatronic as standard, a lower trim's "Manual AC (optional)" is no longer an
      // option anyone buys on top of it. Without this the old optional row kept showing grey
      // under the upgrade (Golf 1J Highline: Climatronic + "Manual AC  optional", reported
      // 2026-10-26). The reverse still holds -- an optional item never displaces a standard one.
      optionalByGroup.delete(f.featureGroup);
    }
  }

  for (const t of chain) apply(t.features);

  // Snapshot BEFORE this trim's own rows -- the "was:" baseline for a genuine replacement.
  const preGroupState = new Map(groupState);
  const preStandalone = new Map(standaloneSeen);
  const preOptionalByGroup = new Map([...optionalByGroup].map(([k, v]) => [k, [...v]]));

  const rows: ResolvedFeatureRow[] = [];
  const touchedGroups = new Set<string>();
  const touchedStandalone = new Set<string>();

  // trim === base: nothing further to resolve, every row below is naturally "inherited".
  if (trim.id !== base.id) {
    for (const f of trim.features) {
      const key = f.feature.toLowerCase();
      if (!f.featureGroup) {
        touchedStandalone.add(key);
        if (preStandalone.has(key)) continue; // identical text -- stays an inherited row
        rows.push({ feature: f.feature, isOptional: f.isOptional, featureGroup: null, status: "new", replacedFeature: null, safetyFeatureSlug: f.safetyFeatureSlug });
        continue;
      }
      if (f.isOptional) {
        const priorOptional = (preOptionalByGroup.get(f.featureGroup) ?? []).some((x) => x.feature.toLowerCase() === key);
        if (priorOptional) continue; // identical optional text -- stays an inherited row
        const priorStandard = preGroupState.get(f.featureGroup) ?? null;
        rows.push({
          feature: f.feature,
          isOptional: true,
          featureGroup: f.featureGroup,
          status: priorStandard ? "upgraded" : "new",
          replacedFeature: null, // optional never actually replaces -- no "was:" line
          safetyFeatureSlug: f.safetyFeatureSlug,
        });
        continue;
      }
      touchedGroups.add(f.featureGroup);
      const prior = preGroupState.get(f.featureGroup) ?? null;
      if (prior && prior.feature.toLowerCase() === key) continue; // identical -- stays inherited
      // No standard predecessor but an inherited OPTIONAL one in the same group: this standard
      // item replaces it too (see apply() above), so it's an upgrade "was: X (optional)" -- also
      // covers the same text going from optional to standard (A3 8L Attraction -> Ambiente).
      const priorOptional = prior ? null : (preOptionalByGroup.get(f.featureGroup) ?? [])[0] ?? null;
      const replaced = prior ? prior.feature : priorOptional ? `${priorOptional.feature} (optional)` : null;
      rows.push({
        feature: f.feature,
        isOptional: false,
        featureGroup: f.featureGroup,
        status: replaced ? "upgraded" : "new",
        replacedFeature: replaced,
        safetyFeatureSlug: f.safetyFeatureSlug,
      });
    }
  }

  for (const [group, occ] of preGroupState) {
    if (touchedGroups.has(group)) continue; // replaced above -- the old item is not listed at all
    rows.push({ feature: occ.feature, isOptional: false, featureGroup: group, status: "inherited", replacedFeature: null, safetyFeatureSlug: occ.safetyFeatureSlug });
  }
  for (const occ of preStandalone.values()) {
    if (touchedStandalone.has(occ.feature.toLowerCase())) continue;
    rows.push({ feature: occ.feature, isOptional: false, featureGroup: null, status: "inherited", replacedFeature: null, safetyFeatureSlug: occ.safetyFeatureSlug });
  }
  for (const [group, list] of preOptionalByGroup) {
    if (touchedGroups.has(group)) continue; // superseded by this trim's own standard item
    for (const occ of list) rows.push({ feature: occ.feature, isOptional: true, featureGroup: null, status: "inherited", replacedFeature: null, safetyFeatureSlug: occ.safetyFeatureSlug });
  }

  const order: Record<ResolvedFeatureRow["status"], number> = { upgraded: 0, new: 1, inherited: 2 };
  return [...rows].sort((a, b) => order[a.status] - order[b.status]);
}

// The header line for every non-base trim: "+{new} new · ↑{upgraded} upgraded over {X}" where
// X is the nearest STRICTLY LOWER tier's trim name(s) (joined " / ", alphabetical), or
// "Alternative to {base name}" for a trim that shares the base's own tier -- there's no lower
// tier to compare it against, it's a parallel option at the same level (Octavia 1U Facelift's
// "Tour" next to base "Classic"). Never compares a trim against a same-tier sibling (that
// comparison belongs to the compare table's inclusion rule below, not this label).
export function trimComparisonLabel(trim: CatalogTrim, base: CatalogTrim, allTrims: CatalogTrim[]): string {
  if (numericTier(trim.tier) === numericTier(base.tier)) return `Alternative to ${base.name}`;
  const rows = resolveTrimFeatures(trim, base, allTrims);
  const newCount = rows.filter((r) => r.status === "new").length;
  const upgradedCount = rows.filter((r) => r.status === "upgraded").length;
  const trimTier = numericTier(trim.tier);
  const lowerTiers = allTrims.map((t) => numericTier(t.tier)).filter((n) => n < trimTier);
  const nearestLower = lowerTiers.length ? Math.max(...lowerTiers) : null;
  const overNames = nearestLower == null
    ? []
    : [...new Set(allTrims.filter((t) => numericTier(t.tier) === nearestLower).map((t) => t.name))]
        .sort((a, b) => a.localeCompare(b));
  const overText = overNames.length ? overNames.join(" / ") : base.name;
  return `+${newCount} new · ↑${upgradedCount} upgraded over ${overText}`;
}

// This trim's single current occupant per feature_group -- the standard (non-optional) one if
// it has one, else its lone optional occupant, else the group is absent entirely. Used by the
// compare table below, where each cell needs exactly one representative value per trim per
// group (a trim's own widget, by contrast, can show a standard row AND an optional row side
// by side -- the compare table can't, it's one cell).
function resolvedByGroup(rows: ResolvedFeatureRow[]): Map<string, GroupOccupant> {
  const map = new Map<string, GroupOccupant>();
  for (const r of rows) {
    if (!r.featureGroup || r.isOptional) continue;
    map.set(r.featureGroup, { feature: r.feature, isOptional: false, safetyFeatureSlug: r.safetyFeatureSlug });
  }
  for (const r of rows) {
    if (!r.featureGroup || !r.isOptional || map.has(r.featureGroup)) continue;
    map.set(r.featureGroup, { feature: r.feature, isOptional: true, safetyFeatureSlug: r.safetyFeatureSlug });
  }
  return map;
}

export interface CompareCell {
  trimId: string;
  text: string;
  isOptional: boolean;
  // True when this cell's text differs from the same row's cell for the trim immediately to
  // its left (comparableTrims order) -- the compare table's own amber "this changed" colour,
  // never the first column (nothing to its left to differ from).
  changed: boolean;
}

export interface CompareRow {
  label: string;
  cells: CompareCell[];
}

// Rows = one per feature_group that any comparable trim actually resolves to something for
// (humanised label), plus one per distinct standalone (groupless) feature text -- replacing
// the old "one row per raw feature string" model, which listed a group's lower- and
// higher-trim wording as two separate rows instead of one row whose value changes across
// columns. Each trim's cell is its own resolveTrimFeatures result looked up by group/text, so
// the table reflects exactly what that trim show in its own card -- not re-derived differently
// here.
export function buildCompareRows(comparableTrims: CatalogTrim[], base: CatalogTrim, allTrims: CatalogTrim[]): CompareRow[] {
  const resolvedByTrim = new Map(comparableTrims.map((t) => [t.id, resolveTrimFeatures(t, base, allTrims)] as const));
  const byGroupByTrim = new Map(comparableTrims.map((t) => [t.id, resolvedByGroup(resolvedByTrim.get(t.id)!)] as const));

  const groupIds = new Set<string>();
  for (const map of byGroupByTrim.values()) for (const g of map.keys()) groupIds.add(g);

  const standaloneTexts: string[] = [];
  const seenStandalone = new Set<string>();
  for (const trim of comparableTrims) {
    for (const r of resolvedByTrim.get(trim.id)!) {
      if (r.featureGroup) continue;
      const key = r.feature.toLowerCase();
      if (!seenStandalone.has(key)) {
        seenStandalone.add(key);
        standaloneTexts.push(r.feature);
      }
    }
  }

  const cellText = (occ: GroupOccupant | null) => (occ ? occ.feature + (occ.isOptional ? " (opt)" : "") : "–");

  const groupRows: CompareRow[] = [...groupIds].sort().map((group) => {
    const cells: CompareCell[] = comparableTrims.map((trim, i) => {
      const occ = byGroupByTrim.get(trim.id)!.get(group) ?? null;
      const text = cellText(occ);
      const prevText = i > 0 ? cellText(byGroupByTrim.get(comparableTrims[i - 1].id)!.get(group) ?? null) : text;
      return { trimId: trim.id, text, isOptional: !!occ?.isOptional, changed: i > 0 && text !== prevText };
    });
    return { label: groupLabel(group), cells };
  });

  const standaloneRows: CompareRow[] = [...standaloneTexts].sort((a, b) => a.localeCompare(b)).map((feature) => {
    const has = (trimId: string) => resolvedByTrim.get(trimId)!.some((r) => !r.featureGroup && r.feature.toLowerCase() === feature.toLowerCase());
    const cells: CompareCell[] = comparableTrims.map((trim, i) => {
      const text = has(trim.id) ? "✓" : "–";
      const prevText = i > 0 ? (has(comparableTrims[i - 1].id) ? "✓" : "–") : text;
      return { trimId: trim.id, text, isOptional: false, changed: i > 0 && text !== prevText };
    });
    return { label: feature, cells };
  });

  return [...groupRows, ...standaloneRows];
}

export interface SafetyEquipmentAvailability {
  standardFrom: CatalogTrim | null;
  optionalOn: CatalogTrim[];
}

// Where one safety_features.slug sits across every trim of this phase: the lowest-tier trim
// that lists it as its OWN standard (non-optional) feature -- every higher trim inherits it
// from there, per resolveTrimFeatures' cascade, so "first owner" is simply the lowest-tier
// trim whose own row has this slug, no need to walk the cascade to find it -- plus any trim
// STRICTLY below that tier that lists it as its own optional feature (offered before it
// became standard, e.g. "Optional on Basis" followed later by "Standard from Life"). A slug
// with no standard owner anywhere just returns every trim that offers it as optional, however
// many tiers that spans.
export function safetyEquipmentAvailability(slug: string, trims: CatalogTrim[]): SafetyEquipmentAvailability {
  const sorted = sortTrimsByTier(trims);
  const standardTrims = sorted.filter((t) => t.features.some((f) => f.safetyFeatureSlug === slug && !f.isOptional));
  const standardFrom = standardTrims[0] ?? null;
  const standardTier = standardFrom ? numericTier(standardFrom.tier) : Infinity;
  const optionalOn = sorted.filter((t) => numericTier(t.tier) < standardTier && t.features.some((f) => f.safetyFeatureSlug === slug && f.isOptional));
  return { standardFrom, optionalOn };
}

// "Optional on Basis · Standard from Life" / "Standard from Active" / "Optional on FR, Xcellence"
// -- optional trims listed first (per the spec's own example order), standard-from last. Null
// when the slug isn't on any trim at all (shouldn't happen for a slug this was called with,
// since distinctSafetyFeatureSlugs below only yields slugs that ARE on some trim, but this
// stays defensive rather than assuming that invariant at the call site).
export function safetyEquipmentAvailabilityLabel(slug: string, trims: CatalogTrim[]): string | null {
  const { standardFrom, optionalOn } = safetyEquipmentAvailability(slug, trims);
  const parts: string[] = [];
  if (optionalOn.length > 0) parts.push(`Optional on ${optionalOn.map((t) => t.name).join(", ")}`);
  if (standardFrom) parts.push(`Standard from ${standardFrom.name}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// Every distinct safety_features.slug present (standard or optional) on ANY trim of this
// phase -- the row set for the NCAP tab's "Safety equipment in this car's trims" section.
export function distinctSafetyFeatureSlugs(trims: CatalogTrim[]): string[] {
  const slugs = new Set<string>();
  for (const t of trims) for (const f of t.features) if (f.safetyFeatureSlug) slugs.add(f.safetyFeatureSlug);
  return [...slugs];
}
