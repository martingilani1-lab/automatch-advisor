// /db-test's own page only loads the root layout's app/globals.css (hand-rolled BEM, no
// Tailwind at all) -- but CarDetail.tsx now reuses two Tailwind-styled components straight
// from /catalog (PhaseSwitcher, ConfigurationsTable -- vehicle page redesign step 1's "same
// component for both pages" requirement). Importing catalog.css here makes its Tailwind
// utilities + --color-catalog-* tokens available on this route tree too, the same way
// app/catalog/layout.tsx does for /catalog. Deliberately NOT wrapping children in a div (no
// dark/bg-catalog-bg class) -- /db-test already has its own background/theme via
// globals.css, and catalog.css never imports tailwindcss/preflight (see its own header
// comment), so there's nothing here that can reset or override db-test's existing styles --
// only new utility classnames become available for the shared components to use.
import "../catalog/catalog.css";

export default function DbTestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
