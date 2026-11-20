// Two-tier tags (app/catalog/lib/tags.ts).
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { COLOR_CATEGORIES, TAG_DEFINITIONS, getTagsForConfiguration, resolveTags } from "@/app/catalog/lib/tags";

describe("getTagsForConfiguration", () => {
  // Golf: model is family/value-retainer; this 2.0 TDI estate is a highway cruiser + heavy tower.
  // head_turner is configuration-level since 20261120140000, so it sits on the configuration here.
  const model = { id: "golf-8", tags: ["value_retainer", "family_ideal"] as const };
  const tdiEstate = { id: "c1", tags: ["heavy_tower", "highway_cruiser", "family_ideal", "sport", "head_turner"] as const };

  it("merges both levels, dedupes, and sorts by colour category then tag order", () => {
    const r = getTagsForConfiguration(model, tdiEstate);
    expect(r.map((t) => t.slug)).toEqual([
      "family_ideal", "highway_cruiser", // daily
      "value_retainer", // economy
      "heavy_tower", // utility
      "sport", // performance
      "head_turner", // premium
    ]);
  });
  it("records where each tag came from", () => {
    const by = Object.fromEntries(getTagsForConfiguration(model, tdiEstate).map((t) => [t.slug, t.source]));
    expect(by).toMatchObject({ family_ideal: "both", value_retainer: "model", heavy_tower: "configuration" });
  });
  it("drops slugs the app doesn't know (a newer DB tag) instead of rendering them blank", () => {
    expect(resolveTags(["family_ideal", "not_a_tag"], "model").map((t) => t.slug)).toEqual(["family_ideal"]);
  });
});

describe("vocabulary", () => {
  it("TAG_DEFINITIONS matches the rows seeded by the migration exactly", () => {
    const sql = readFileSync("supabase/migrations/20261102230000_create_catalog_tags.sql", "utf8");
    const rows = [...sql.matchAll(/\('([a-z0-9_]+)',\s+'((?:[^']|'')+)',\s+'(model|configuration|both)',\s+'(\w+)',\s+(\d+)\)/g)]
      .map((m) => ({ slug: m[1], label: m[2].replace(/''/g, "'"), tier: m[3], colorCategory: m[4], sortOrder: Number(m[5]) }));
    // Later migrations that changed a seeded row or added one (keep in step with them):
    //   20261120140000 -- head_turner tier model -> configuration
    //   20261120170000 -- roadtrip_camper label "Roadtrip/Camper" -> "Road trip"
    //   20261120170500 -- new tag camper
    const changedSince: Record<string, Partial<(typeof rows)[number]>> = {
      head_turner: { tier: "configuration" },
      roadtrip_camper: { label: "Road trip" },
    };
    rows.push({ slug: "camper", label: "Camper", tier: "configuration", colorCategory: "utility", sortOrder: 35 });
    expect(rows.length).toBe(Object.keys(TAG_DEFINITIONS).length);
    for (const r of rows) expect(TAG_DEFINITIONS[r.slug as keyof typeof TAG_DEFINITIONS]).toEqual({ ...r, ...changedSince[r.slug] });
  });
  it("every colour category is used and covered by the CHECK", () => {
    const used = new Set(Object.values(TAG_DEFINITIONS).map((t) => t.colorCategory));
    expect([...used].sort()).toEqual([...COLOR_CATEGORIES].sort());
  });
});
