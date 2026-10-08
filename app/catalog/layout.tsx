import type { Metadata } from "next";

import "./catalog.css";

// Applies to every route under /catalog (metadata inherits down the segment tree unless a
// deeper segment defines its own `robots` -- none here do). This is a Step 1 vertical slice,
// not meant to be indexed yet.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-catalog-bg text-catalog-text">{children}</div>;
}
