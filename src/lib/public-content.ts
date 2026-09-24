import type { Project, ProjectPolicy } from "../types/project";
import type { Experience } from "../types/experiences";
import type { BlogPost, BlogPostSummary } from "../types/blog";
import type { PublicProjectDetail } from "../types/project-cms";
import { API_BASE_URL } from "./config";
import {
    FALLBACK_PROJECTS,
    FALLBACK_EXPERIENCES,
    PROJECT_COPY,
    PROJECT_LINK_OVERRIDES,
} from "../data/portfolio-content";

/**
 * Server-side data loaders for the public site.
 *
 * Contract: these never throw and never return an empty list. If the API is
 * slow, down, or returns nothing, curated fallback content renders instead -
 * visitors must never see loading spinners, error banners, or empty states.
 */

const FETCH_TIMEOUT_MS = 4000;

/** `cf` is a Workers fetch option; the DOM lib's RequestInit does not know it. */
type WorkerFetchInit = RequestInit & {
    cf: { cacheTtl: number; cacheEverything: boolean };
};

async function fetchJson<T>(path: string): Promise<T | null> {
    try {
        const init: WorkerFetchInit = {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            // Opt this public read into Cloudflare's edge cache. `cache: 'no-store'`
            // (what the ApiClient sets for browser callers) does nothing in a
            // Worker, so without this every visitor's SSR render re-hits the API
            // and D1. 60s is the free-plan floor and the owner publishes rarely.
            cf: { cacheTtl: 60, cacheEverything: true },
        };
        const response = await fetch(`${API_BASE_URL}/${path}`, init);
        if (!response.ok) return null;
        const json = (await response.json()) as { success?: boolean; data?: T };
        return (json?.data as T) ?? null;
    } catch {
        return null;
    }
}

/**
 * Apply curated copy + link sanitization to a single API project record.
 * Used by both the list and detail loaders so the public site renders one
 * consistent, trusted view of every project.
 */
export function curateProject(project: Project): Project {
    const copy = PROJECT_COPY[project.slug];
    const links = PROJECT_LINK_OVERRIDES[project.slug];
    return {
        ...project,
        ...(copy
            ? {
                title: copy.title ?? project.title,
                description: copy.description,
                imageVariant: copy.imageVariant ?? project.imageVariant,
            }
            : {}),
        ...(links
            ? {
                githubUrl: links.githubUrl ?? project.githubUrl,
                liveUrl: links.liveUrl ?? project.liveUrl,
            }
            : {}),
    };
}

function sortProjects(projects: Project[]): Project[] {
    return projects
        .slice()
        .sort((a, b) =>
            a.featured !== b.featured
                ? a.featured
                    ? -1
                    : 1
                : (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
}

export async function getPublicProjects(): Promise<Project[]> {
    const data = await fetchJson<Project[]>("projects");
    if (!data || data.length === 0)
        return sortProjects(FALLBACK_PROJECTS.map(curateProject));

    // Apply curated copy + link sanitization over API records.
    return sortProjects(data.map(curateProject));
}

/**
 * Structured public detail loader. Reads the composed public DTO (sections,
 * features, tech, links, media) from the API. Applies the curated copy override
 * (title/description/imageVariant) to preserve polished copy. When the API is
 * unreachable, wraps the curated static fallback with empty children so the
 * page still renders (hero + description + flat features/tech). Never throws.
 *
 * CTAs are rendered from the structured `links` array (active+public only), so
 * broken/hidden links are excluded by the data layer - see the backfill seed.
 */
export async function getPublicProjectDetail(
    slug: string,
): Promise<PublicProjectDetail | null> {
    const data = await fetchJson<PublicProjectDetail>(`projects/${slug}`);
    if (data) {
        const copy = PROJECT_COPY[data.slug];
        return copy
            ? {
                ...data,
                title: copy.title ?? data.title,
                description: copy.description,
                imageVariant: copy.imageVariant ?? data.imageVariant,
            }
            : data;
    }

    const fb = FALLBACK_PROJECTS.find((p) => p.slug === slug);
    if (!fb) return null;
    const c = curateProject(fb);
    return {
        ...c,
        imageVariant: c.imageVariant ?? null,
        features: c.features ?? null,
        tags: c.tags ?? null,
        status: c.status ?? null,
        subtitle: null,
        summary: null,
        projectScope: null,
        clientName: null,
        isConfidential: false,
        problem: null,
        solution: null,
        contribution: null,
        architectureNotes: null,
        resultSummary: null,
        fullDescription: null,
        publishedAt: null,
        cover: null,
        ogImage: null,
        media: [],
        sections: [],
        featureList: [],
        techStacks: [],
        links: [],
    } as PublicProjectDetail;
}

/**
 * Public blog loaders. Same contract as the loaders above: never throw, and an
 * unreachable API degrades to the page's own empty state. They replace the
 * ApiClient-based calls on the SSR blog pages, which sent `cache: 'no-store'`
 * (a browser-cache directive the Worker runtime ignores) and therefore never
 * let the edge cache a subrequest.
 */
export async function getPublicPosts(): Promise<BlogPostSummary[]> {
    return (await fetchJson<BlogPostSummary[]>("blog")) ?? [];
}

export async function getPublicPostBySlug(slug: string): Promise<BlogPost | null> {
    return await fetchJson<BlogPost>(`blog/${slug}`);
}

export async function getPublicProjectPolicy(slug: string): Promise<ProjectPolicy | null> {
    return await fetchJson<ProjectPolicy>(`projects/${slug}/policy`);
}

export async function getPublicExperiences(): Promise<Experience[]> {
    const data = await fetchJson<Experience[]>("experiences");
    const experiences = data && data.length > 0 ? data : FALLBACK_EXPERIENCES;
    return experiences.slice().sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
}

export function formatMonthYear(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-MY", {
        month: "short",
        year: "numeric",
    }).format(date);
}

export function formatDateRange(exp: Experience): string {
    const start = formatMonthYear(exp.startDate);
    const end = exp.isCurrent
        ? "Present"
        : exp.endDate
            ? formatMonthYear(exp.endDate)
            : "Present";
    return `${start} - ${end}`;
}
