import { Suspense } from "react";
import PrehladView from "./PrehladView";

function PrehladFallback() {
  return (
    <main className="w">
      <div className="results-hdr">
        <h3>Browse & Compare</h3>
      </div>
    </main>
  );
}

export default function PrehladPage() {
  return (
    <Suspense fallback={<PrehladFallback />}>
      <PrehladView />
    </Suspense>
  );
}
