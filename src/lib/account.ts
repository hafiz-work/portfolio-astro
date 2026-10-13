import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';
import type { BlogPost, BlogPostSummary } from '../types/blog';
import type { Quote } from '../types/quotes';

// The signed-in user's own data (hono-workers /me/*). Ownership is enforced by the API.

export interface MyPostInput {
  title: string;
  excerpt: string;
  bodyContent: string; // markdown
  tags?: string[];
  status: 'draft' | 'published';
}

export interface ModerationEntry {
  id: number;
  contentType: 'blog_post' | 'quote';
  contentId: number | null;
  contentTitle: string;
  action: 'reject' | 'restore' | 'delete';
  reason: string;
  createdAt: string;
}

export type ProfileInput = Partial<{
  displayName: string;
  bio: string;
  location: string;
  website: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
}>;

class AccountService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  updateProfile(data: ProfileInput) {
    return this.patch('/me', data);
  }

  updatePassword(currentPassword: string, newPassword: string) {
    return this.put('/me/password', { currentPassword, newPassword });
  }

  async moderation(): Promise<{ strikes: number; history: ModerationEntry[] }> {
    return (await this.get('/me/moderation')) ?? { strikes: 0, history: [] };
  }

  /** Summaries only (no body) - one query server-side. */
  async listPosts(): Promise<BlogPostSummary[]> {
    return (await this.get<BlogPostSummary[]>('/me/blog')) ?? [];
  }

  getPost(id: number) {
    return this.get<BlogPost>(`/me/blog/${id}`);
  }

  createPost(data: MyPostInput) {
    return this.post<BlogPost>('/me/blog', data);
  }

  updatePost(id: number, data: Partial<MyPostInput>) {
    return this.put<BlogPost>(`/me/blog/${id}`, data);
  }

  deletePost(id: number) {
    return this.delete(`/me/blog/${id}`);
  }

  async listQuotes(): Promise<Quote[]> {
    return (await this.get<Quote[]>('/me/quotes')) ?? [];
  }

  createQuote(data: { text: string; author: string; source?: string | null }) {
    return this.post<Quote>('/me/quotes', data);
  }

  updateQuote(id: number, data: Partial<{ text: string; author: string; source: string | null }>) {
    return this.put<Quote>(`/me/quotes/${id}`, data);
  }

  deleteQuote(id: number) {
    return this.delete(`/me/quotes/${id}`);
  }
}

export const accountService = new AccountService();

/** API error → short user-facing text. */
export const errorText = (e: unknown) => {
  const status = (e as { status?: number })?.status;
  const message = e instanceof Error ? e.message.replace(/^\w+: /, '') : '';
  if (status === 429) return message || 'Too many requests - try again later.';
  return message || 'Something went wrong. Please try again.';
};
