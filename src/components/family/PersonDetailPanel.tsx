import React, { useEffect, useMemo, useRef } from "react";
import type {
  PublicFamilyPerson,
  PublicFamilyTreeDetail,
} from "../../lib/family-privacy";
import { displayYear } from "../../lib/family-format";
import {
  getPersonRelationshipGroups,
  getRelationKey,
} from "../../lib/family-relationships";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

const formatDate = (iso: string | null, yearOnly: boolean) => {
  if (!iso) return "-";
  if (yearOnly) return displayYear(iso) ?? iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface Props {
  detail: PublicFamilyTreeDetail;
  person: PublicFamilyPerson | null;
  onSelectPerson: (id: number) => void;
  onClose?: () => void;
  asSheet?: boolean;
}

export const PersonDetailPanel = ({
  detail,
  person,
  onSelectPerson,
  onClose,
  asSheet,
}: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asSheet && person) closeRef.current?.focus();
  }, [asSheet, person]);

  useEffect(() => {
    if (!asSheet || !person) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asSheet, person, onClose]);

  const relationshipGroups = useMemo(
    () => (person ? getPersonRelationshipGroups(detail, person) : []),
    [detail, person],
  );

  if (!person) {
    return (
      <div className="flex h-full items-center justify-center pattern rounded-xl p-5 text-center text-sm text-gray-500">
        Select a person in the tree to see their details
      </div>
    );
  }

  const body = (
    <>
      <div className="flex items-center gap-3">
        {person.photoUrl ? (
          <img
            src={person.photoUrl}
            alt={person.displayName}
            width={56}
            height={56}
            loading="lazy"
            className="h-14 w-14 rounded-full border border-gray-200 object-cover dark:border-gray-600"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 font-semibold text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
          >
            {initials(person.displayName)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {person.displayName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {person.isLiving ? "Living" : "Deceased"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Born</dt>
          <dd className="text-gray-800 dark:text-gray-200">
            {formatDate(person.birthDate, person.isLiving)}
          </dd>
        </div>
        {!person.isLiving && (
          <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">Died</dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {formatDate(person.deathDate, false)}
            </dd>
          </div>
        )}
      </dl>

      {relationshipGroups.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Relationships
          </p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {relationshipGroups.map((group) => (
                <tr key={group.key} className="align-top">
                  <th
                    scope="row"
                    className="w-24 py-1 pr-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500"
                  >
                    {group.label}
                  </th>
                  <td className="py-1">
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {group.people.map((related) => (
                        <button
                          key={getRelationKey(related)}
                          type="button"
                          onClick={() => onSelectPerson(related.id)}
                          className="-mx-1 rounded px-1 text-left text-sky-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-400 dark:hover:bg-white/5"
                        >
                          {related.displayName}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (asSheet) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${person.displayName}`}
        className="fixed inset-0 z-40 lg:hidden"
      >
        <button
          aria-label="Close details"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[70vh] space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 ring-1 ring-gray-950/10 motion-safe:transition-transform dark:bg-gray-900 dark:ring-white/10">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:text-gray-200"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto rounded-xl bg-white p-5 outline outline-gray-950/5 dark:bg-white/[0.03] dark:outline-white/10">
      {body}
    </div>
  );
};
