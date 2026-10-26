"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PhaseBundle } from "../lib/types";
import type { SafetyFeature } from "@/app/prehlad/types";
import CatalogHeader from "./CatalogHeader";
import KeyFacts from "./KeyFacts";
import BodyDimensionsTabs from "./BodyDimensionsTabs";
import MediaGallery from "./MediaGallery";
import EngineList from "./EngineList";
import GearboxList from "./GearboxList";
import TrimsList from "./TrimsList";
import PhaseSwitcher from "./PhaseSwitcher";
import ConfigurationsTable, { type ConfigNavTarget } from "./ConfigurationsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface VehiclePageClientProps {
  // Every phase of this generation, each a FULL bundle -- loaded in one server fetch (see
  // getGenerationBundles in lib/db.ts) so switching phases below is pure client state, no
  // refetch, no full page reload.
  phases: PhaseBundle[];
  // The phase this route's own [phase] URL segment names -- the default selection, and the
  // fallback if ?phase= in the URL doesn't (or no longer) match any sibling.
  routePhaseId: string;
  gapsMode: boolean;
  // Static safety_features reference vocabulary (lib/db.ts's getSafetyFeatures) -- threaded
  // down to TrimsList/TrimCards so a trim feature with a safetyFeatureSlug can show its real
  // name/what_it_does as a title, not just the raw feature text.
  safetyFeatures: SafetyFeature[];
}

const TAB_IDS = ["configurations", "overview", "engines", "gearboxes", "trims"] as const;
type TabId = (typeof TAB_IDS)[number];
function isTabId(v: string | null): v is TabId {
  return !!v && (TAB_IDS as readonly string[]).includes(v);
}

// Vehicle page redesign step 1: a phase switcher above the tab bar (own generation's sibling
// phases, e.g. Pre-facelift/Facelift) and a new Configurations tab whose rows deep-link into
// the Engines/Gearboxes tabs. All state (selected phase, active tab, which engine/gearbox/
// drivetrain to focus) lives in the URL (?phase=&tab=&engine=/&unit=/&drivetrain=) via
// router.replace -- so a refresh or a shared link reproduces the exact same view, and the
// back button works, without ever triggering a server refetch (every phase's data is
// already sitting in `phases`, passed down from the server component).
export default function VehiclePageClient({ phases, routePhaseId, gapsMode, safetyFeatures }: VehiclePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const phaseParam = searchParams.get("phase");
  const selectedPhaseId = phases.some((p) => p.phaseId === phaseParam) ? phaseParam! : routePhaseId;
  const bundle = phases.find((p) => p.phaseId === selectedPhaseId) ?? phases[0];

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = isTabId(tabParam) ? tabParam : "overview";

  const focusEngine = searchParams.get("engine");
  const focusUnit = searchParams.get("unit");
  const focusDrivetrain = searchParams.get("drivetrain");

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handlePhaseSelect(id: string) {
    if (id === selectedPhaseId) return;
    updateParams((p) => {
      p.set("phase", id);
      p.delete("engine");
      p.delete("unit");
      p.delete("drivetrain");
    });
  }

  function handleTabChange(tab: string) {
    updateParams((p) => { p.set("tab", tab); });
  }

  function handleConfigNavigate(target: ConfigNavTarget) {
    updateParams((p) => {
      p.set("tab", target.kind === "engine" ? "engines" : "gearboxes");
      p.delete("engine");
      p.delete("unit");
      p.delete("drivetrain");
      p.set(target.kind, target.id);
    });
  }

  // Scrolls the focused widget into view and briefly highlights it once its tab is actually
  // showing -- Radix's Tabs.Content unmounts an inactive tab's children by default (no
  // forceMount), so the target element genuinely doesn't exist until `activeTab` updates and
  // this effect re-runs after the next commit.
  useEffect(() => {
    const focusId = focusEngine
      ? `engine-${focusEngine}`
      : focusUnit
        ? `gearbox-${focusUnit}`
        : focusDrivetrain
          ? `drivetrain-${focusDrivetrain}`
          : null;
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("catalog-highlight");
    const t = setTimeout(() => el.classList.remove("catalog-highlight"), 1500);
    return () => clearTimeout(t);
  }, [activeTab, selectedPhaseId, focusEngine, focusUnit, focusDrivetrain]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <CatalogHeader bundle={bundle} gapsMode={gapsMode} />
      <PhaseSwitcher
        phases={phases.map((p) => ({ id: p.phaseId, phaseLabel: p.phaseLabel, yearFrom: p.yearFrom, yearTo: p.yearTo }))}
        selectedId={selectedPhaseId}
        onSelect={handlePhaseSelect}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engines">Engines</TabsTrigger>
          <TabsTrigger value="gearboxes">Gearboxes</TabsTrigger>
          <TabsTrigger value="trims">Trims</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations">
          <ConfigurationsTable configs={bundle.configs} onNavigate={handleConfigNavigate} />
        </TabsContent>

        <TabsContent value="overview" className="flex flex-col gap-10">
          <KeyFacts bundle={bundle} gapsMode={gapsMode} />
          <BodyDimensionsTabs bodies={bundle.bodyDimensions} gapsMode={gapsMode} />
          <MediaGallery
            bodies={bundle.bodyDimensions.map((d) => ({ bodyTypeId: d.bodyTypeId, bodyName: d.bodyName }))}
            media={bundle.media}
            gapsMode={gapsMode}
          />
        </TabsContent>

        <TabsContent value="engines">
          <EngineList configs={bundle.configs} faults={bundle.faults} gapsMode={gapsMode} />
        </TabsContent>

        <TabsContent value="gearboxes">
          <GearboxList configs={bundle.configs} faults={bundle.faults} gapsMode={gapsMode} />
        </TabsContent>

        <TabsContent value="trims">
          <TrimsList trims={bundle.trims} gapsMode={gapsMode} safetyFeatures={safetyFeatures} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
