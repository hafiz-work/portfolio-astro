export interface Experience {
    id: number;
    companyName: string;
    role: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    projectIds: number[];
    description: string | null;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExperiencePayload {
    companyName: string;
    role: string;
    startDate: string;
    endDate?: string | null;
    isCurrent?: boolean;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    projectIds?: number[];
    description?: string | null;
    displayOrder?: number;
}

export type UpdateExperiencePayload = Partial<CreateExperiencePayload>
