import type { Project, ProjectPolicy, UpdateProjectPolicyData } from '../types/project';
import { ApiClient } from './api-client';
import { API_BASE_URL } from './config';

export class ProjectsService extends ApiClient {
    constructor() {
        super(API_BASE_URL);
    }

    // Admin methods
    async getAdminProjects(): Promise<Project[]> {
        const result = await this.get<Project[]>('owner/projects/all');
        return result || [];
    }

    async getAdminProjectById(id: number): Promise<Project | null> {
        const projects = await this.getAdminProjects();
        return projects.find(p => p.id === id) || null;
    }

    async getAdminProjectPolicyById(id: number): Promise<ProjectPolicy | null> {
        return this.get<ProjectPolicy>(`owner/projects/${id}/policy`);
    }

    async createProject(data: Partial<Project>): Promise<Project | null> {
        return this.post<Project>('owner/projects', data);
    }

    async updateProject(id: number, data: Partial<Project>): Promise<Project | null> {
        return this.put<Project>(`owner/projects/${id}`, data);
    }

    async upsertProjectPolicy(id: number, data: UpdateProjectPolicyData): Promise<ProjectPolicy | null> {
        return this.put<ProjectPolicy>(`owner/projects/${id}/policy`, data);
    }

    async deleteProject(id: number): Promise<boolean> {
        try {
            await this.delete(`owner/projects/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to delete project:', error);
            return false;
        }
    }
}

// Export a singleton instance
export const projectsService = new ProjectsService();
