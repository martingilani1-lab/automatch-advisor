"use client";

// Test UI for POST /api/match-ad: paste a Bazoš / Autobazar / Facebook ad, see
//   1. what the rule-based reader read, and from which words (evidence),
//   2. which catalog model it resolved to,
//   3. the engine match -- confidence + plain-English reason, or the remaining candidates
//      when the ad doesn't say enough -- each linking to that car's Engines tab.
// Uses this route's existing native classes (.results-hdr, .opt-btn, .eng-card, .tg ...).

import { useState } from "react";
import Link from "next/link";

import type { MatchAdResponse } from "@/app/api/match-ad/route";
import type { EngineCandidate, MatchReason } from "@/app/lib/listings/matchAdToEngine";
import type { AdField } from "@/app/lib/listings/adReader";

const EXAMPLES = [
  "Predám Škoda Octavia 3 combi 2.0 TDI 110kW, r.v. 2015, DSG, nafta, STK do 2027, najazdené 210 000 km",
  "Prodám Oktávku 2, 1.9 TDI 77kw, r.v. 2007, manuál",
  "VW Golf 8 2.0 TDI DSG 2021, top stav",
  "Predám Octaviu combi, 2014, benzín, manuál, veľmi pekný stav",
];

const REASON_TEXT: Record<MatchReason, string> = {
  exact: "Power, year and fuel all match exactly one engine.",
  power_unique: "Power matches exactly one engine, but the ad doesn't state the year or fuel.",
  only_option: "No power in the ad, but only one engine fits the fuel, year and gearbox.",
  ambiguous_power: "Several engines have this power in that year/fuel -- the ad doesn't say which.",
  ambiguous_no_power: "No power in the ad and several engines fit -- not enough to decide.",
  no_power_match: "No engine of this model has that power. A typo in the ad, a wrong model, or an engine missing from our catalog.",
  no_candidates: "No engine of this model fits the stated fuel / year / gearbox.",
  model_not_found: "The model wasn't recognised (not in our catalog, or not mentioned).",
};

const FIELDS: { key: AdField; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "generation", label: "Generation" },
  { key: "year", label: "Year" },
  { key: "power_kw", label: "Power" },
  { key: "fuel", label: "Fuel" },
  { key: "transmission", label: "Gearbox" },
  { key: "engine_name", label: "Engine" },
];

function confidenceColor(score: number): string {
  if (score >= 1) return "#6bdb8a";
  if (score > 0) return "#ff9944";
  return "#6b6b72";
}

interface CandidateRowProps {
  c: EngineCandidate;
  phaseLabel: (id: string) => string;
  highlight: boolean;
}

function CandidateRow({ c, phaseLabel, highlight }: CandidateRowProps) {
  return (
    <div className="eng-card" style={{ cursor: "default", borderColor: highlight ? "#6bdb8a" : undefined }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0" }}>{c.label}</div>
      <div className="tg">
        {c.powerKw} kW · {c.fuel} · {c.transmissions.join(" / ")}
        {c.yearFrom ? ` · ${c.yearFrom}–${c.yearTo ?? ""}` : ""}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
        {(c.phaseIds ?? []).map((id) => (
          <Link key={id} href={`/db-test?car=${id}&tab=engines`} className="cfg-link" style={{ fontSize: ".76rem" }}>
            {phaseLabel(id)} →
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdMatchView() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<MatchAdResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(adText: string) {
    if (!adText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: adText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult((await res.json()) as MatchAdResponse);
    } catch (e) {
      setResult(null);
      setError(`Couldn't read the ad (${e instanceof Error ? e.message : "error"}).`);
    } finally {
      setLoading(false);
    }
  }

  const phaseLabel = (id: string) => result?.phases.find((p) => p.id === id)?.label ?? "Open car";
  const ad = result?.read.ad;
  const valueOf = (key: AdField): string | null => {
    if (!ad || !result) return null;
    switch (key) {
      case "generation": return result.read.generationCodes.join(", ") || null;
      case "power_kw": return ad.power_kw != null ? `${ad.power_kw} kW` : null;
      case "year": return ad.year != null ? String(ad.year) : null;
      default: return (ad[key] as string | null) || null;
    }
  };
  const match = result?.match;

  return (
    <main className="w db-test-page">
      <Link href="/db-test" className="restart" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>
        {"←"} Back to DB test
      </Link>
      <div className="results-hdr">
        <h3>Ad matcher</h3>
        <div className="tg">Paste a used-car ad -- we read it and find the exact engine in our catalog. No AI, just rules.</div>
      </div>

      <textarea
        className="opt-btn"
        style={{ cursor: "text", minHeight: 120, resize: "vertical" }}
        placeholder="Predám Škoda Octavia 2.0 TDI 110 kW, r.v. 2015, DSG…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className="opt-btn"
        style={{ textAlign: "center", fontWeight: 700 }}
        disabled={loading || !text.trim()}
        onClick={() => run(text)}
      >
        {loading ? "Reading…" : "Read ad"}
      </button>

      <div className="tg" style={{ margin: "6px 0" }}>Or try an example:</div>
      {EXAMPLES.map((ex) => (
        <button key={ex} type="button" className="opt-btn" style={{ fontSize: ".78rem", color: "#9999aa" }} onClick={() => { setText(ex); run(ex); }}>
          {ex}
        </button>
      ))}

      {error && <p style={{ color: "#ff6b35", marginTop: 12 }}>{error}</p>}

      {result && ad && match && (
        <>
          <div className="sub-label" style={{ marginTop: 20 }}>What we read</div>
          <table className="trim-compare-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Field</th><th>Value</th><th>From the ad</th></tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td style={{ color: valueOf(key) ? "#f0f0f0" : "#6b6b72" }}>{valueOf(key) ?? "not stated"}</td>
                  <td className="tg">{result.read.evidence[key] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.models.length > 1 && (
            <p className="tg">Could be: {result.models.map((m) => `${m.brand} ${m.model}`).join(" or ")} -- year and power decide.</p>
          )}

          <div className="sub-label" style={{ marginTop: 20 }}>Engine match</div>
          <div className="eng-card" style={{ cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="eng-badge"
                style={{ background: confidenceColor(match.confidenceScore) + "22", color: confidenceColor(match.confidenceScore), border: `1px solid ${confidenceColor(match.confidenceScore)}44` }}
              >
                {Math.round(match.confidenceScore * 100)} %
              </span>
              <span style={{ fontWeight: 700, color: "#f0f0f0" }}>
                {match.matchedEngineId ? "Matched" : "No single engine"}
              </span>
            </div>
            <div className="tg" style={{ marginTop: 6 }}>{REASON_TEXT[match.reason]}</div>
          </div>

          {match.candidates.length > 0 && (
            <>
              <div className="tg" style={{ margin: "10px 0 6px" }}>
                {match.matchedEngineId ? "Engine:" : `Possible engines (${match.candidates.length}):`}
              </div>
              {match.candidates.map((c) => (
                <CandidateRow key={c.engineId} c={c} phaseLabel={phaseLabel} highlight={c.engineId === match.matchedEngineId} />
              ))}
            </>
          )}
        </>
      )}
    </main>
  );
}
