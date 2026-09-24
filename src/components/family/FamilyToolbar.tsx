import React from "react";
import type { PublicFamilyPerson } from "../../lib/family-privacy";
import { PersonSearch } from "./PersonSearch";

export type ExplorerView = "tree" | "list";

interface Props {
  people: PublicFamilyPerson[];
  view: ExplorerView;
  vertical: boolean;
  onSelectPerson: (person: PublicFamilyPerson) => void;
  onViewChange: (view: ExplorerView) => void;
  onOrientationChange: (vertical: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onResetView: () => void;
  onCenterMain: () => void;
}

const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 ring-1 ring-gray-950/10 ring-inset hover:bg-gray-950/5 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:text-gray-300 dark:ring-white/15 dark:hover:bg-white/10 dark:hover:text-white";

const segmentedButtonClass = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm/6 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
    active
      ? "bg-white text-gray-950 ring-1 ring-gray-950/10 dark:bg-gray-700 dark:text-white dark:ring-transparent"
      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
  }`;

export const FamilyToolbar = ({
  people,
  view,
  vertical,
  onSelectPerson,
  onViewChange,
  onOrientationChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onResetView,
  onCenterMain,
}: Props) => {
  const treeMode = view === "tree";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 outline outline-gray-950/5 dark:bg-white/[0.03] dark:outline-white/10">
      <PersonSearch people={people} onSelect={onSelectPerson} />

      <div
        role="group"
        aria-label="View mode"
        className="flex rounded-full bg-gray-950/5 p-0.75 dark:bg-white/10"
      >
        <button
          type="button"
          className={segmentedButtonClass(treeMode)}
          aria-pressed={treeMode}
          onClick={() => onViewChange("tree")}
        >
          Tree
        </button>
        <button
          type="button"
          className={segmentedButtonClass(!treeMode)}
          aria-pressed={!treeMode}
          onClick={() => onViewChange("list")}
        >
          List
        </button>
      </div>

      <div
        role="group"
        aria-label="Tree controls"
        className="ml-auto flex items-center gap-1.5"
      >
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Toggle tree orientation"
          disabled={!treeMode}
          onClick={() => onOrientationChange(!vertical)}
          title={vertical ? "Switch to horizontal" : "Switch to vertical"}
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${vertical ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m-6-6l6 6 6-6"
            />
          </svg>
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Zoom out"
          disabled={!treeMode}
          onClick={onZoomOut}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeWidth="2" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Zoom in"
          disabled={!treeMode}
          onClick={onZoomIn}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeWidth="2"
              d="M12 5v14M5 12h14"
            />
          </svg>
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Fit tree to view"
          disabled={!treeMode}
          onClick={onFit}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3m-8 0H5a1 1 0 01-1-1v-3"
            />
          </svg>
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Reset tree view"
          disabled={!treeMode}
          onClick={onResetView}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5"
            />
          </svg>
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Center on selected person"
          disabled={!treeMode}
          onClick={onCenterMain}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
            <path
              strokeLinecap="round"
              strokeWidth="2"
              d="M12 2v4m0 12v4M2 12h4m12 0h4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
