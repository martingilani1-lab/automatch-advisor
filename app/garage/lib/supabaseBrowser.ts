// Browser-side Supabase client for My Garage -- used ONLY for signing in/out and reading the
// signed-in user's access token. All garage data goes through /api/garage (service role +
// the verified user id), same server-side pattern as every other route in this app; the
// browser never queries garage tables directly. The anon key is public by design.
//
// flowType "implicit": the magic link works even when the email is opened in a different
// browser than the one that asked for it (PKCE would need the same browser's stored verifier).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    });
  }
  return client;
}

// Authorization header for /api/garage calls; null when signed out.
export async function authHeader(): Promise<Record<string, string> | null> {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}
