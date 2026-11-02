"use client";

// My Garage: sign in (email link) -> your cars, each with what's due next (STK, insurance,
// oil, timing belt, gearbox/AWD service ...), service history and deadlines; plus opt-in email
// reminders. All data via /api/garage (see that route for the security model).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

import type { GarageData } from "./lib/server";
import { supabaseBrowser } from "./lib/supabaseBrowser";
import { garageAction, loadGarage } from "./lib/api";
import AddVehicleForm from "./AddVehicleForm";
import VehicleCard from "./VehicleCard";

function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/garage` },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="garage-card">
      <div className="garage-title">Sign in to your garage</div>
      <p className="tg" style={{ marginBottom: 12 }}>
        Keep your cars&apos; service history in one place and get an email before STK, insurance or the next service is due.
        No password -- we email you a sign-in link.
      </p>
      {sent ? (
        <p style={{ color: "#6bdb8a" }}>Check your inbox -- we sent a sign-in link to {email.trim()}.</p>
      ) : (
        <>
          <input
            type="email"
            className="garage-input"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && /\S+@\S+\.\S+/.test(email) && send()}
          />
          <button type="button" className="garage-btn" disabled={busy || !/\S+@\S+\.\S+/.test(email)} onClick={send}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </>
      )}
      {error && <p style={{ color: "#ff6b35", marginTop: 8 }}>{error}</p>}
    </div>
  );
}

interface SettingsCardProps {
  data: GarageData;
  onSaved: () => void;
}

function SettingsCard({ data, onSaved }: SettingsCardProps) {
  const [enabled, setEnabled] = useState(data.settings.emailEnabled);
  const [days, setDays] = useState(data.settings.daysBefore);
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const dirty = enabled !== data.settings.emailEnabled || days !== data.settings.daysBefore;

  async function save() {
    setState("saving");
    try {
      await garageAction("saveSettings", { emailEnabled: enabled, daysBefore: days });
      setState("saved");
      onSaved();
    } catch (e) {
      setState(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="garage-card">
      <div className="sub-label" style={{ marginTop: 0 }}>{"🔔"} Email reminders</div>
      <label className="tco-check" style={{ margin: "6px 0" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>Email me at {data.email ?? "my address"} before something is due</span>
      </label>
      <label className="garage-row">
        <span className="tg">Remind me</span>
        <select className="tco-cmp-select" style={{ width: "auto", marginTop: 0 }} value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={!enabled}>
          {[7, 14, 21, 30, 45, 60].map((d) => <option key={d} value={d}>{d} days before</option>)}
        </select>
      </label>
      {dirty && <button type="button" className="garage-btn" onClick={save} disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save"}</button>}
      {state === "saved" && !dirty && <p className="tg">Saved.</p>}
      {state !== "idle" && state !== "saving" && state !== "saved" && <p style={{ color: "#ff6b35" }}>{state}</p>}
      <p className="tg" style={{ marginTop: 6 }}>Checked every morning. You get one email per item when it comes within this window -- STK, insurance and services due by date or by km.</p>
    </div>
  );
}

export default function GarageView() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = checking
  const [data, setData] = useState<GarageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data: d }) => setSession(d.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(() => {
    loadGarage()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your garage"));
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);

  return (
    <main className="w garage-page">
      <Link href="/" className="restart" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>{"←"} Back</Link>
      <div className="results-hdr">
        <h3>My Garage</h3>
        <div className="tg">Service history and reminders for your cars</div>
      </div>

      {session === undefined && <p className="tg">Loading…</p>}
      {session === null && <SignIn />}

      {session && (
        <>
          <div className="garage-row" style={{ marginBottom: 10 }}>
            <span className="tg">Signed in as {session.user.email}</span>
            <button type="button" className="cfg-link" style={{ fontSize: ".78rem", color: "#9999aa" }} onClick={() => { supabaseBrowser().auth.signOut(); setData(null); }}>Sign out</button>
          </div>
          {error && <p style={{ color: "#ff6b35" }}>{error}</p>}
          {!data && !error && <p className="tg">Loading your garage…</p>}
          {data && (
            <>
              {data.vehicles.length === 0 && !adding && (
                <div className="garage-card"><p className="tg">No cars yet. Add your first one to start tracking STK, insurance and services.</p></div>
              )}
              {data.vehicles.map((v) => <VehicleCard key={v.id} v={v} onChanged={refresh} defaultOpen={data.vehicles.length === 1} />)}

              {adding ? (
                <AddVehicleForm onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />
              ) : (
                <button type="button" className="garage-btn" onClick={() => setAdding(true)}>+ Add a car</button>
              )}

              <SettingsCard key={`${data.settings.emailEnabled}-${data.settings.daysBefore}`} data={data} onSaved={refresh} />
            </>
          )}
        </>
      )}
    </main>
  );
}
