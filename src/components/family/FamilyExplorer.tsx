import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildChartData } from "../../lib/chart-data";
import type {
  PublicFamilyPerson,
  PublicFamilyTreeDetail,
} from "../../lib/family-privacy";
import { FamilyListView } from "./FamilyListView";
import { FamilyToolbar, type ExplorerView } from "./FamilyToolbar";
import { FamilyTreeCanvas } from "./FamilyTreeCanvas";
import { PersonDetailPanel } from "./PersonDetailPanel";
import type { FamilyChartApi } from "../../hooks/useFamilyChart";

interface Props {
  detail: PublicFamilyTreeDetail;
  ancestryDepth?: number;
  progenyDepth?: number;
}

const resolveDeepLink = (detail: PublicFamilyTreeDetail): number | null => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("p");
  if (!raw) return null;

  const byKey = detail.people.find(
    (person) => (person.globalKey || "").toLowerCase() === raw.toLowerCase(),
  );
  if (byKey) return byKey.id;

  const id = Number(raw);
  return detail.people.some((person) => person.id === id) ? id : null;
};

export const FamilyExplorer = ({
  detail,
  ancestryDepth,
  progenyDepth,
}: Props) => {
  const chartData = useMemo(() => buildChartData(detail), [detail]);
  const [view, setView] = useState<ExplorerView>("tree");
  const [vertical, setVertical] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(
    detail.tree.defaultMainPersonId ?? detail.people[0]?.id ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const apiRef = useRef<FamilyChartApi | null>(null);
  const sheetReturnFocusRef = useRef<HTMLElement | null>(null);

  const selected = useMemo(
    () => detail.people.find((person) => person.id === selectedId) ?? null,
    [detail, selectedId],
  );

  useEffect(() => {
    const deepLinkId = resolveDeepLink(detail);
    if (deepLinkId !== null) setSelectedId(deepLinkId);
  }, [detail]);

  const syncUrl = (person: PublicFamilyPerson | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (person) url.searchParams.set("p", person.globalKey || String(person.id));
    else url.searchParams.delete("p");
    window.history.replaceState(null, "", url);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    const target = sheetReturnFocusRef.current;
    if (target?.isConnected) target.focus();
    sheetReturnFocusRef.current = null;
  };

  const selectPerson = (id: number, { center = true, openSheet = false } = {}) => {
    setSelectedId(id);
    const person = detail.people.find((candidate) => candidate.id === id) ?? null;
    syncUrl(person);
    if (center) apiRef.current?.setMain(String(id));
    if (openSheet) {
      sheetReturnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setSheetOpen(true);
    }
  };

  if (detail.people.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center pattern rounded-xl text-sm text-gray-500">
        No family members have been added yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FamilyToolbar
        people={detail.people}
        view={view}
        vertical={vertical}
        onSelectPerson={(person) => selectPerson(person.id, { openSheet: true })}
        onViewChange={setView}
        onOrientationChange={(nextVertical) => {
          setVertical(nextVertical);
          apiRef.current?.setOrientation(nextVertical);
        }}
        onZoomIn={() => apiRef.current?.zoomIn()}
        onZoomOut={() => apiRef.current?.zoomOut()}
        onFit={() => apiRef.current?.fit()}
        onResetView={() => apiRef.current?.resetView()}
        onCenterMain={() => apiRef.current?.centerMain()}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
        <div className={view === "tree" ? "h-[65vh] min-h-[420px] lg:h-[580px]" : ""}>
          {view === "tree" ? (
            <FamilyTreeCanvas
              key={detail.tree.slug}
              data={chartData}
              mainId={selectedId !== null ? String(selectedId) : null}
              ancestryDepth={ancestryDepth}
              progenyDepth={progenyDepth}
              onSelect={(id) =>
                selectPerson(Number(id), { center: false, openSheet: true })
              }
              apiRefOut={apiRef}
            />
          ) : (
            <FamilyListView
              detail={detail}
              selectedId={selectedId}
              onSelect={(id) =>
                selectPerson(id, { center: false, openSheet: true })
              }
            />
          )}
        </div>

        <div className="hidden lg:block lg:h-[580px]">
          <PersonDetailPanel
            detail={detail}
            person={selected}
            onSelectPerson={(id) => selectPerson(id)}
          />
        </div>
      </div>

      {sheetOpen && selected && (
        <PersonDetailPanel
          detail={detail}
          person={selected}
          asSheet
          onClose={closeSheet}
          onSelectPerson={(id) => selectPerson(id)}
        />
      )}
    </div>
  );
};
