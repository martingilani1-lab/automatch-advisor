import { Suspense } from "react";
import DbTestView from "./DbTestView";

function DbTestFallback() {
  return (
    <main className="w">
      <div className="results-hdr">
        <h3>DB test</h3>
      </div>
    </main>
  );
}

export default function DbTestPage() {
  return (
    <Suspense fallback={<DbTestFallback />}>
      <DbTestView />
    </Suspense>
  );
}
