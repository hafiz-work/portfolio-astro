import type { Data } from "family-chart";
import type { PublicFamilyTreeDetail } from "./family-privacy";
import type { FamilyTreeDetail } from "../types/family";
import { escapeText } from "entities";
import { displayYear } from "./family-format";

// family-chart writes card text and <img src> into innerHTML unescaped, so
// card rows go through these and avatars must be a parsed https URL
// (URL.href percent-encodes quotes and angle brackets).
export const cardText =
  (...keys: string[]) =>
  (d: { data: Record<string, unknown> }) =>
    escapeText(keys.map((key) => d.data[key] ?? "").join(" ").trim());

export const safeImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};

export const mapGender = (gender: string): "M" | "F" =>
  gender === "female" ? "F" : "M";

export const splitDisplayName = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: displayName.trim(), lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export const buildChartData = (
  detail: FamilyTreeDetail | PublicFamilyTreeDetail,
): Data => {
  const personMap = new Map(
    detail.people.map((person) => [
      String(person.id),
      {
        id: String(person.id),
        data: {
          label: person.displayName,
          global_key: person.globalKey || undefined,
          metadata: "metadata" in person ? person.metadata || null : null,
          "first name": (
            ("firstName" in person ? person.firstName : null) ||
            splitDisplayName(person.displayName).firstName ||
            person.displayName
          ).trim(),
          "last name": (
            ("lastName" in person ? person.lastName : null) ||
            splitDisplayName(person.displayName).lastName ||
            ""
          ).trim(),
          name: person.displayName,
          birthday: displayYear(person.birthDate) ?? undefined,
          death: displayYear(person.deathDate) ?? undefined,
          status: person.isLiving ? "Living" : "Deceased",
          living: person.isLiving,
          avatar: safeImageUrl(person.photoUrl),
          gender: mapGender(person.gender),
          original_gender: person.gender,
        },
        rels: {
          parents: [] as string[],
          spouses: [] as string[],
          children: [] as string[],
        },
      },
    ]),
  );

  for (const relationship of detail.relationships) {
    const from = personMap.get(String(relationship.personId));
    const to = personMap.get(String(relationship.relatedPersonId));
    if (!from || !to) continue;

    if (relationship.relationshipType === "spouse") {
      from.rels.spouses.push(to.id);
      to.rels.spouses.push(from.id);
      continue;
    }

    if (
      relationship.relationshipType === "parent" ||
      relationship.relationshipType === "adoptive_parent"
    ) {
      from.rels.children.push(to.id);
      to.rels.parents.push(from.id);
      continue;
    }

    if (
      relationship.relationshipType === "child" ||
      relationship.relationshipType === "adopted_child"
    ) {
      from.rels.parents.push(to.id);
      to.rels.children.push(from.id);
    }
  }

  for (const person of personMap.values()) {
    person.rels.parents = [...new Set(person.rels.parents)];
    person.rels.spouses = [...new Set(person.rels.spouses)];
    person.rels.children = [...new Set(person.rels.children)];
  }

  return Array.from(personMap.values());
};
