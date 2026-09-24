import { ApiClient, ApiError } from "./api-client";
import { API_BASE_URL } from "./config";
import type {
  CmsProject,
  AdminProjectDetail,
  ProjectSection,
  ProjectFeature,
  ProjectLink,
  TechStack,
  ProjectTechStack,
  MediaAsset,
  ProjectMedia,
  ProjectCreateInput,
  ProjectUpdateInput,
  SectionInput,
  FeatureInput,
  LinkInput,
  TechStackInput,
  ProjectTechAttachInput,
  MediaAssetInput,
  ProjectMediaAttachInput,
  ProjectMediaUpdateInput,
  ApiErrorData,
} from "../types/project-cms";

/**
 * Owner/admin Project CMS client. Wraps the authenticated ApiClient (httpOnly
 * cookie auth + refresh). All methods hit /owner/* endpoints - never call these
 * from public/unauthenticated contexts.
 */
export class ProjectsCmsService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  // ---- project core ----
  async listProjects(): Promise<CmsProject[]> {
    return (await this.get<CmsProject[]>("owner/projects/all")) ?? [];
  }
  getProjectDetail(id: number): Promise<AdminProjectDetail | null> {
    return this.get<AdminProjectDetail>(`owner/projects/${id}`);
  }
  createProject(data: ProjectCreateInput): Promise<CmsProject | null> {
    return this.post<CmsProject>("owner/projects", data);
  }
  updateProject(id: number, data: ProjectUpdateInput): Promise<CmsProject | null> {
    return this.patch<CmsProject>(`owner/projects/${id}`, data);
  }
  publishProject(id: number): Promise<CmsProject | null> {
    return this.post<CmsProject>(`owner/projects/${id}/publish`, {});
  }
  unpublishProject(id: number): Promise<CmsProject | null> {
    return this.post<CmsProject>(`owner/projects/${id}/unpublish`, {});
  }
  archiveProject(id: number): Promise<CmsProject | null> {
    return this.post<CmsProject>(`owner/projects/${id}/archive`, {});
  }

  // ---- sections ----
  async listSections(projectId: number): Promise<ProjectSection[]> {
    return (await this.get<ProjectSection[]>(`owner/projects/${projectId}/sections`)) ?? [];
  }
  createSection(projectId: number, data: SectionInput): Promise<ProjectSection | null> {
    return this.post<ProjectSection>(`owner/projects/${projectId}/sections`, data);
  }
  updateSection(id: number, data: SectionInput): Promise<ProjectSection | null> {
    return this.patch<ProjectSection>(`owner/project-sections/${id}`, data);
  }
  deleteSection(id: number): Promise<unknown> {
    return this.delete(`owner/project-sections/${id}`);
  }
  reorderSections(projectId: number, orderedIds: number[]): Promise<ProjectSection[] | null> {
    return this.post<ProjectSection[]>(`owner/projects/${projectId}/sections/reorder`, { orderedIds });
  }

  // ---- features ----
  async listFeatures(projectId: number): Promise<ProjectFeature[]> {
    return (await this.get<ProjectFeature[]>(`owner/projects/${projectId}/features`)) ?? [];
  }
  createFeature(projectId: number, data: FeatureInput): Promise<ProjectFeature | null> {
    return this.post<ProjectFeature>(`owner/projects/${projectId}/features`, data);
  }
  updateFeature(id: number, data: FeatureInput): Promise<ProjectFeature | null> {
    return this.patch<ProjectFeature>(`owner/project-features/${id}`, data);
  }
  deleteFeature(id: number): Promise<unknown> {
    return this.delete(`owner/project-features/${id}`);
  }
  reorderFeatures(projectId: number, orderedIds: number[]): Promise<ProjectFeature[] | null> {
    return this.post<ProjectFeature[]>(`owner/projects/${projectId}/features/reorder`, { orderedIds });
  }

  // ---- links ----
  async listLinks(projectId: number): Promise<ProjectLink[]> {
    return (await this.get<ProjectLink[]>(`owner/projects/${projectId}/links`)) ?? [];
  }
  createLink(projectId: number, data: LinkInput): Promise<ProjectLink | null> {
    return this.post<ProjectLink>(`owner/projects/${projectId}/links`, data);
  }
  updateLink(id: number, data: LinkInput): Promise<ProjectLink | null> {
    return this.patch<ProjectLink>(`owner/project-links/${id}`, data);
  }
  deleteLink(id: number): Promise<unknown> {
    return this.delete(`owner/project-links/${id}`);
  }
  reorderLinks(projectId: number, orderedIds: number[]): Promise<ProjectLink[] | null> {
    return this.post<ProjectLink[]>(`owner/projects/${projectId}/links/reorder`, { orderedIds });
  }

  // ---- tech stacks (taxonomy) ----
  async listTechStacks(): Promise<TechStack[]> {
    return (await this.get<TechStack[]>("owner/tech-stacks")) ?? [];
  }
  createTechStack(data: TechStackInput): Promise<TechStack | null> {
    return this.post<TechStack>("owner/tech-stacks", data);
  }
  updateTechStack(id: number, data: TechStackInput): Promise<TechStack | null> {
    return this.patch<TechStack>(`owner/tech-stacks/${id}`, data);
  }
  deleteTechStack(id: number): Promise<unknown> {
    return this.delete(`owner/tech-stacks/${id}`);
  }

  // ---- project tech attach ----
  async listProjectTech(projectId: number): Promise<ProjectTechStack[]> {
    return (await this.get<ProjectTechStack[]>(`owner/projects/${projectId}/tech-stacks`)) ?? [];
  }
  attachTech(projectId: number, data: ProjectTechAttachInput): Promise<ProjectTechStack | null> {
    return this.post<ProjectTechStack>(`owner/projects/${projectId}/tech-stacks`, data);
  }
  updateProjectTech(id: number, data: { isPrimary?: boolean; sortOrder?: number }): Promise<ProjectTechStack | null> {
    return this.patch<ProjectTechStack>(`owner/project-tech-stacks/${id}`, data);
  }
  detachTech(id: number): Promise<unknown> {
    return this.delete(`owner/project-tech-stacks/${id}`);
  }
  reorderProjectTech(projectId: number, orderedIds: number[]): Promise<ProjectTechStack[] | null> {
    return this.post<ProjectTechStack[]>(`owner/projects/${projectId}/tech-stacks/reorder`, { orderedIds });
  }

  // ---- media assets (library) ----
  async listMediaAssets(): Promise<MediaAsset[]> {
    return (await this.get<MediaAsset[]>("owner/media-assets")) ?? [];
  }
  createMediaAsset(data: MediaAssetInput): Promise<MediaAsset | null> {
    return this.post<MediaAsset>("owner/media-assets", data);
  }
  updateMediaAsset(id: number, data: MediaAssetInput): Promise<MediaAsset | null> {
    return this.patch<MediaAsset>(`owner/media-assets/${id}`, data);
  }
  deleteMediaAsset(id: number): Promise<unknown> {
    return this.delete(`owner/media-assets/${id}`);
  }

  // ---- project media (carousel) ----
  async listProjectMedia(projectId: number): Promise<ProjectMedia[]> {
    return (await this.get<ProjectMedia[]>(`owner/projects/${projectId}/media`)) ?? [];
  }
  attachMedia(projectId: number, data: ProjectMediaAttachInput): Promise<ProjectMedia | null> {
    return this.post<ProjectMedia>(`owner/projects/${projectId}/media`, data);
  }
  updateProjectMedia(id: number, data: ProjectMediaUpdateInput): Promise<ProjectMedia | null> {
    return this.patch<ProjectMedia>(`owner/project-media/${id}`, data);
  }
  deleteProjectMedia(id: number): Promise<unknown> {
    return this.delete(`owner/project-media/${id}`);
  }
  reorderProjectMedia(projectId: number, orderedIds: number[]): Promise<ProjectMedia[] | null> {
    return this.post<ProjectMedia[]>(`owner/projects/${projectId}/media/reorder`, { orderedIds });
  }
}

export const cmsService = new ProjectsCmsService();

/** Normalize any thrown error into a user-facing message + optional field. */
export function extractApiError(err: unknown): { message: string; field?: string; status?: number } {
  if (err instanceof ApiError) {
    const data = (err.data ?? {}) as ApiErrorData;
    return { message: data.error || data.message || err.message, field: data.field, status: err.status };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Something went wrong" };
}
