// Autobazar.eu reader (SK). Learned from the live site on 2026-10-27:
//   * model results:  /vysledky/osobne-vozidla/<brand>/<model>/          (e.g. skoda/octavia-combi)
//   * one filter:     /vysledky-parametre/osobne-vozidla/<brand>/<model>/<filter>/
//                     filters seen: a year (2017), fuel (diesel), gearbox (manual / automat),
//                     power ("110-kw"). Combining several in one path is NOT confirmed, so we use
//                     the single power filter -- the most selective for an exact engine; year,
//                     fuel and gearbox are then checked by the matcher anyway.
//   * Estates are separate model slugs ("octavia" vs "octavia-combi"), so a search covers both.
//   * ads link to /detail/<slug>/<id>/ (private + dealers) or /detail-aaa/<slug>/<id>/ (AAA
//     Auto); photos come from img.autobazar.eu/foto/...; each result block shows price "8 800 €",
//     "224 496 km", "110 kW", fuel (Diesel/Benzín/...), gearbox (Manuál/Automat), "ZA kraj".
//
// Parsing is deliberately TEXT-based (detail-link blocks + the visible values), not tied to CSS
// class names, so a visual redesign doesn't break it as long as the facts stay on the card. It
// never throws: an unreadable page yields [] and shows up as "0 read" for this portal.

import type { AdFuel, AdTransmission } from "../adExtraction";
import type { PortalListing, PortalProvider, PortalSearchQuery } from "./types";

const BASE = "https://www.autobazar.eu";

// Lowercase, no diacritics, spaces -> dashes ("Škoda" -> "skoda", "T-Roc" -> "t-roc").
export function slug(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Estate model slugs per brand. Only VERIFIED ones are listed (Škoda: octavia-combi,
// superb-combi, fabia-combi seen on the site); add others once seen on autobazar.eu.
const ESTATE_SUFFIX: Record<string, string> = { skoda: "-combi" };
const isEstate = (body: string) => /combi|kombi|estate|variant|avant|sportstourer|wagon/i.test(body);

export function autobazarEuSearchUrls(q: PortalSearchQuery): string[] {
  const brand = slug(q.brand);
  const model = slug(q.model);
  const models = [model];
  if (ESTATE_SUFFIX[brand] && (q.bodyNames ?? []).some(isEstate)) models.push(model + ESTATE_SUFFIX[brand]);
  return models.map((m) =>
    q.powerKw != null
      ? `${BASE}/vysledky-parametre/osobne-vozidla/${brand}/${m}/${q.powerKw}-kw/`
      : `${BASE}/vysledky/osobne-vozidla/${brand}/${m}/`
  );
}

// ---- parsing ------------------------------------------------------------------------------

const DETAIL_RE = /(?:https?:\/\/www\.autobazar\.eu)?\/detail(?:-[a-z]+)?\/[a-z0-9-]+\/[A-Za-z0-9_-]{6,}\//g;
const PHOTO_RE = /https?:\/\/img\.autobazar\.eu\/foto\/[^"'\s)<>]+/;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&euro;/g, "€")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
const textOf = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const num = (s: string) => Number(s.replace(/[\s.\u00a0]/g, ""));

// "skoda-octavia-combi-20-tdi-style-dsg" -> "2.0 TDI" (the slug keeps the engine even when the
// card title is shortened to "Škoda Octavia Combi - 2016, 6-st. manuálna").
export function engineFromSlug(s: string): string | null {
  const m = s.match(/(?:^|-)([1-6])(\d{1,2})-(tdi|tsi|tfsi|etsi|mpi|fsi|tgi|sdi)(?=-|$)/);
  return m ? `${m[1]}.${m[2][0]} ${m[3].toUpperCase()}` : null;
}

function fuelOf(text: string): AdFuel | null {
  if (/\bhybrid|plug-in\b/i.test(text)) return "hybrid";
  if (/\belektro\b|\belektrina\b/i.test(text)) return "ev";
  if (/\bdiesel\b|\bnafta\b/i.test(text)) return "diesel";
  if (/\bbenz[ií]n\b|\blpg\b|\bcng\b/i.test(text)) return "petrol";
  return null;
}
function gearboxOf(text: string): AdTransmission | null {
  const auto = /\bautomat\w*/i.test(text);
  const man = /\bmanu[aá]l\w*/i.test(text);
  return auto === man ? null : auto ? "automatic" : "manual";
}

export function parseAutobazarEu(html: string, currentYear = new Date().getFullYear()): PortalListing[] {
  try {
    // First occurrence of each ad link, in page order. Each ad links its detail page several
    // times (photo, price, title); the block runs until the next NEW ad link.
    const firsts: { url: string; at: number }[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(DETAIL_RE)) {
      const url = m[0].startsWith("http") ? m[0] : BASE + m[0];
      if (seen.has(url)) continue;
      seen.add(url);
      firsts.push({ url, at: m.index ?? 0 });
    }
    const out: PortalListing[] = [];
    firsts.forEach((f, i) => {
      // Start at the opening "<a" of the card's first link (the photo sits inside it), never
      // before the previous card's last link -- otherwise a card picks up its neighbour's facts.
      const start = Math.max(i > 0 ? firsts[i - 1].at + 1 : 0, html.lastIndexOf("<a", f.at));
      const block = html.slice(start, i + 1 < firsts.length ? firsts[i + 1].at : undefined);
      const text = textOf(block);

      const price = text.match(/(\d{1,3}(?:[ \u00a0.]\d{3})+|\d{3,7})\s?€/);
      const km = text.match(/(\d{1,3}(?:[ \u00a0.]\d{3})+|\d{1,7})\s?km\b/i);
      const kw = text.match(/(\d{2,3})\s?kW\b/i);
      const yearM = [...text.matchAll(/(?:^|[^0-9.])((?:19|20)\d{2})(?![0-9])/g)].map((m) => Number(m[1])).find((y) => y >= 1950 && y <= currentYear + 1);
      const region = text.match(/\b([A-Z]{2}) kraj\b/);
      const photo = block.match(PHOTO_RE);

      // Title: the longest plain anchor text pointing at this ad (skipping the price link).
      const path = f.url.replace(BASE, "");
      const anchorRe = new RegExp(`<a[^>]+href="(?:${BASE.replace(/[.]/g, "\\.")})?${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</a>`, "g");
      const titles = [...block.matchAll(anchorRe)].map((m) => textOf(m[1])).filter((t) => t.length > 4 && !/€/.test(t));
      const slugPart = path.split("/")[2] ?? "";
      let title = titles.sort((a, b) => b.length - a.length)[0] ?? slugPart.replace(/-/g, " ");
      const eng = engineFromSlug(slugPart);
      if (eng && !title.toUpperCase().includes(eng.split(" ")[1])) title = `${title} · ${eng}`;

      out.push({
        portal: "autobazar-eu",
        url: f.url,
        title,
        price: price ? num(price[1]) : null,
        currency: "EUR",
        year: yearM ?? null,
        mileageKm: km ? num(km[1]) : null,
        powerKw: kw ? Number(kw[1]) : null,
        fuel: fuelOf(text),
        transmission: gearboxOf(text),
        location: region ? `${region[1]} kraj` : null,
        photoUrl: photo ? decode(photo[0]) : null,
      });
    });
    return out;
  } catch {
    return [];
  }
}

export const autobazarEu: PortalProvider = {
  id: "autobazar-eu",
  name: "Autobazar.eu",
  country: "SK",
  searchUrls: autobazarEuSearchUrls,
  parse: (html) => parseAutobazarEu(html),
};
