// Projects service types - matching frontend interface
export type ImageVariant = 'banner' | 'logo' | 'width-banner';
export type ProjectType = 'personal' | 'business' | 'work';

export interface Project {
    id: number;
    slug: string;
    title: string;
    description: string;
    fullDescription?: string;
    imageUrl: string;
    imageVariant?: ImageVariant;
    /** Device-frame card preview: set on the Cover media in admin; unset = guess from tech. */
    previewFrame?: "phone" | "web";
    /** API list only: device frame of the Cover media item (raw; see toPreviewFrame). */
    coverFrame?: string | null;
    technologies: string[]; // Array of technology names
    githubUrl: string;
    liveUrl: string;
    year: number;
    role: string;
    projectType: ProjectType;
    features?: string[]; // Array of feature descriptions
    tags?: string[]; // Array of tag names
    status?: 'completed' | 'in-progress' | 'maintained';
    featured: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectPolicy {
    projectId: number;
    privacyPolicy: string | null;
    termsAndConditions: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProjectPolicyData {
    privacyPolicy?: string | null;
    termsAndConditions?: string | null;
}
