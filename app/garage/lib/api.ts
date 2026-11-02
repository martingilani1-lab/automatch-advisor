// Browser-side calls to /api/garage*, always with the signed-in user's token.
import type { GarageData } from "./server";
import { authHeader } from "./supabaseBrowser";

export async function loadGarage(): Promise<GarageData> {
  const auth = await authHeader();
  if (!auth) throw new Error("Not signed in");
  const res = await fetch("/api/garage", { headers: auth, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// One change; throws with the server's message so forms can show it.
export async function garageAction(action: string, payload: Record<string, unknown>): Promise<void> {
  const auth = await authHeader();
  if (!auth) throw new Error("Not signed in");
  const res = await fetch("/api/garage", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
}

// Local calendar date as YYYY-MM-DD (the user's "today", not UTC's).
export const localToday = () => new Date().toLocaleDateString("sv-SE");
