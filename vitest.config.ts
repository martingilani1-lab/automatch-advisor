import { defineConfig } from "vitest/config";
import path from "path";

// Minimal config for the scoring regression suite (tests/) — plain Node
// environment, no jsdom/React Testing Library, since the scoring pipeline
// under test is pure TS with no DOM dependency. Mirrors tsconfig.json's
// `@/*` -> repo-root path alias so test-file imports match the rest of the
// codebase's import style.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // app/api/recommend/route.ts constructs a Supabase client at module load
    // time (top-level `createClient(...)`). Importing it for `calcResults`
    // runs that constructor even though the scoring tests never call
    // fetchCarData — createClient only validates these are non-empty
    // strings, it makes no network call, so dummy values are sufficient and
    // the test suite still never touches Supabase.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-dummy-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
