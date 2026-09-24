import React, { useId, useMemo, useRef, useState } from "react";
import type { PublicFamilyPerson } from "../../lib/family-privacy";
import { displayYear } from "../../lib/family-format";

interface Props {
  people: PublicFamilyPerson[];
  onSelect: (person: PublicFamilyPerson) => void;
}

export const PersonSearch = ({ people, onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return people
      .filter((person) =>
        person.displayName.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [people, query]);

  const pick = (person: PublicFamilyPerson) => {
    onSelect(person);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full sm:w-64">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -trangray-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={
          open && matches[active] ? `${listId}-${matches[active].id}` : undefined
        }
        aria-label="Search family members"
        placeholder="Search person..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (matches.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, matches.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && matches[active]) {
            event.preventDefault();
            pick(matches[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full rounded-full bg-white py-1.5 pl-9 pr-3 text-sm/6 text-gray-950 outline-1 -outline-offset-1 outline-gray-950/10 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-sky-500 dark:bg-white/5 dark:text-white dark:outline-white/15"
      />
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-950/10 dark:bg-gray-900 dark:ring-white/10"
        >
          {matches.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${person.id}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(person);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === active
                  ? "bg-gray-950/5 text-gray-950 dark:bg-white/10 dark:text-white"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {person.displayName}
              {person.birthDate && (
                <span className="ml-2 text-xs text-gray-400">
                  b. {displayYear(person.birthDate)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
