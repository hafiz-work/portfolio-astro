import { API_BASE_URL } from './config';
import { ApiClient } from './api-client';


export interface ContactData {
    name: string;
    email: string;
    message: string;
    subject?: string;
    phone?: string;
    source?: string;
    /** Cloudflare Turnstile token - required by the API when captcha is enabled. */
    captchaToken?: string;
}

export interface ContactResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface OwnerContact {
    id: number;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    status: 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';
    source: 'FORM' | 'EMAIL' | 'SOCIAL' | 'OTHER';
    readAt?: string;
    repliedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export class ContactService extends ApiClient {
    constructor() {
        super(API_BASE_URL);
    }

    async getOwnerContacts(): Promise<OwnerContact[]> {
        const result = await this.get<OwnerContact[]>('owner/contact');
        return result || [];
    }

    /** Owner: move a message to READ / REPLIED / ARCHIVED. */
    async updateContactStatus(
        id: number,
        status: 'READ' | 'REPLIED' | 'ARCHIVED',
    ): Promise<OwnerContact | null> {
        const path = { READ: 'read', REPLIED: 'replied', ARCHIVED: 'archive' }[status];
        return this.put<OwnerContact>(`owner/contact/${id}/${path}`, {});
    }
}

export const contactService = new ContactService();

// Public form: plain fetch on purpose - no Bearer token / refresh retry, and the
// API's { success, error } body is mapped to a result instead of thrown.
export async function submitContactForm(data: ContactData): Promise<ContactResponse> {
    try {
        const url = `${API_BASE_URL}/contact`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return {
                success: true,
                message: result.data?.message || 'Message sent successfully!'
            };
        } else {
            return {
                success: false,
                error: result.error || result.message || 'Failed to send message.'
            };
        }
    } catch (error) {
        console.error('Contact submission error:', error);
        return {
            success: false,
            error: 'Network error. Please try again later.'
        };
    }
}
