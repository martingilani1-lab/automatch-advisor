---
name: write-api-route
description: Adding or scaffolding a new API route handler (app/api/<name>/route.ts) for AutoMatch — a new server endpoint that queries Supabase and returns JSON to the frontend. Use whenever the task involves creating a new API route, endpoint, or route handler, or adding a GET/POST handler under app/api/. Follows the project's exact client, error-handling, and transform conventions.
---

# Writing a new API route handler (AutoMatch)

## ⚠️ Before writing any Next.js-specific code

This project pins **`next@16.2.7`**, newer than most training data. Before writing
route-handler signatures, config, or data-fetching, check `node_modules/next/dist/docs/`
for the current API and heed any deprecation notices there. Do not assume older Next
conventions from memory.

## What & where

- One folder per route: **`app/api/<name>/route.ts`**
- Export **`GET`** and/or **`POST`** (per Next's route-handler convention — verify against
  the docs above).
- There is **no shared DB client module** and **no repository/DAO layer.** Each handler
  instantiates its own client and does **query-and-transform inline** in the same file.
  Don't introduce a shared client or DAO — inline is the established pattern.

## The skeleton every handler follows

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // server-side service-role — never the anon key
);

export async function GET() {
  try {
    const [vehiclesRes /*, moreRes... */] = await Promise.all([
      supabase.from("vehicles").select("*"),
    ]);
    if (vehiclesRes.error) throw vehiclesRes.error;

    // Transform: remap snake_case DB rows -> camelCase output shape HERE.
    // `any` is fine for the raw untransformed row inside this .map();
    // never in the exported/returned shape.
    const result = (vehiclesRes.data ?? []).map((v: any) => ({
      id: v.id,
      make: v.brand,          // snake_case -> camelCase
      // ...
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/<name>]", err);            // always this log prefix
    return NextResponse.json([], { status: 500 });  // typed-empty fallback (see rule 3)
  }
}
```

## The rules that make it match the codebase

1. **Service-role key, inline client.** Always `SUPABASE_SERVICE_ROLE_KEY` server-side.
   No shared `lib/supabase.ts`, no DAO layer — instantiate inline as above.
2. **Error handling is identical across every handler** — match it exactly:
   `try` → run queries in `Promise.all` → `if (res.error) throw res.error` per query →
   transform → `NextResponse.json(result)`. `catch` → `console.error("[/api/<name>]", err)`
   → return a typed-empty fallback with `{ status: 500 }`.
3. **The fallback must still type-check as valid output** — `[]` for array endpoints, a
   fully-keyed-but-empty object for object endpoints. **Never `null` or `undefined`,** and
   never let a raw Supabase error reach the client.
4. **A possibly-missing table degrades gracefully** via `.data || []`, not an explicit error
   check — a not-yet-migrated table just means "no rows," not a 500 (see `/api/detail`'s
   `vehicle_safety_features` handling).
5. **The raw DB shape never leaks past the transform.** Remap snake_case → camelCase inside
   the handler; a component consumes the camelCase shape, never the raw DB row.
6. **`import type {...}` on its own line;** use the `@/*` path alias for cross-directory imports.

## Worked example

Task: "Add an endpoint that returns the list of car brands for a filter dropdown."

`app/api/brands/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Returns the sorted, de-duplicated list of car brands, for filter dropdowns.
// Dedup happens here rather than in SQL to keep the query trivial and the
// shaping logic visible next to where it's consumed.
export async function GET() {
  try {
    const res = await supabase.from("vehicles").select("brand");
    if (res.error) throw res.error;

    const brands = Array.from(
      new Set((res.data ?? []).map((v: any) => v.brand).filter(Boolean))
    ).sort();

    return NextResponse.json(brands);
  } catch (err) {
    console.error("[/api/brands]", err);
    return NextResponse.json([], { status: 500 });   // [] keeps the return type valid
  }
}
```

Then tell the user: which file was created, what it returns, and that it follows the
standard handler pattern (service-role client, uniform error handling, typed-empty fallback).
