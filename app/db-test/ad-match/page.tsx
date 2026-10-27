import AdMatchView from "./AdMatchView";

// /db-test/ad-match -- test page for the rule-based classified-ad reader + engine matcher
// (POST /api/match-ad). Paste an ad, see what was read and which engine it resolves to.
export default function AdMatchPage() {
  return <AdMatchView />;
}
