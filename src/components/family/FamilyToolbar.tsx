import React from "react";
import type { PublicFamilyPerson } from "../../lib/family-privacy";
import { PersonSearch } from "./PersonSearch";
import { ArrowDown, Locate, Maximize, Minus, Plus, RefreshCw } from "lucide-react";

interface Props {
  people: PublicFamilyPerson[];
  vertical: boolean;
  onSelectPerson: (person: PublicFamilyPerson) => void;
  onOrientationChange: (vertical: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onResetView: () => void;
  onCenterMain: () => void;
}

const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 ring-1 ring-gray-950/10 ring-inset hover:bg-gray-950/5 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:text-gray-300 dark:ring-white/15 dark:hover:bg-white/10 dark:hover:text-white";

export const FamilyToolbar = ({
  people,
  vertical,
  onSelectPerson,
  onOrientationChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onResetView,
  onCenterMain,
}: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 outline outline-gray-950/5 dark:bg-white/[0.03] dark:outline-white/10">
      <PersonSearch people={people} onSelect={onSelectPerson} />

      <div
        role="group"
        aria-label="Tree controls"
        className="ml-auto flex items-center gap-1.5"
      >
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Toggle tree orientation"
          onClick={() => onOrientationChange(!vertical)}
          title={vertical ? "Switch to horizontal" : "Switch to vertical"}
        >
          <ArrowDown aria-hidden="true" className={`h-4 w-4 transition-transform ${vertical ? "" : "rotate-90"}`} />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Fit tree to view"
          onClick={onFit}
        >
          <Maximize aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Reset tree view"
          onClick={onResetView}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Center on selected person"
          onClick={onCenterMain}
        >
          <Locate aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
