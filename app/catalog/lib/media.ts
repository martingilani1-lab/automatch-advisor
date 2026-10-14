import type { CatalogMediaItem } from "./types";

// Picks the one image to show as "the" photo for a phase (vehicle-page header) or a specific
// body within it: prefer that body's own is_main row, else that body's 'front' angle, else
// any image for that body; if no bodyTypeId is given (or nothing matches it), fall back to
// the same preference order across every body the phase has. Mirrors
// pickMainImageUrl in app/api/db-test/route.ts, which does the equivalent pick over raw
// (snake_case) catalog_media rows for the car-list thumbnail -- kept as a separate,
// untyped-row version there rather than shared, per this codebase's existing convention of
// not sharing logic across the raw-DB-row/typed-camelCase transform boundary.
export function pickMainMedia(media: CatalogMediaItem[], bodyTypeId?: string | null): CatalogMediaItem | null {
  if (media.length === 0) return null;
  const scoped = bodyTypeId ? media.filter((m) => m.bodyTypeId === bodyTypeId) : media;
  const pool = scoped.length > 0 ? scoped : media;
  return pool.find((m) => m.isMain) ?? pool.find((m) => m.viewAngle === "front") ?? pool[0];
}
