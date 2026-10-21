// Pure formatting/sorting helpers for catalog_trims -- shared by /catalog's TrimsList.tsx and
// /db-test's CarDetail.tsx (both render the same TrimCards component from
// app/catalog/components/TrimCards.tsx), so the two pages' trim cards agree on tier labels
// and ordering, not two copies that could drift.
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

// Ascending by tier (ties/unparseable tiers sort after every known tier, in their original
// order, rather than colliding at 0 -- same null-handling pattern as the /db-test displacement/
// power-range sorts elsewhere in this codebase).
export function sortTrimsByTier(trims: CatalogTrim[]): CatalogTrim[] {
  return [...trims].sort((a, b) => {
    const tierA = a.tier != null && /^\d+$/.test(a.tier) ? Number(a.tier) : Infinity;
    const tierB = b.tier != null && /^\d+$/.test(b.tier) ? Number(b.tier) : Infinity;
    return tierA - tierB;
  });
}
