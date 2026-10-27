// Registered portal readers. Adding a portal = one module implementing PortalProvider
// (see ./types.ts) + one line here.
//
// TipCars (CZ) is next -- its search-page address and layout still need to be seen once.

import type { PortalProvider } from "./types";
import { autobazarEu } from "./autobazarEu";

export const PORTAL_PROVIDERS: PortalProvider[] = [autobazarEu];
