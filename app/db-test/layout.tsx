// /db-test's own page only loads the root layout's app/globals.css (hand-rolled BEM, no
// Tailwind at all) -- but CarDetail.tsx (the detail panel -- not the car list, which stays
// on its existing globals.css classes) is now fully Tailwind-styled with the "garage" dark
// theme, reusing several components straight from /catalog (PhaseSwitcher,
// ConfigurationsTable, the shared ui/ primitives). Importing catalog.css here makes its
// Tailwind utilities + garage theme tokens available on this route tree too, the same way
// app/catalog/layout.tsx does for /catalog. Deliberately NOT wrapping children in a div here
// (the theme-garage/theme-garage-page wrapper classes are applied on CarDetail.tsx's own
// root instead, scoped to just the detail panel, not the whole /db-test page) -- and
// catalog.css never imports tailwindcss/preflight (see its own header comment), so there's
// nothing here that can reset or override db-test's existing list-view styles.
import "../catalog/catalog.css";

export default function DbTestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
