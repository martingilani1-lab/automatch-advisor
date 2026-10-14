// Empty state, per the garage theme's convention: text-secondary, with an icon.
export default function CatalogPhaseNotFound() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-20 text-center">
      <span className="text-3xl" aria-hidden="true">🔍</span>
      <h1 className="text-2xl font-semibold text-primary">Not found</h1>
      <p className="text-secondary">
        No seeded phase matches this brand/model/generation/phase combination.
      </p>
    </main>
  );
}
