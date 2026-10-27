// Portal readers: one small module per classified portal (Autobazar.sk, TipCars, ...).
// Each knows two things only -- how to build a search URL for a model + year range, and how to
// read that results page into PortalListing cards. Everything else (fetching, 24 h memory,
// matching to the exact engine) is shared, in searchListings.ts and /api/listings.
//
// READ-ONLY by design, TheParking-style: we keep just what a card needs (title, price, year,
// km, power, fuel, gearbox, location, photo URL, ad URL) for at most 24 hours in memory, and
// every card links to the original ad. Nothing is written to our database; the photo is shown
// from the portal's own server, never copied.

import type { AdFuel, AdTransmission } from "../adExtraction";

export interface PortalSearchQuery {
  brand: string; // catalog brand name, e.g. "Škoda"
  model: string; // catalog model name, e.g. "Octavia"
  yearFrom: number | null;
  yearTo: number | null; // null = still in production
  fuel: AdFuel | null; // the target engine's fuel -- portals filter on it, cutting noise
}

export interface PortalListing {
  portal: string; // provider id
  url: string; // the original ad -- every card links here
  title: string;
  price: number | null;
  currency: "EUR" | "CZK";
  year: number | null;
  mileageKm: number | null;
  powerKw: number | null;
  fuel: AdFuel | null;
  transmission: AdTransmission | null;
  location: string | null;
  photoUrl: string | null; // shown from the portal's server (hotlinked), never stored
}

export interface PortalProvider {
  id: string;
  name: string; // shown on cards, e.g. "Autobazar.sk"
  country: "SK" | "CZ";
  searchUrl(q: PortalSearchQuery): string;
  // Reads one results page. Must never throw on unexpected HTML: return what it could read
  // (possibly []) -- a portal redesign then shows as "0 ads" for that portal, not a crash.
  parse(html: string, pageUrl: string): PortalListing[];
}
