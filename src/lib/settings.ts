import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';


export interface Settings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  contactEmail: string;
}

class SettingsService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  // Calls the dedicated password endpoint which verifies currentPassword via bcrypt
  async updatePassword(currentPassword: string, newPassword: string) {
    return this.put('/me/password', { currentPassword, newPassword });
  }
}

export const settingsService = new SettingsService();
