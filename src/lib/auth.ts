import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';

/** System role codes; custom roles are any other lowercase code (backend `roles` table). */
export type Role = 'owner' | 'admin' | 'user' | (string & {});

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

/** GET /me. `permissions` are lowercase `<module>.<action>` codes - gate UI on these, never on role names. */
export interface Me extends User {
  permissions: string[];
  profile: {
    displayName: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    twitterUrl: string | null;
  };
}

export const can = (me: Me | null, permission: string) => !!me?.permissions.includes(permission);

/** Where a signed-in user lands: the admin area if they may enter it, else their account. */
export const homeFor = (me: Me | null) => (can(me, 'admin.access') ? '/admin' : '/account');

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

  // Registration (hono-workers /auth/register). The answer is the same whether or
  // not the email exists - the UI always says "check your email".
  register(data: { email: string; password: string; name: string; captchaToken?: string }) {
    return this.post('/auth/register', data);
  }

  resendVerification(email: string, captchaToken?: string) {
    return this.post('/auth/resend-verification', { email, ...(captchaToken ? { captchaToken } : {}) });
  }

  verifyEmail(token: string) {
    return this.post('/auth/verify-email', { token });
  }

  tryRefresh(): Promise<boolean> {
    return this.refreshAccessToken();
  }

  // One /me request per page load; cleared with the auth state.
  private mePromise: Promise<Me | null> | null = null;

  me(): Promise<Me | null> {
    this.mePromise ??= this.get<Me>('/me').catch(() => null);
    return this.mePromise;
  }

  clearAuthState(): void {
    this.mePromise = null;
    super.clearAuthState();
  }
}

export const authService = new AuthService();
