import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  expiresAt: string;
  refreshable?: boolean;
}

class AuthService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async login(
    email: string,
    password: string,
    captchaToken?: string,
  ): Promise<LoginResponse | null> {
    const response = await this.post<LoginResponse>('/auth/login', {
      email,
      password,
      ...(captchaToken ? { captchaToken } : {}),
    });
    if (response) {
      // The backend sets access_token and refresh_token as httpOnly cookies.
      // We set session_active on the frontend domain so isAuthenticated() can
      // do a cheap local check without a network roundtrip.
      const maxAge = response.refreshable === false
        ? Math.max(0, Math.floor((new Date(response.expiresAt).getTime() - Date.now()) / 1000))
        : 604800;
      document.cookie = `session_active=1; path=/; max-age=${maxAge}; SameSite=Lax`
        + (location.protocol === 'https:' ? '; Secure' : '');
    }
    return response;
  }

  async logout(): Promise<boolean> {
    try {
      await this.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.clearAuthState();
    }
    return true;
  }

  tryRefresh(): Promise<boolean> {
    return this.refreshAccessToken();
  }
}

export const authService = new AuthService();
