import { API_BASE_URL } from './config';
import { ApiClient, ApiError } from './api-client';
import type { AdminUser } from './access';

// Who holds which role in the owner's other apps (Nubi Sport, …). Owner only:
// backend /owner/apps/*. The portfolio's own roles stay on /owner/roles + /owner/users.

export interface AppRole {
  code: string;
  name: string;
  description: string | null;
}

export interface AppInfo {
  code: string;
  name: string;
  roles: AppRole[];
}

export interface AppMember {
  userId: number;
  email: string;
  displayName: string | null;
  username: string | null;
  role: string;
  grantedAt: string;
  grantedBy: { id: number; displayName: string } | null;
}

class AppAccessService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async listApps(): Promise<AppInfo[]> {
    return (await this.get<AppInfo[]>('/owner/apps')) ?? [];
  }

  async members(app: string): Promise<AppMember[]> {
    return (await this.get<AppMember[]>(`/owner/apps/${encodeURIComponent(app)}/members`)) ?? [];
  }

  setRole(app: string, userId: number, role: string) {
    return this.put<AppMember>(`/owner/apps/${encodeURIComponent(app)}/members/${userId}`, { role });
  }

  remove(app: string, userId: number) {
    return this.delete(`/owner/apps/${encodeURIComponent(app)}/members/${userId}`);
  }

  /** Existing owner users search (2+ chars, matches email/username/name). */
  async searchUsers(q: string): Promise<AdminUser[]> {
    return (await this.get<AdminUser[]>(`/owner/users/search/${encodeURIComponent(q)}`)) ?? [];
  }
}

export const appAccessService = new AppAccessService();

/** Backend error -> sentence for a toast. */
export function appAccessError(e: unknown): string {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : 'Something went wrong';
  const code = (e.data as { code?: string } | undefined)?.code;
  if (code === 'invalid_role') return "That role doesn't exist in this app.";
  if (code === 'user_not_eligible') return "This account can't be given app access (inactive or not verified).";
  if (e.status === 403) return 'Only the owner can manage app access.';
  if (e.status === 404) return 'App or user not found.';
  return e.message;
}
