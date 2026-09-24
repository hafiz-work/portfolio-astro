# Public Project Case-Study Spec

**Status:** Draft (Phase 1)
**Owner:** Hafiz Bahtiar
**Depends on:** `backend-content-api-spec.md` (public read API), `admin-project-cms-spec.md` (authoring), `public-media-carousel-spec.md` (carousel).
**Goal:** Turn `/projects` and `/projects/[slug]` into a polished, evidence-driven, recruiter-facing case-study experience driven entirely by structured data - while preserving the current public design direction (slate palette, cyan/blue accents, `container-main`, View Transitions).

---

## 1. Principles

1. **Evidence over decoration.** Every screenshot, metric, and claim maps to something the project actually did. Captions explain value/contribution, not "screenshot of the home page."
2. **Structured data, not hardcoded markup.** The page renders from the public API (`media_assets` / `project_media` / `project_sections` / `project_features` / `project_tech_stacks` / `project_links`). No carousel images or tech lists baked into components.
3. **Never broken, never empty.** Keeps the existing contract in `src/lib/public-content.ts`: 4 s timeout, curated static fallback, no spinners/error/empty states on public pages.
4. **Public surface only shows publishable data.** Public API returns only `status = 'published'` **and** `is_public = 1`. Confidential projects render a sanitized case study (no client names/links unless cleared).

---

## 2. Public project **list** (`/projects`)

- Source: `GET /api/public/projects` (curated through `curateProject`). Sorted featured-first, then `featured_order`, then `sort_order`.
- Layout: keep the current responsive grid - first card spans both columns (`sm:col-span-2`), rest 2-up. Preserve `ProjectCard.astro` look.
- Card content (unchanged shape): cover image (with variant handling + composed preview for logos), eyebrow (`year · type label`), title, 2–3-line clamp summary, up to 4 tech chips + overflow `+N`, whole-card anchor to detail, `Featured` badge on the lead card.
- **Media on the list:** cover image only. For featured projects, **max 2–3** thumbnail previews are allowed (from `project_media` where `is_featured = 1`), never a heavy multi-image carousel per card (see carousel spec §6).
- Filtering (progressive enhancement, optional): by `type` and `tech` via query params `?type=&tech=`; default unfiltered. No filter UI required for v1.
- Empty/fallback: if API down → curated `FALLBACK_PROJECTS`. Never renders 0 cards.

## 3. Public project **detail** (`/projects/[slug]`)

`prerender = false`, curated loader, redirect to `/404` only when the slug is unknown in **both** API and fallback.

### 3.1 Section order (top → bottom)
1. **Back link** → `/projects`.
2. **Hero** - title, subtitle (optional), meta chips (role · year · type · status), summary dek (single source of the short description), primary CTAs (§3.3).
3. **Media carousel** - `project_media` ordered by `sort_order`; see `public-media-carousel-spec.md`. Falls back to single cover image, then to "Media coming soon" placeholder.
4. **Project summary** - `summary` (one paragraph) + Project Info sidebar (role, year, type, status, client when public).
5. **Problem** - `project_sections[type=problem]` or `projects.problem`.
6. **My contribution** - `contribution` (what *I* specifically did; first person, scoped).
7. **Architecture / tech decisions** - `architecture_notes` + optional architecture-diagram media.
8. **Features** - `project_features` (title + description + optional icon), ordered, visible only.
9. **Challenges & solutions** - `project_sections[type=challenges]`.
10. **Results / impact** - `result_summary` + `project_sections[type=results]` (metrics encouraged).
11. **Tech stack** - `project_tech_stacks` grouped by category (backend/mobile/database/web/infra/language/tooling), primary first.
12. **Links / CTA** - `project_links` filtered to `is_public = 1 AND status = 'active'`; safe contact fallback otherwise (§3.3).
13. **Legal** - Privacy / Terms links when a policy exists (unchanged).

Sections with no content are **omitted** (no empty headings). This is the structural fix for the Phase 0 duplicate-content problem: each block has exactly one data source and renders once.

### 3.2 Rendering rules
- Rich text fields (`full_description`, section `body`) are stored as HTML, **sanitized server-side at write time in the backend** (see API spec §8), and additionally passed through the client `sanitizeRichHtml` allowlist before `set:html`. Never `set:html` an unsanitized field during SSR.
- Tabs are optional. v1 may keep a light tab set (Overview / Tech Stack) or switch to a single scrolling case study; either way no content block is duplicated across tabs.

### 3.3 CTA strategy (replaces the Phase 0 stopgap)
Driven by `project_links` + project flags:
| Situation | CTA |
|---|---|
| Public project, working repo | **Source Code** (`link_type=source`, `status=active`) |
| Public project, working demo / store listing | **Live Demo / App Store / Play Store** |
| Confidential / client work, no public link | **Request a walkthrough** / **Request access** → `/#contact` |
| Link marked `hidden`/`disabled` or failing validation | not rendered |
| No active public link at all | safe contact CTA (never a dead button) |

Buttons render **only** for links the admin marked active + public. No link is ever rendered just because a URL string exists.

## 4. Responsive behavior
- Mobile-first; `container-main` (`max-w-[794px]`) for all content.
- Hero meta chips wrap; CTAs stack on `<sm`.
- Carousel: horizontal swipe on touch, arrow/keyboard on desktop (see carousel spec).
- Sidebar (Project Info) drops below the main column on `<lg`.
- Tap targets ≥ 40 px; no horizontal page scroll.

## 5. SEO metadata
- `<title>`: `"{title} - Hafiz Bahtiar"`.
- `<meta name=description>`: `summary` (≤ 160 chars; fall back to `description`).
- Canonical: `https://hafizbahtiar.com/projects/{slug}` (apex).
- JSON-LD `CreativeWork`: name, description, url, image (absolute OG), `dateCreated` (year), `keywords` (tech names), `creator` Person. Add `about`/`keywords` from tech stack.
- Confidential projects: omit client name and any private URL from JSON-LD.

## 6. OpenGraph image behavior
- Priority: `og_image_id` → `cover_image_id` → first `project_media` screenshot → site `og-default.png`.
- Always an **absolute** URL (resolved against `Astro.site`).
- Recommended asset: 1200×630. The carousel media may differ; OG is a dedicated field so social cards stay intentional.

## 7. Image alt-text rules
- Every public image **must** have non-empty `alt_text` (enforced in admin before publish - see CMS spec validation).
- Alt text describes the evidence ("Invois invoice PDF export preview"), not "image".
- Decorative-only images are not allowed in the public carousel (carousel is evidence).
- Device-framed screenshots: alt describes the screen content, not the frame.

## 8. Fallback states
| Missing | Behavior |
|---|---|
| API unreachable | curated `FALLBACK_PROJECTS` (existing contract). |
| No carousel media | single cover image; else "Media coming soon" placeholder (shipped in Phase 0). |
| No cover image | placeholder block (no broken `<img>`). |
| No problem/contribution/etc. | section omitted. |
| No public links | safe contact CTA. |
| No tech stack | tech section omitted. |

## 9. Private / confidential project handling
- `is_confidential = 1`: hide `client_name` (show "Confidential client"), hide private links, prefer sanitized `project_sections` authored for public view.
- `is_public = 0`: never returned by the public API; not reachable at `/projects/[slug]` (→ 404).
- Confidential projects can still be **published** to show sanitized impact + a "Request access" CTA - this is the first-class replacement for today's "no buttons" dead-ends (audit M2).

## 10. Acceptance criteria
- [ ] No field renders more than once on the detail page.
- [ ] No CTA points at a 404/unreachable/private URL.
- [ ] Every public image has alt text.
- [ ] Carousel keyboard- and touch-accessible, no layout shift, lazy-loaded.
- [ ] Confidential projects expose no client PII or private URLs.
- [ ] Page renders fully from API; with API down, renders from fallback.
- [ ] Lighthouse: no CLS regressions from media; LCP image preloaded.
