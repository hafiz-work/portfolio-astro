import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';

/** Row shape from GET /owner/dashboard/logs (audit_logs table). */
export interface AuditLog {
  id: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
}

class SystemService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async getLogs(): Promise<AuditLog[]> {
    return (await this.get<AuditLog[]>('/owner/dashboard/logs')) ?? [];
  }
}

export const systemService = new SystemService();
