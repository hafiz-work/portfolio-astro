export interface QuoteTag {
    id: number;
    name: string;
    category: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Quote {
    id: number;
    text: string;
    author: string;
    source: string | null;
    tags: QuoteTag[];
    createdAt: string;
    updatedAt: string;
    /** Display name of the registered user who shared it; absent for the owner's quotes. */
    submittedBy?: string | null;
    /** Own/admin views only: 'published' | 'rejected', and why. */
    status?: string;
    moderationReason?: string | null;
}

export interface CreateQuotePayload {
    text: string;
    author: string;
    source?: string | null;
    tagIds?: number[];
}

export type UpdateQuotePayload = Partial<CreateQuotePayload>;

export interface QuoteTagInput {
    name?: string;
    category?: string | null;
}
