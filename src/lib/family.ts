import { ApiClient } from "./api-client";
import { API_BASE_URL } from "./config";
import type {
  CreateFamilyPersonPayload,
  CreateFamilyRelationshipPayload,
  CreateFamilyTreePayload,
  FamilyPerson,
  FamilyRelationship,
  FamilyTree,
  FamilyTreeDetail,
  UpdateFamilyPersonPayload,
  UpdateFamilyTreePayload,
} from "../types/family";

export class FamilyService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  private async publicGet<T>(endpoint: string): Promise<T | null> {
    const cleanedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const response = await fetch(`${this.baseUrl}${cleanedEndpoint}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Public family API error: ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.success) return payload.data as T;
    throw new Error(payload?.error || payload?.message || "Public family API error");
  }

  async getPublicTrees(): Promise<FamilyTree[]> {
    const result = await this.publicGet<FamilyTree[]>("family");
    return result || [];
  }

  async getPublicTreeBySlug(slug: string): Promise<FamilyTreeDetail | null> {
    return this.publicGet<FamilyTreeDetail>(`family/${encodeURIComponent(slug)}`);
  }

  async getAdminTrees(): Promise<FamilyTree[]> {
    const result = await this.get<FamilyTree[]>("owner/family");
    return result || [];
  }

  async getAdminTreeDetailById(id: number): Promise<FamilyTreeDetail | null> {
    return this.get<FamilyTreeDetail>(`owner/family/${id}`);
  }

  async createTree(data: CreateFamilyTreePayload): Promise<FamilyTree | null> {
    return this.post<FamilyTree>("owner/family", data);
  }

  async updateTree(
    id: number,
    data: UpdateFamilyTreePayload,
  ): Promise<FamilyTree | null> {
    return this.put<FamilyTree>(`owner/family/${id}`, data);
  }

  async deleteTree(id: number): Promise<boolean> {
    try {
      await this.delete(`owner/family/${id}`);
      return true;
    } catch (error) {
      console.error("Failed to delete tree:", error);
      return false;
    }
  }

  async createPerson(
    treeId: number,
    data: CreateFamilyPersonPayload,
  ): Promise<FamilyPerson | null> {
    return this.post<FamilyPerson>(`owner/family/${treeId}/people`, data);
  }

  async updatePerson(
    personId: number,
    data: UpdateFamilyPersonPayload,
  ): Promise<FamilyPerson | null> {
    return this.put<FamilyPerson>(`owner/family/people/${personId}`, data);
  }

  async deletePerson(personId: number): Promise<boolean> {
    try {
      await this.delete(`owner/family/people/${personId}`);
      return true;
    } catch (error) {
      console.error("Failed to delete person:", error);
      return false;
    }
  }

  async createRelationship(
    treeId: number,
    data: CreateFamilyRelationshipPayload,
  ): Promise<FamilyRelationship | null> {
    return this.post<FamilyRelationship>(
      `owner/family/${treeId}/relationships`,
      data,
    );
  }
}

export const familyService = new FamilyService();

export const getPublicFamilyTrees = () => familyService.getPublicTrees();
export const getPublicFamilyTreeBySlug = (slug: string) =>
  familyService.getPublicTreeBySlug(slug);
