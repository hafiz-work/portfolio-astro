import { API_BASE_URL } from './config';
import { ApiClient, ApiError } from './api-client';

// Which AI model + reasoning effort each backend use case runs. Owner only:
// backend /owner/ai/* (hono-workers services/ai/settings.ts, migration 027).
// The model list is Command Code's live list, cached an hour by the backend.

export const REASONING = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Reasoning = (typeof REASONING)[number];

export interface AiModel {
  id: string;
  name: string;
  contextLength: number | null;
  /** Served on /chat/completions - the only route the backend speaks (Claude models are /messages-only). */
  usable: boolean;
}

export interface AiModelList {
  models: AiModel[];
  fetchedAt: string;
  stale: boolean;
}

export interface AiRoute {
  useCase: string;
  provider: string;
  configured: boolean;
  defaultModel: string;
  model: string;
  reasoning: Reasoning | null;
  overridden: boolean;
  updatedAt: string | null;
  updatedBy: { id: number; displayName: string | null } | null;
}

export type AiTestResult =
  | { ok: true; text: string; model: string; usage: { inputTokens: number; outputTokens: number } | null; ms: number }
  | { ok: false; status: number | null; error: string; ms: number };

export interface AiChoice {
  model: string;
  reasoning: Reasoning | null;
}

/**
 * One admin form field to write (backend services/ai/fields.ts holds each field's brief and limit).
 * `facts` = the record as it stands in the form, unsaved edits included - the main context.
 */
export interface AiGenerateRequest {
  entity: 'project' | 'blog';
  field: string;
  facts: Record<string, string | string[]>;
  confidential?: boolean;
  /** The owner's own instruction ("shorter", "mention offline mode"). */
  prompt?: string;
  /** The field's current text - the model improves on it. */
  current?: string;
}

class AiSettingsService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async models(refresh = false): Promise<AiModelList | null> {
    return this.get<AiModelList>(`/owner/ai/models${refresh ? '?refresh=1' : ''}`);
  }

  async routes(): Promise<AiRoute[]> {
    return (await this.get<AiRoute[]>('/owner/ai/routes')) ?? [];
  }

  save(useCase: string, choice: AiChoice) {
    return this.put<AiRoute>(`/owner/ai/routes/${encodeURIComponent(useCase)}`, choice);
  }

  reset(useCase: string) {
    return this.delete<AiRoute>(`/owner/ai/routes/${encodeURIComponent(useCase)}`);
  }

  test(useCase: string, choice: AiChoice) {
    return this.post<AiTestResult>(`/owner/ai/routes/${encodeURIComponent(useCase)}/test`, choice);
  }

  generate(req: AiGenerateRequest) {
    return this.post<{ text: string; model: string }>('/owner/ai/generate', req);
  }
}

export const aiSettingsService = new AiSettingsService();

/** Backend error -> sentence for a toast. */
export function aiSettingsError(e: unknown): string {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : 'Something went wrong';
  const code = (e.data as { code?: string } | undefined)?.code;
  if (code === 'models_unavailable') return "Couldn't reach Command Code for the model list. Try again shortly.";
  if (code === 'unknown_model') return 'That model is no longer in the Command Code list.';
  if (code === 'model_not_supported') return 'That model only answers on /messages (Claude) - not supported yet.';
  if (code === 'ai_not_configured') return 'COMMANDCODE_API_KEY is not set on the backend.';
  if (code === 'ai_empty') return 'The model returned no text. Try again or change the instruction.';
  if (e.status === 403) return 'Only the owner can change AI settings.';
  return e.message;
}
