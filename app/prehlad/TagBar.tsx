"use client";

import { LIFESTYLE_TAGS } from "@/app/lib/tags";

interface TagBarProps {
  selected: string[];
  counts: Record<string, number>;
  onToggle: (slug: string) => void;
}

// Multi-select HARD filter pills (AND — a car must carry every selected tag,
// see matchesTagGroup in carFilters.ts). Selecting a tag narrows the catalog,
// same as any sidebar filter — it does not reorder/rank. `counts` is a facet
// count exactly like the sidebar's (app/lib/carFilters.ts facetCounts, fed
// tag-aware `currentSelected` so an unselected pill's count already accounts
// for tags already picked): a pill with count 0 and not selected grays out
// and disables rather than disappearing — same "don't hide, gray out"
// convention as .filter-opt.dead. LIFESTYLE_TAGS (app/lib/tags.ts) is the
// single source for slugs/labels/emoji — nothing here is hardcoded.
export default function TagBar({ selected, counts, onToggle }: TagBarProps) {
  return (
    <div className="tag-bar">
      {LIFESTYLE_TAGS.map((t) => {
        const count = counts[t.slug] ?? 0;
        const isSelected = selected.includes(t.slug);
        const dead = count === 0 && !isSelected;
        return (
          <button
            key={t.slug}
            type="button"
            disabled={dead}
            className={`tag-pill${isSelected ? " active" : ""}${dead ? " dead" : ""}`}
            onClick={() => onToggle(t.slug)}
          >
            <span aria-hidden="true">{t.emoji}</span>
            <span>{t.label}</span>
            <span className="tag-pill-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
