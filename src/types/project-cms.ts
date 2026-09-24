// Frontend types mirroring the hono-workers project CMS DTOs.
// Single source for admin CMS shapes - do not redefine these ad hoc in components.

export type ProjectType = "personal" | "business" | "work";
export type ImageVariant = "banner" | "logo" | "width-banner";
export type ProjectStatus =
  | "completed"
  | "in-progress"
  | "maintained"
  | "draft"
  | "published"
  | "archived";

export type MediaType =
  | "screenshot"
  | "video"
  | "architecture_diagram"
  | "logo"
  | "cover"
  | "og"
  | "other";
export type DeviceFrame = "phone" | "tablet" | "desktop" | "browser" | "none";
export type TechCategory =
  | "backend"
  | "mobile"
  | "database"
  | "web"
  | "infra"
  | "language"
  | "tooling";
export type ProjectLinkType =
  | "source"
  | "demo"
  | "app_store"
  | "play_store"
  | "case_study"
  | "contact"
  | "private"
  | "other";
export type ProjectLinkStatus = "active" | "hidden" | "disabled";

export type WarningSeverity = "warn" | "error";
export interface ProjectWarning {
  code: string;
  message: string;
  severity: WarningSeverity;
}

/** Admin/owner base project (GET /owner/projects/all rows). */
export interface CmsProject {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  imageVariant?: ImageVariant | null;
  technologies: string[];
  githubUrl: string;
  liveUrl: string;
  year: number;
  role: string;
  projectType: ProjectType;
  features?: string[] | null;
  tags?: string[] | null;
  status?: ProjectStatus | null;
  featured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;

  subtitle?: string | null;
  summary?: string | null;
  projectScope?: string | null;
  clientName?: string | null;
  problem?: string | null;
  solution?: string | null;
  contribution?: string | null;
  architectureNotes?: string | null;
  resultSummary?: string | null;
  fullDescription?: string | null;
  isPublic?: boolean;
  isConfidential?: boolean;
  featuredOrder?: number;
  sortOrder?: number;
  coverImageId?: number | null;
  logoImageId?: number | null;
  ogImageId?: number | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface MediaAsset {
  id: number;
  filename: string;
  originalFilename?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  altText?: string | null;
  caption?: string | null;
  storageKey?: string | null;
  blurhash?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMedia {
  id: number;
  projectId: number;
  mediaAssetId: number;
  mediaType: MediaType;
  title?: string | null;
  caption?: string | null;
  deviceFrame: DeviceFrame;
  sortOrder: number;
  isFeatured: boolean;
  isVisible: boolean;
  asset?: MediaAsset;
}

export interface ProjectSection {
  id: number;
  projectId: number;
  sectionType: string;
  title?: string | null;
  body?: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface ProjectFeature {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface TechStack {
  id: number;
  name: string;
  category?: TechCategory | string | null;
  proficiency?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTechStack {
  id: number;
  projectId: number;
  techStackId: number;
  sortOrder: number;
  isPrimary: boolean;
  tech?: TechStack;
}

export interface ProjectLink {
  id: number;
  projectId: number;
  label: string;
  url: string;
  linkType: ProjectLinkType;
  isPublic: boolean;
  sortOrder: number;
  status: ProjectLinkStatus;
  createdAt: string;
  updatedAt: string;
}

/** GET /owner/projects/:id - composed detail + completeness warnings. */
export interface AdminProjectDetail extends CmsProject {
  media: ProjectMedia[];
  sections: ProjectSection[];
  featureList: ProjectFeature[];
  techStacks: ProjectTechStack[];
  links: ProjectLink[];
  cover?: MediaAsset | null;
  ogImage?: MediaAsset | null;
  warnings: ProjectWarning[];
}

// ---- write payloads ----
export interface ProjectCreateInput {
  title: string;
  slug: string;
  description: string;
  projectType: ProjectType;
  subtitle?: string | null;
  summary?: string | null;
  projectScope?: string | null;
  clientName?: string | null;
  year?: number;
  role?: string;
  imageUrl?: string;
  imageVariant?: ImageVariant | null;
  status?: ProjectStatus;
  isPublic?: boolean;
  isConfidential?: boolean;
  featured?: boolean;
  featuredOrder?: number;
  displayOrder?: number;
  technologies?: string[];
}
export type ProjectUpdateInput = Partial<ProjectCreateInput> & {
  problem?: string | null;
  solution?: string | null;
  contribution?: string | null;
  architectureNotes?: string | null;
  resultSummary?: string | null;
  fullDescription?: string | null;
  coverImageId?: number | null;
  logoImageId?: number | null;
  ogImageId?: number | null;
};

export interface SectionInput {
  sectionType?: string;
  title?: string | null;
  body?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}
export interface FeatureInput {
  title?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}
export interface LinkInput {
  label?: string;
  url?: string;
  linkType?: ProjectLinkType;
  status?: ProjectLinkStatus;
  isPublic?: boolean;
  sortOrder?: number;
}
export interface TechStackInput {
  name?: string;
  category?: TechCategory | null;
  proficiency?: string | null;
  icon?: string | null;
  color?: string | null;
}
export interface ProjectTechAttachInput {
  techStackId: number;
  isPrimary?: boolean;
  sortOrder?: number;
}
export interface MediaAssetInput {
  url?: string;
  thumbnailUrl?: string | null;
  originalFilename?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  altText?: string | null;
  caption?: string | null;
}
export interface ProjectMediaAttachInput {
  mediaAssetId: number;
  mediaType?: MediaType;
  title?: string | null;
  caption?: string | null;
  deviceFrame?: DeviceFrame;
  sortOrder?: number;
  isFeatured?: boolean;
  isVisible?: boolean;
}
export interface ProjectMediaUpdateInput {
  mediaType?: MediaType;
  title?: string | null;
  caption?: string | null;
  deviceFrame?: DeviceFrame;
  sortOrder?: number;
  isFeatured?: boolean;
  isVisible?: boolean;
}

/** Backend error envelope (from ApiError.data). */
export interface ApiErrorData {
  success?: false;
  error?: string;
  message?: string;
  field?: string;
}

// ---- Public (unauthenticated) project detail DTO ----
// Mirrors hono-workers toPublicProjectDetail: confidential clientName is null,
// links are active+public only, children are visible-only.
export interface PublicMediaItem {
  id: number;
  mediaType: MediaType;
  url: string;
  alt: string | null;
  caption: string | null;
  deviceFrame: DeviceFrame;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  sortOrder: number;
  isFeatured: boolean;
}
export interface PublicSectionItem {
  sectionType: string;
  title: string | null;
  body: string | null;
  sortOrder: number;
}
export interface PublicFeatureItem {
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}
export interface PublicTechItem {
  name: string;
  category: string | null;
  icon: string | null;
  color: string | null;
  isPrimary: boolean;
  sortOrder: number;
}
export interface PublicLinkItem {
  label: string;
  url: string;
  linkType: ProjectLinkType;
  sortOrder: number;
}
export interface PublicProjectDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  imageVariant?: ImageVariant | null;
  technologies: string[];
  githubUrl: string;
  liveUrl: string;
  year: number;
  role: string;
  projectType: ProjectType;
  features?: string[] | null;
  tags?: string[] | null;
  status?: ProjectStatus | null;
  featured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  subtitle: string | null;
  summary: string | null;
  projectScope: string | null;
  clientName: string | null;
  isConfidential: boolean;
  problem: string | null;
  solution: string | null;
  contribution: string | null;
  architectureNotes: string | null;
  resultSummary: string | null;
  fullDescription: string | null;
  publishedAt: string | null;
  cover: PublicMediaItem | null;
  ogImage: PublicMediaItem | null;
  media: PublicMediaItem[];
  sections: PublicSectionItem[];
  featureList: PublicFeatureItem[];
  techStacks: PublicTechItem[];
  links: PublicLinkItem[];
}
