import type { FamilyGender, FamilyRelationshipType } from "../types/family";
import type {
  PublicFamilyPerson,
  PublicFamilyTreeDetail,
} from "./family-privacy";

/**
 * Pure, framework-independent helpers for deriving a person's relationships into
 * clean, de-duplicated groups for the public detail panel.
 *
 * Why this exists: relationship rows in D1 are stored *directionally and often
 * reciprocally* - e.g. both `A spouse B` and `B spouse A`, and both
 * `parent (A→child)` and `child (child→A)`. Listing raw rows therefore doubles
 * spouses and mislabels parent/child by direction. These helpers collapse rows
 * into directionless, gender-aware groups, de-duplicating each related person.
 *
 * Relationship-type semantics (matches the D1 schema and chart-data transform):
 *  - `parent` / `adoptive_parent`:  personId is the PARENT of relatedPersonId.
 *  - `child`  / `adopted_child`:    personId is the CHILD  of relatedPersonId.
 *  - `spouse` / `sibling`:          bidirectional.
 */

export type RelationGroupKey =
  | "father"
  | "mother"
  | "parent"
  | "spouse"
  | "son"
  | "daughter"
  | "child"
  | "brother"
  | "sister"
  | "sibling";

export interface RelatedPerson {
  id: number;
  displayName: string;
  globalKey: string | null;
  gender: FamilyGender;
}

export interface RelationshipGroup {
  key: RelationGroupKey;
  label: string;
  people: RelatedPerson[];
}

const PARENT_TYPES: ReadonlySet<FamilyRelationshipType> = new Set([
  "parent",
  "adoptive_parent",
]);
const CHILD_TYPES: ReadonlySet<FamilyRelationshipType> = new Set([
  "child",
  "adopted_child",
]);

/**
 * Stable identity key for de-duplication, preferring:
 *   1. globalKey  2. person id  3. normalized displayName (last resort only).
 * Because a person id is always present, the name fallback is effectively never
 * reached - so this never merges two distinct same-named people.
 */
export const getRelationKey = (person: {
  globalKey?: string | null;
  id: number;
  displayName: string;
}): string => {
  const globalKey = (person.globalKey || "").trim().toLowerCase();
  if (globalKey) return `gk:${globalKey}`;
  if (Number.isFinite(person.id)) return `id:${person.id}`;
  return `name:${person.displayName.trim().toLowerCase().replace(/\s+/g, " ")}`;
};

/** Remove duplicate related people (globalKey → id → name), preserving order. */
export const dedupeRelatedPeople = (people: RelatedPerson[]): RelatedPerson[] => {
  const seen = new Set<string>();
  const out: RelatedPerson[] = [];
  for (const person of people) {
    const key = getRelationKey(person);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(person);
  }
  return out;
};

/**
 * Distinct related-person count per person id. Reciprocal rows (A↔B) collapse to
 * a single relation, so the count reflects how many *people* are related, not how
 * many raw rows exist.
 */
export const buildRelationCounts = (
  detail: PublicFamilyTreeDetail,
): Map<number, number> => {
  const relatedByPerson = new Map<number, Set<number>>();
  const add = (a: number, b: number) => {
    if (a === b) return;
    let set = relatedByPerson.get(a);
    if (!set) {
      set = new Set();
      relatedByPerson.set(a, set);
    }
    set.add(b);
  };
  for (const rel of detail.relationships) {
    add(rel.personId, rel.relatedPersonId);
    add(rel.relatedPersonId, rel.personId);
  }
  const counts = new Map<number, number>();
  for (const [id, set] of relatedByPerson) counts.set(id, set.size);
  return counts;
};

/**
 * Derive a person's relationships into ordered, de-duplicated groups:
 * Father, Mother, Spouse, Son, Daughter, Brother, Sister
 * (with generic Parent / Child / Sibling fallbacks for unknown-gender relatives).
 * Empty groups are omitted.
 */
export const getPersonRelationshipGroups = (
  detail: PublicFamilyTreeDetail,
  person: PublicFamilyPerson,
): RelationshipGroup[] => {
  const selfId = person.id;
  const peopleById = new Map(detail.people.map((p) => [p.id, p]));

  const parentIds = new Set<number>();
  const childIds = new Set<number>();
  const spouseIds = new Set<number>();
  const siblingIds = new Set<number>();

  // childId -> parentIds, used to derive siblings from shared parents.
  const parentsByChild = new Map<number, Set<number>>();
  const addParentEdge = (childId: number, parentId: number) => {
    if (childId === parentId) return;
    let set = parentsByChild.get(childId);
    if (!set) {
      set = new Set();
      parentsByChild.set(childId, set);
    }
    set.add(parentId);
  };

  for (const rel of detail.relationships) {
    const a = rel.personId;
    const b = rel.relatedPersonId;
    const type = rel.relationshipType;

    if (PARENT_TYPES.has(type)) {
      addParentEdge(b, a); // a parent of b
      if (b === selfId && a !== selfId) parentIds.add(a);
      if (a === selfId && b !== selfId) childIds.add(b);
    } else if (CHILD_TYPES.has(type)) {
      addParentEdge(a, b); // a child of b
      if (a === selfId && b !== selfId) parentIds.add(b);
      if (b === selfId && a !== selfId) childIds.add(a);
    } else if (type === "spouse") {
      if (a === selfId && b !== selfId) spouseIds.add(b);
      if (b === selfId && a !== selfId) spouseIds.add(a);
    } else if (type === "sibling") {
      if (a === selfId && b !== selfId) siblingIds.add(b);
      if (b === selfId && a !== selfId) siblingIds.add(a);
    }
  }

  // Siblings derived from at least one shared parent.
  const selfParents = parentsByChild.get(selfId);
  if (selfParents && selfParents.size > 0) {
    for (const [childId, parents] of parentsByChild) {
      if (childId === selfId) continue;
      for (const parentId of selfParents) {
        if (parents.has(parentId)) {
          siblingIds.add(childId);
          break;
        }
      }
    }
  }

  // A spouse/parent/child must not also appear under siblings.
  for (const id of spouseIds) siblingIds.delete(id);
  for (const id of parentIds) siblingIds.delete(id);
  for (const id of childIds) siblingIds.delete(id);

  const toRelated = (id: number): RelatedPerson | null => {
    const p = peopleById.get(id);
    if (!p) return null;
    return {
      id: p.id,
      displayName: p.displayName,
      globalKey: p.globalKey ?? null,
      gender: p.gender,
    };
  };
  const resolve = (ids: Set<number>): RelatedPerson[] =>
    Array.from(ids, toRelated).filter((p): p is RelatedPerson => p !== null);

  const parents = resolve(parentIds);
  const children = resolve(childIds);
  const spouses = resolve(spouseIds);
  const siblings = resolve(siblingIds);

  const male = (people: RelatedPerson[]) =>
    people.filter((p) => p.gender === "male");
  const female = (people: RelatedPerson[]) =>
    people.filter((p) => p.gender === "female");
  const other = (people: RelatedPerson[]) =>
    people.filter((p) => p.gender !== "male" && p.gender !== "female");

  const groups: RelationshipGroup[] = [
    { key: "father", label: "Father", people: male(parents) },
    { key: "mother", label: "Mother", people: female(parents) },
    { key: "spouse", label: "Spouse", people: spouses },
    { key: "son", label: "Son", people: male(children) },
    { key: "daughter", label: "Daughter", people: female(children) },
    { key: "brother", label: "Brother", people: male(siblings) },
    { key: "sister", label: "Sister", people: female(siblings) },
    // Generic fallbacks for unknown/other-gender relatives.
    { key: "parent", label: "Parent", people: other(parents) },
    { key: "child", label: "Child", people: other(children) },
    { key: "sibling", label: "Sibling", people: other(siblings) },
  ];

  return groups
    .map((group) => ({
      ...group,
      people: dedupeRelatedPeople(group.people).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    }))
    .filter((group) => group.people.length > 0);
};
