// One car tag. The data layer only knows a semantic colorCategory; this mapping turns it into a
// visual variant of the site's dark design system (classes defined in globals.css). Swapping
// the palette later = changing the CSS behind these variant names, nothing else.

import type { ColorCategory, ResolvedTag } from "@/app/catalog/lib/tags";

const VARIANT_CLASS: Record<ColorCategory, string> = {
  daily: "tag-badge tag-badge--daily",
  economy: "tag-badge tag-badge--economy",
  utility: "tag-badge tag-badge--utility",
  performance: "tag-badge tag-badge--performance",
  premium: "tag-badge tag-badge--premium",
};

interface TagBadgeProps {
  tag: ResolvedTag;
}

export default function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className={VARIANT_CLASS[tag.colorCategory]} title={`${tag.label} · ${tag.source === "model" ? "whole model" : "this configuration"}`}>
      {tag.label}
    </span>
  );
}
