export default function CatalogPhaseNotFound() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-catalog-text">Not found</h1>
      <p className="text-catalog-muted">
        No seeded phase matches this brand/model/generation/phase combination.
      </p>
    </main>
  );
}
