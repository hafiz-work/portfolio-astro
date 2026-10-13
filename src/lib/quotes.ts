import type {
    Quote,
    QuoteTag,
    QuoteTagInput,
    CreateQuotePayload,
    UpdateQuotePayload,
} from "../types/quotes";
import { ApiClient } from "./api-client";
import { API_BASE_URL } from "./config";

export class QuotesService extends ApiClient {
    constructor() {
        super(API_BASE_URL);
    }

    async getAdminQuotes(): Promise<Quote[]> {
        return (await this.get<Quote[]>("owner/quotes")) ?? [];
    }

    async getAdminQuoteById(id: number): Promise<Quote | null> {
        return this.get<Quote>(`owner/quotes/${id}`);
    }

    async createQuote(data: CreateQuotePayload): Promise<Quote | null> {
        return this.post<Quote>("owner/quotes", data);
    }

    async updateQuote(id: number, data: UpdateQuotePayload): Promise<Quote | null> {
        return this.patch<Quote>(`owner/quotes/${id}`, data);
    }

    async deleteQuote(id: number): Promise<boolean> {
        try {
            await this.delete(`owner/quotes/${id}`);
            return true;
        } catch (error) {
            console.error("Failed to delete quote:", error);
            return false;
        }
    }

    // ---- quote tags (taxonomy) ----
    async listQuoteTags(): Promise<QuoteTag[]> {
        return (await this.get<QuoteTag[]>("owner/quote-tags")) ?? [];
    }
    createQuoteTag(data: QuoteTagInput): Promise<QuoteTag | null> {
        return this.post<QuoteTag>("owner/quote-tags", data);
    }
    updateQuoteTag(id: number, data: QuoteTagInput): Promise<QuoteTag | null> {
        return this.patch<QuoteTag>(`owner/quote-tags/${id}`, data);
    }
    deleteQuoteTag(id: number): Promise<unknown> {
        return this.delete(`owner/quote-tags/${id}`);
    }
}

export const quotesService = new QuotesService();

/** Tag category slug → label: `self-help` → "Self help"; null → "Other". */
export const categoryLabel = (c: string | null | undefined) => {
    const s = (c || "other").replace(/-/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Distinct categories, alphabetical, "other" last. */
export const sortCategories = (cats: Iterable<string>) =>
    [...new Set(cats)].sort((a, b) =>
        a === "other" ? 1 : b === "other" ? -1 : a.localeCompare(b),
    );
