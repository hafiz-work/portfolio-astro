import React from "react";
import type { PublicFamilyTreeDetail } from "../../lib/family-privacy";
import { displayYear } from "../../lib/family-format";
import { buildRelationCounts } from "../../lib/family-relationships";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

interface Props {
  detail: PublicFamilyTreeDetail;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export const FamilyListView = ({ detail, selectedId, onSelect }: Props) => {
  const relationshipCount = buildRelationCounts(detail);

  const people = [...detail.people].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );

  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label="Family members list">
      {people.map((person) => (
        <li key={person.id}>
          <button
            type="button"
            onClick={() => onSelect(person.id)}
            aria-current={selectedId === person.id ? "true" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              selectedId === person.id
                ? "border-sky-500/60 bg-sky-500/5 dark:bg-sky-400/10"
                : "border-gray-950/10 bg-white hover:border-gray-950/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"
            }`}
          >
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300"
              >
                {initials(person.displayName)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {person.displayName}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {person.birthDate
                  ? `b. ${displayYear(person.birthDate)}`
                  : "Birth year unknown"}
                {!person.isLiving ? " · deceased" : ""}
                {` · ${relationshipCount.get(person.id) ?? 0} relations`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
