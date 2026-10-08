import "./catalog.css";

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-catalog-bg text-catalog-text">{children}</div>;
}
