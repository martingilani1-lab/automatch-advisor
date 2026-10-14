interface GapsToggleLinkProps {
  gapsMode: boolean;
}

// Toggling gaps mode is just a navigation (?gaps=1 on/off) -- a plain anchor, no client JS
// needed, consistent with "data fetched server-side" being the whole point of this page.
export default function GapsToggleLink({ gapsMode }: GapsToggleLinkProps) {
  return (
    <a
      href={gapsMode ? "?" : "?gaps=1"}
      className="shrink-0 rounded-md border border-white/5 px-3 py-1.5 text-sm text-secondary transition-colors hover:text-primary hover:border-zinc-700"
    >
      {gapsMode ? "Hide gaps" : "Show gaps"}
    </a>
  );
}
