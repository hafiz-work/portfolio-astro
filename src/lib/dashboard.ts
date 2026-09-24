import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';

export interface DashboardContactStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

export interface DashboardRecentProject {
  id: number;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
}

export interface DashboardRecentContact {
  id: number;
  name: string;
  email: string;
  subject: string;
  status: 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';
  createdAt: string;
}

export interface DashboardRecentDownload {
  createdAt: string;
  ipAddress: string;
  country: string | null;
  userAgent: string;
}

export interface DashboardOverview {
  projects: {
    total: number;
    featured: number;
    recent: DashboardRecentProject[];
  };
  contacts: {
    total: number;
    new: number;
    stats: DashboardContactStats;
    recent: DashboardRecentContact[];
  };
  blog: { total: number };
  experiences: { total: number };
  // Optional until the backend `/owner/dashboard/overview` endpoint adds it -
  // the UI defaults to 0 / empty so the dashboard never breaks before then.
  resumeDownloads?: {
    total: number;
    recent: DashboardRecentDownload[];
  };
}

class DashboardService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  // Owner-only. Must be called client-side so the browser attaches the
  // httpOnly auth cookie (SSR fetch on Cloudflare cannot forward it).
  async getOverview(): Promise<DashboardOverview | null> {
    return this.get<DashboardOverview>('/owner/dashboard/overview');
  }
}

export const dashboardService = new DashboardService();
