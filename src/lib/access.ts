import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';
import type { Role } from './auth';

// Admin user + role management (backend: /owner/users, /owner/roles - RBAC tables, migration 019).

export interface AdminUser {
  id: number;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface RoleInfo {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export interface PermissionInfo {
  code: string;
  module: string;
  action: string;
  description: string | null;
}

export interface ModerationItem {
  type: 'blog_post' | 'quote';
  id: number;
  title: string;
  slug: string | null;
  status: string;
  moderationReason: string | null;
  createdAt: string;
  author: { id: number; email: string; name: string };
  /** Latest AI check (Clef-flash), or null when never checked / edited since. */
  check: ModerationCheck | null;
}

/** One stored AI check. P(yes) 0-1, uncalibrated. `auto` = scored on submit, not by a moderator. */
export interface ModerationCheck {
  spam: number;
  abuse: number;
  lowQuality: number;
  model: string;
  checkedAt: string;
  auto?: boolean;
}

export interface AiCheckStatus {
  enabled: boolean;
  autoCheck: boolean;
  /** Spam or abuse at or above this = flagged. */
  flagAt: number;
  /** Items per bulk request. */
  bulkMax: number;
}

/** "AI vs your decisions" over every checked item. */
export interface AiCheckStats {
  flagAt: number;
  checked: number;
  flagged: number;
  flaggedActioned: number;
  flaggedKept: number;
  missed: number;
}

export type BulkCheckResult = { type: ModerationItem['type']; id: number } & ({ check: ModerationCheck } | { error: string; code?: string });

export interface ModerationUser {
  user: { id: number; email: string; name: string; role: string; isActive: boolean };
  strikes: number;
  activeBan: { reason: string; expiresAt: string | null } | null;
  history: { id: number; contentType: string; contentTitle: string; action: string; reason: string; createdAt: string }[];
  bans: { id: number; reason: string; expiresAt: string | null; createdAt: string; liftedAt: string | null }[];
}

const urlType = (t: ModerationItem['type']) => (t === 'blog_post' ? 'blog' : 'quote');

class AccessService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async listUsers(): Promise<AdminUser[]> {
    return (await this.get<AdminUser[]>('/owner/users')) ?? [];
  }

  // Staff-created accounts are vouched for: no email confirmation step.
  createUser(data: { email: string; password: string; role: string; displayName?: string }) {
    return this.post<AdminUser>('/owner/users', { ...data, emailVerified: true });
  }

  updateUser(id: number, data: Partial<{ role: string; isActive: boolean }>) {
    return this.put<AdminUser>(`/owner/users/${id}`, data);
  }

  deleteUser(id: number) {
    return this.delete(`/owner/users/${id}`);
  }

  async listRoles(): Promise<RoleInfo[]> {
    return (await this.get<RoleInfo[]>('/owner/roles')) ?? [];
  }

  async listPermissions(): Promise<PermissionInfo[]> {
    return (await this.get<PermissionInfo[]>('/owner/roles/permissions')) ?? [];
  }

  getRole(code: string) {
    return this.get<RoleInfo>(`/owner/roles/${encodeURIComponent(code)}`);
  }

  createRole(data: { code: string; name: string; description?: string }) {
    return this.post<RoleInfo>('/owner/roles', data);
  }

  updateRole(code: string, data: Partial<{ name: string; description: string | null; permissions: string[] }>) {
    return this.put<RoleInfo>(`/owner/roles/${encodeURIComponent(code)}`, data);
  }

  deleteRole(code: string) {
    return this.delete(`/owner/roles/${encodeURIComponent(code)}`);
  }

  // ── Moderation (/owner/moderation) ──
  async moderationQueue(filter: { type?: 'blog' | 'quote'; status?: string } = {}): Promise<ModerationItem[]> {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]);
    return (await this.get<ModerationItem[]>(`/owner/moderation/content${q.size ? `?${q}` : ''}`)) ?? [];
  }

  moderate(item: Pick<ModerationItem, 'type' | 'id'>, action: 'reject' | 'restore' | 'delete', reason: string) {
    const path = `/owner/moderation/${urlType(item.type)}/${item.id}`;
    return action === 'delete'
      ? this.request(path, { method: 'DELETE', body: JSON.stringify({ reason }) })
      : this.post(`${path}/${action}`, { reason });
  }

  /** The owner's switches (features `moderation_ai_check`, `moderation_ai_autocheck`) + thresholds. */
  aiCheckStatus() {
    return this.get<AiCheckStatus>('/owner/moderation/assess');
  }

  aiCheckStats() {
    return this.get<AiCheckStats>('/owner/moderation/assess/stats');
  }

  assessModeration(item: Pick<ModerationItem, 'type' | 'id'>) {
    return this.post<ModerationCheck>(`/owner/moderation/${urlType(item.type)}/${item.id}/assess`, {});
  }

  /** Up to `bulkMax` items per call; per-item result or error. */
  async assessMany(items: Pick<ModerationItem, 'type' | 'id'>[]): Promise<BulkCheckResult[]> {
    return (await this.post<BulkCheckResult[]>('/owner/moderation/assess', { items: items.map((i) => ({ type: urlType(i.type), id: i.id })) })) ?? [];
  }

  moderationUser(id: number) {
    return this.get<ModerationUser>(`/owner/moderation/users/${id}`);
  }

  ban(id: number, reason: string, expiresAt: string | null) {
    return this.post(`/owner/moderation/users/${id}/ban`, { reason, ...(expiresAt ? { expiresAt } : {}) });
  }

  unban(id: number) {
    return this.post(`/owner/moderation/users/${id}/unban`, {});
  }
}

export const accessService = new AccessService();

/** Display name with the same fallbacks the backend uses. */
export const userLabel = (u: AdminUser) =>
  u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email;
