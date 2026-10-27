// Registered portal readers. Adding a portal = one module implementing PortalProvider
// (see ./types.ts) + one line here.
//
// Autobazar.sk and TipCars are next: their readers are written against a saved copy of a real
// results page (so they're tested on the portal's actual HTML), which hasn't been supplied
// yet. Until then this list is empty and the Ads section says so.

import type { PortalProvider } from "./types";

export const PORTAL_PROVIDERS: PortalProvider[] = [];
