export type FamilyRelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "adoptive_parent"
  | "adopted_child";

export type FamilyGender = "male" | "female" | "other" | "unknown";

export interface FamilyTree {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdByUserId: number | null;
  defaultMainPersonId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyPerson {
  id: number;
  treeId: number;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  globalKey?: string | null;
  gender: FamilyGender;
  birthDate: string | null;
  deathDate: string | null;
  isLiving: boolean;
  photoUrl: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyRelationship {
  id: number;
  treeId: number;
  personId: number;
  relatedPersonId: number;
  relationshipType: FamilyRelationshipType;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTreeDetail {
  tree: FamilyTree;
  people: FamilyPerson[];
  relationships: FamilyRelationship[];
}

export interface CreateFamilyTreePayload {
  slug: string;
  name: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface UpdateFamilyTreePayload
  extends Partial<CreateFamilyTreePayload> {
  defaultMainPersonId?: number | null;
}

export interface CreateFamilyPersonPayload {
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  gender?: FamilyGender;
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving?: boolean;
  photoUrl?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateFamilyPersonPayload
  extends Partial<CreateFamilyPersonPayload> { }

export interface CreateFamilyRelationshipPayload {
  personId: number;
  relatedPersonId: number;
  relationshipType: FamilyRelationshipType;
  isPrimary?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

