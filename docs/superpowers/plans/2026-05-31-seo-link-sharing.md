# SEO & Link-Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public page produce a correct, content-specific preview when shared via link (Open Graph / Twitter cards) and become crawlable/rankable by search engines.

**Architecture:** Move blog and project detail pages from client-side `fetch()` rendering to **request-time server-side rendering** (`prerender = false`, fetch in frontmatter), so crawlers receive real `<title>`, meta description, OG image, JSON-LD, and article body in the initial HTML. Plumb an `image` prop through the layout chain so pages can set per-page social cards. Add `robots.txt`, a generated `sitemap.xml`, and JSON-LD structured data.

**Tech Stack:** Astro 6 (SSR via `@astrojs/cloudflare`), TypeScript, `@astrojs/sitemap`. Existing service layer: `BlogService` / `ProjectsService` extending `ApiClient`.

**Verification model:** This repo has **no test runner** (per `CLAUDE.md`). Verification = `npx astro check` (type safety) + `npm run build` (build success) + `curl` against `npm run preview` to assert rendered HTML contains the expected tags. Build errors from `ECONNREFUSED` (local API down) are expected and do not block.

---

## Important pre-read (data model facts)

These constrain the plan - do not assume otherwise:

- `Project` (`src/types/project.ts`) **has** `imageUrl`, `description`, `fullDescription`, `title`, `slug`, `year`, `technologies`, `status`. → per-project OG images are possible immediately.
- `BlogPost` (`src/types/blog.ts`) has `title`, `excerpt`, `heroText`, `bodyContent`, `publishedDate`, `createdAt`, `updatedAt`, `tags`, `readTimeMinutes`, `sections[]`, `checklist[]`. It **has NO image/cover field**. → blog OG images fall back to the site default until the backend adds one (see "Backend Coordination").
- Public fetch methods already exist: `blogService.getPublicPostBySlug(slug)` returns `BlogPost | null`; `projectsService.getProjectBySlug(slug)` returns `Project | null`; `projectsService.getProjectPolicyBySlug(slug)` returns `ProjectPolicy | null`.
- `ApiClient` responses unwrap `json.data` already inside the service layer (the public methods return the typed object directly), so frontmatter code uses the returned object as-is.
- `Astro.site` = `https://hafizbahtiar.com` (set in `astro.config.mjs`).

---

## Backend Coordination (hand to the backend agent - do NOT edit backend here)

The frontend is the only thing changed in this plan. One enhancement requires backend work and is **out of scope**; until it lands, blog cards use the default OG image.

> **Request for backend agent (repo `/Users/hafiz/Developments/hono-workers`):**
> Add an optional `coverImageUrl: string | null` field to the blog post resource (D1 column + `GET /api/v1/blog/:slug` response + owner create/update payloads). It should be an absolute or root-relative image URL sized ~1200×630 for social cards. No other behavior changes. Once available, the frontend will read `post.coverImageUrl` for the blog OG image (Phase 3, Task 3.3 has a TODO marker for the one-line switch).

When this field exists, also update `src/types/blog.ts` `BlogPost` and `BlogPostSummary` to include `coverImageUrl: string | null` - but that is a follow-up, not part of this plan.

---

## File Structure

**Phase 1 - OG plumbing & meta enrichment**
- Modify: `src/layouts/PublicLayout.astro` - add `image` prop, forward to CoreLayout.
- Modify: `src/layouts/ProjectLayout.astro` - add `image` prop, forward to PublicLayout.
- Modify: `src/layouts/CoreLayout.astro` - add `type`, `publishedTime`, `imageAlt` props; emit `og:type`, `og:locale`, `og:image:width/height/alt`, `twitter:site/creator`, conditional `article:*` tags.
- Create: `public/og-default.png` - 1200×630 default social card (placeholder generation described in task).

**Phase 2 - robots & sitemap**
- Modify: `package.json` / install `@astrojs/sitemap`.
- Modify: `astro.config.mjs` - register sitemap integration.
- Create: `public/robots.txt`.

**Phase 3 - Blog detail SSR**
- Modify: `src/pages/blog/[slug]/index.astro` - fetch in frontmatter, real meta + JSON-LD, server-rendered body.

**Phase 4 - Project detail SSR**
- Modify: `src/pages/projects/[slug]/index.astro` - fetch in frontmatter, real meta + JSON-LD, server-rendered body.
- Modify: `src/pages/projects/[slug]/privacy.astro` and `terms.astro` - pass project `imageUrl` to layout (small).

**Phase 5 - Site-wide structured data**
- Modify: `src/pages/index.astro` - `Person` + `WebSite` JSON-LD.
- Create: `src/components/seo/JsonLd.astro` - tiny reusable JSON-LD emitter used by Phases 3–5.

---

## Phase 1 - OG image plumbing & meta enrichment

**Why first:** Every later phase passes an `image` to a layout. Today `PublicLayout`/`ProjectLayout` silently drop it. This phase is pure scaffolding with no data-fetch changes, so it is safe and unblocks everything else.

### Task 1.1: Add a default 1200×630 OG image

**Files:**
- Create: `public/og-default.png`

- [ ] **Step 1: Generate a 1200×630 default card**

Use the existing brand icon to composite a correctly-sized card. If ImageMagick is available:

```bash
cd /Users/hafiz/Developments/portfolio-astro
magick -size 1200x630 xc:'#0f172a' \
  \( public/favicons/web-app-manifest-512x512.png -resize 240x240 \) -gravity center -composite \
  -font Helvetica -pointsize 64 -fill '#f1f5f9' -gravity south -annotate +0+90 'Hafiz Bahtiar' \
  public/og-default.png
```

If ImageMagick is NOT installed, fall back to copying the icon so the build is unblocked, and leave a note for the user to replace it:

```bash
cp public/favicons/web-app-manifest-512x512.png public/og-default.png
echo "NOTE: public/og-default.png is a placeholder square; replace with a real 1200x630 card."
```

- [ ] **Step 2: Verify the file exists and report dimensions**

Run:
```bash
file public/og-default.png
```
Expected: `public/og-default.png: PNG image data, 1200 x 630` (or the square fallback with the printed NOTE).

- [ ] **Step 3: Commit**

```bash
git add public/og-default.png
git commit -m "feat(seo): add default 1200x630 Open Graph image"
```

### Task 1.2: Forward `image` through `PublicLayout`

**Files:**
- Modify: `src/layouts/PublicLayout.astro`

- [ ] **Step 1: Add `image` to Props and forward it**

Replace the frontmatter block (currently lines 1-12) with:

```astro
---
import CoreLayout from "./CoreLayout.astro";
import Navbar from "../components/layout/Navbar.astro";
import Footer from "../components/layout/Footer.astro";
import Background from "../components/layout/Background.astro";

interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  imageAlt?: string;
}

const { title, description, image, type, publishedTime, imageAlt } = Astro.props;
---
```

- [ ] **Step 2: Pass the new props into CoreLayout**

Change the `<CoreLayout title={title} description={description}>` opening tag to:

```astro
<CoreLayout
  title={title}
  description={description}
  image={image}
  type={type}
  publishedTime={publishedTime}
  imageAlt={imageAlt}
>
```

- [ ] **Step 3: Verify types**

Run: `npx astro check 2>&1 | grep -E "PublicLayout|error ts" | head`
Expected: no new errors referencing `PublicLayout.astro`.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/PublicLayout.astro
git commit -m "feat(seo): forward image and article meta props through PublicLayout"
```

### Task 1.3: Forward `image` through `ProjectLayout`

**Files:**
- Modify: `src/layouts/ProjectLayout.astro`

- [ ] **Step 1: Add `image` to Props and forward**

Replace the whole file with:

```astro
---
import PublicLayout from "./PublicLayout.astro";

interface Props {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

const { title, description, image, imageAlt } = Astro.props;
---

<PublicLayout title={title} description={description} image={image} imageAlt={imageAlt}>
  <div class="container-main py-8 md:py-10 min-h-screen">
    <slot />
  </div>
</PublicLayout>
```

- [ ] **Step 2: Verify types**

Run: `npx astro check 2>&1 | grep -E "ProjectLayout|error ts" | head`
Expected: no new errors referencing `ProjectLayout.astro`.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/ProjectLayout.astro
git commit -m "feat(seo): forward image prop through ProjectLayout"
```

### Task 1.4: Enrich CoreLayout social meta tags

**Files:**
- Modify: `src/layouts/CoreLayout.astro`

- [ ] **Step 1: Extend Props and defaults**

Replace the frontmatter `interface Props` + destructuring block (currently lines 5-23) with:

```astro
interface Props {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  class?: string;
}

const {
  title = "Hafiz Bahtiar - Flutter Developer",
  description = "Portfolio of Hafiz Bahtiar, a Flutter Developer specializing in mobile apps and backend systems.",
  image = "/og-default.png",
  imageAlt = "Hafiz Bahtiar - Flutter Developer",
  type = "website",
  publishedTime,
  class: className = "",
} = Astro.props;

// Absolute URLs for canonical + social cards. Astro.site is set in astro.config.
const siteOrigin = Astro.site ?? new URL(Astro.url.origin);
const canonicalURL = new URL(Astro.url.pathname, siteOrigin);
const socialImageURL = new URL(image, siteOrigin);
```

Note the default `image` changes from the 512×512 manifest icon to `/og-default.png`.

- [ ] **Step 2: Replace the Open Graph + Twitter block**

Replace the existing block (currently lines 33-45, from `<!-- Open Graph -->` through the last `twitter:image` meta) with:

```astro
    <!-- Open Graph -->
    <meta property="og:type" content={type} />
    <meta property="og:site_name" content="Hafiz Bahtiar" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={socialImageURL} />
    <meta property="og:image:alt" content={imageAlt} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    {type === "article" && publishedTime && (
      <meta property="article:published_time" content={publishedTime} />
    )}
    {type === "article" && (
      <meta property="article:author" content="Hafiz Bahtiar" />
    )}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={socialImageURL} />
    <meta name="twitter:image:alt" content={imageAlt} />
```

> Note: leave `twitter:site`/`twitter:creator` out unless the user supplies a real `@handle` - adding a wrong/empty one is worse than omitting it. Ask the user for their X handle; if provided, add `<meta name="twitter:site" content="@handle" />` and `twitter:creator`.

- [ ] **Step 3: Verify build + rendered tags**

Run:
```bash
npx astro check 2>&1 | grep "error ts" | head
npm run build
```
Expected: type check clean for CoreLayout; build completes (ECONNREFUSED warnings OK).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/CoreLayout.astro
git commit -m "feat(seo): enrich OG/Twitter tags (locale, image dims, alt, article meta) and default to og-default.png"
```

---

## Phase 2 - robots.txt & sitemap

**Why:** Lets crawlers discover and index all public URLs. Independent of Phases 1/3/4.

### Task 2.1: Install and register `@astrojs/sitemap`

**Files:**
- Modify: `package.json` (via install)
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install the integration**

Run:
```bash
cd /Users/hafiz/Developments/portfolio-astro
npm install @astrojs/sitemap
```
Expected: `@astrojs/sitemap` added to `dependencies`.

- [ ] **Step 2: Register it in `astro.config.mjs`**

Add the import at the top with the other integration imports:

```js
import sitemap from '@astrojs/sitemap';
```

Change the integrations line from `integrations: [react()],` to:

```js
integrations: [
  react(),
  sitemap({
    filter: (page) =>
      !page.includes('/admin') &&
      !page.includes('/login'),
  }),
],
```

- [ ] **Step 3: Build and confirm sitemap emitted**

Run:
```bash
npm run build
ls dist/sitemap-index.xml dist/sitemap-0.xml 2>/dev/null && echo "SITEMAP OK"
```
Expected: `SITEMAP OK`. (Note: with `output: "server"`, only `prerender = true` routes are listed. Family + any static routes appear; SSR detail pages won't be auto-listed - acceptable, the index links to listing pages crawlers will follow.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat(seo): generate sitemap.xml via @astrojs/sitemap, excluding admin/login"
```

### Task 2.2: Add robots.txt

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Write robots.txt**

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /login

Sitemap: https://hafizbahtiar.com/sitemap-index.xml
```

- [ ] **Step 2: Verify it ships**

Run:
```bash
npm run build
cat dist/robots.txt
```
Expected: prints the contents above (files in `public/` are copied verbatim to `dist/`).

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(seo): add robots.txt pointing to sitemap, disallow admin/login"
```

---

## Phase 3 - Blog detail page server-side rendering

**Why:** This is the headline fix. Today `src/pages/blog/[slug]/index.astro` fetches the post in the browser (`:462`) and patches meta with JS (`:541`) - invisible to crawlers. We fetch server-side in frontmatter and render meta, JSON-LD, and the article body in the initial HTML.

**Approach:** Keep `prerender = false` (request-time SSR). Fetch the post in frontmatter; 404 if missing. Pass real `title`/`description`/`type="article"`/`publishedTime` to `PublicLayout`. Port the three markup builders (`buildSectionsHTML`, `buildChecklistHTML`, `buildMinimapHTML`) and the body-content branch from the existing client `<script>` (currently `:369-445`, `:511-536`) into Astro template markup. **Keep** the read-progress `<script>` (`:292-347`) - it is presentation-only and still needed. **Remove** the data-loading `<script>` (`:349-563`) since the server now renders everything.

### Task 3.1: Create the reusable JsonLd component

**Files:**
- Create: `src/components/seo/JsonLd.astro`

- [ ] **Step 1: Write the component**

```astro
---
interface Props {
  schema: Record<string, unknown>;
}
const { schema } = Astro.props;
---
<script type="application/ld+json" set:html={JSON.stringify(schema)} is:inline />
```

> `set:html` with `JSON.stringify` is safe here because the value is a serialized object, not raw HTML; Astro will not escape inside a `<script>` and JSON.stringify escapes `<`/`>` adequately for `ld+json`. Do not interpolate untrusted strings outside `JSON.stringify`.

- [ ] **Step 2: Verify types**

Run: `npx astro check 2>&1 | grep -E "JsonLd|error ts" | head`
Expected: no errors for `JsonLd.astro`.

- [ ] **Step 3: Commit**

```bash
git add src/components/seo/JsonLd.astro
git commit -m "feat(seo): add reusable JsonLd.astro structured-data component"
```

### Task 3.2: Fetch the post server-side and set real meta

**Files:**
- Modify: `src/pages/blog/[slug]/index.astro` (frontmatter + `<PublicLayout>` open tag)

- [ ] **Step 1: Replace the frontmatter**

Replace the frontmatter block (currently lines 1-17) with:

```astro
---
export const prerender = false;
import PublicLayout from "../../../layouts/PublicLayout.astro";
import JsonLd from "../../../components/seo/JsonLd.astro";
import { blogService } from "../../../lib/blog";
import { sanitizeRichHtml } from "../../../lib/sanitize";

const slug = Astro.params.slug ?? "";

let post = null;
try {
  post = slug ? await blogService.getPublicPostBySlug(slug) : null;
} catch (err) {
  console.error("Failed to load blog post", slug, err);
}

if (!post) {
  return Astro.redirect("/404");
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const publishedISO = post.publishedDate ?? post.createdAt;
const metaDescription = post.excerpt || "Insights on building reliable products, clean architecture, and shipping fast.";

// TODO(backend): when BlogPost gains coverImageUrl, use it here:
// const ogImage = post.coverImageUrl ?? undefined; (undefined => CoreLayout default)
const ogImage = undefined;

const canonical = new URL(`/blog/${post.slug}`, Astro.site ?? new URL(Astro.url.origin)).toString();

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: metaDescription,
  datePublished: publishedISO,
  dateModified: post.updatedAt ?? publishedISO,
  author: { "@type": "Person", name: "Hafiz Bahtiar" },
  publisher: { "@type": "Person", name: "Hafiz Bahtiar" },
  mainEntityOfPage: canonical,
  keywords: (post.tags ?? []).join(", "),
};

const sections = post.sections ?? [];
const checklist = post.checklist ?? [];
const bodyHtml = sections.length === 0 && post.bodyContent ? sanitizeRichHtml(post.bodyContent) : "";
---
```

- [ ] **Step 2: Replace the `<PublicLayout ...>` open tag**

Change (currently lines 19-22):

```astro
<PublicLayout
  title="Blog Post - Hafiz Bahtiar"
  description="Insights on building reliable products, clean architecture, and shipping fast."
>
```

to:

```astro
<PublicLayout
  title={`${post.title} - Hafiz Bahtiar`}
  description={metaDescription}
  image={ogImage}
  type="article"
  publishedTime={publishedISO ?? undefined}
>
  <JsonLd schema={articleSchema} />
```

- [ ] **Step 3: Verify the title/description now appear server-side later (deferred)**

This task is verified together with Task 3.3 (the body must render before the page is valid). Proceed to 3.3.

### Task 3.3: Render the article body server-side and remove the client fetch

**Files:**
- Modify: `src/pages/blog/[slug]/index.astro` (body markup + scripts)

- [ ] **Step 1: Replace the placeholder containers with server-rendered content**

In the current markup the IDE-style shell fills these placeholders via JS:
`post-file-slug`, `post-title-display`, `post-date-display`, `post-readtime-display`, `post-tags-display`, `post-title`, `post-hero-text`, `post-sections`, `post-body-content`, `post-checklist`, `post-minimap` (see `:478-536`).

Replace each placeholder's empty content with the server value, porting the exact markup currently produced by `buildSectionsHTML` (`:369-387`), `buildChecklistHTML` (`:389-409`), and `buildMinimapHTML` (`:411-445`) into Astro `.map(...)` template expressions. Concretely:

- `<span id="post-file-slug"></span>` → `<span>{post.slug}.mdx</span>`
- `<span id="post-title-display"></span>` → `<span>{`"${post.title}"`}</span>`
- `<span id="post-date-display"></span>` → `<span>{formatDate(publishedISO)}</span>`
- `<span id="post-readtime-display"></span>` → `<span>{post.readTimeMinutes ? `"${post.readTimeMinutes} min read"` : ""}</span>`
- `<span id="post-tags-display"></span>` → `<span>{`[${(post.tags ?? []).map((t) => `"${t}"`).join(", ")}]`}</span>`
- `<... id="post-title">` → `{post.title}`
- `<... id="post-hero-text">` → `{post.heroText ? `// ${post.heroText}` : "//"}`
- `<div id="post-sections">` → render sections:

```astro
<div id="post-sections">
  {sections.map((section, index) => (
    <div class="group relative pl-6 border-l-2 border-slate-200 hover:border-blue-500/50 transition-colors scroll-mt-24 py-2" id={`section-${index + 1}`}>
      <div class="absolute -left-[7px] top-6 w-3 h-3 rounded-full bg-surface-code border-2 border-slate-400 group-hover:border-blue-500 transition-colors"></div>
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-blue-500/60 font-mono text-sm">{`0${index + 1}`}</span>
          <span class="h-px w-8 bg-slate-100 group-hover:bg-slate-200 transition-colors"></span>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 font-sans tracking-tight group-hover:text-slate-900 transition-colors">{section.heading}</h2>
      </div>
      <p class="text-base md:text-lg text-slate-500 leading-relaxed font-sans group-hover:text-slate-700 transition-colors">{section.body}</p>
    </div>
  ))}
</div>
```

- `<div id="post-body-content">` → render sanitized HTML when there are no sections:

```astro
<div id="post-body-content">
  {bodyHtml && (
    <div class="rounded-2xl border border-slate-200 bg-surface-code p-6 md:p-8 text-slate-700 prose prose-invert max-w-none" set:html={bodyHtml} />
  )}
</div>
```

- `<div id="post-checklist">` → render checklist when present:

```astro
<div id="post-checklist">
  {checklist.length > 0 && (
    <div class="mt-12 rounded-lg border border-slate-200 bg-surface-code-rail p-6 font-mono text-sm shadow-lg">
      <div class="flex items-center gap-2 mb-4 border-b border-slate-300 pb-3">
        <span class="text-yellow-400">TODO:</span>
        <span class="text-slate-700">Implementation Checklist</span>
      </div>
      <ul class="space-y-2">
        {checklist.map((item) => (
          <li class="flex items-start gap-3 group cursor-default">
            <span class="text-slate-400 font-bold group-hover:text-green-400 transition-colors">[ ]</span>
            <span class="text-slate-500 group-hover:text-slate-700 transition-colors">{item.itemText}</span>
          </li>
        ))}
      </ul>
    </div>
  )}
</div>
```

- `<aside id="post-minimap" class="hidden lg:block">` → render the minimap when sections exist (port of `buildMinimapHTML`, `:411-445`); drop the `hidden` class since visibility is now static:

```astro
<aside id="post-minimap" class="lg:block">
  {sections.length > 0 && (
    <div class="sticky top-24 space-y-4 rounded-lg border border-slate-200 bg-surface-code p-4 shadow-xl">
      <div class="flex items-center justify-between text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
        <span>Minimap</span>
        <span id="read-percent" class="text-blue-400">0%</span>
      </div>
      <div class="relative w-full bg-slate-100 rounded h-1.5 overflow-hidden">
        <div id="read-progress-ghost" class="absolute top-0 left-0 h-full bg-blue-500 w-0 transition-all duration-100"></div>
      </div>
      <div class="pt-4 border-t border-slate-200">
        <div class="text-[10px] font-mono text-slate-400 mb-3 uppercase tracking-wider">Symbols</div>
        <ul class="space-y-1">
          {sections.map((section, index) => (
            <li>
              <a href={`#section-${index + 1}`} class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors group">
                <span class="text-blue-500/70 text-xs font-mono group-hover:text-blue-400">#</span>
                <span class="text-slate-500 text-xs font-mono truncate group-hover:text-slate-700 transition-colors">{section.heading}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div class="pt-4 mt-2 border-t border-slate-200">
        <div class="flex justify-between text-[10px] font-mono text-slate-600">
          <span>{`Ln ${sections.length * 15}, Col 1`}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )}
</aside>
```

> Also remove any loading/error wrapper logic that toggled `blog-post-loading` / `blog-post-content` visibility (the `hidden` classes and the `#blog-post-loading` block earlier in the file). Since content is server-rendered, the loading skeleton and error state are no longer reachable - delete them so the article shows immediately. Search the file for `blog-post-loading`, `blog-post-error`, `blog-post-content` and remove those wrapper elements, leaving the article markup as the always-visible content.

- [ ] **Step 2: Delete the data-loading script, keep the read-progress script**

Remove the entire second `<script>` block (currently `:349-563`, the one beginning `import { sanitizeRichHtml }` and containing `loadBlogPost`). **Keep** the first `<script>` block (`:292-347`, read-progress) intact - but since `set:html` content and IDs now render on the server, confirm `#article-content`/`#read-progress` IDs still exist in the markup it queries; they do (the progress bar markup at the top of the file is unchanged).

- [ ] **Step 3: Type-check**

Run: `npx astro check 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "blog/\[slug\]|error ts" | head`
Expected: no errors for `blog/[slug]/index.astro`. (If `section`/`item`/`t` params report implicit-any, annotate them: `(section: BlogSection, index: number)`, `(item: BlogChecklist)`, `(t: string)` - import `BlogSection`, `BlogChecklist` from `../../../types/blog`.)

- [ ] **Step 4: Build and assert real meta in server HTML**

Run:
```bash
npm run build && npm run preview &
sleep 4
# Replace <real-slug> with an existing published post slug from the API:
curl -s http://localhost:4321/blog/<real-slug> | grep -Eo '<title>[^<]+|og:title" content="[^"]+|application/ld\+json' | head
kill %1
```
Expected: `<title>` shows the **post's real title** (not "Blog Post - Hafiz Bahtiar"), `og:title` matches, and `application/ld+json` is present. If the API is unreachable locally, verify instead with the running backend dev server, or confirm via `npm run dev` and a real slug.

- [ ] **Step 5: Commit**

```bash
git add "src/pages/blog/[slug]/index.astro"
git commit -m "feat(seo): server-render blog posts with real meta, OG, and BlogPosting JSON-LD"
```

---

## Phase 4 - Project detail page server-side rendering

**Why:** Same crawler-invisibility problem as blog. `src/pages/projects/[slug]/index.astro` fetches client-side (`:372`). Projects **have** `imageUrl`, so per-project OG images work immediately.

**Approach:** Keep `prerender = false`. Fetch project (and policy) in frontmatter; 404 if missing. Pass real `title`/`description`/`image={project.imageUrl}` to `ProjectLayout`. Port the project render markup from the client `<script>` (`:111-416`) into Astro template syntax. Emit `CreativeWork`/`SoftwareApplication` JSON-LD.

### Task 4.1: Fetch project server-side and set real meta

**Files:**
- Modify: `src/pages/projects/[slug]/index.astro` (frontmatter + `<ProjectLayout>` open tag)

- [ ] **Step 1: Replace the frontmatter**

Replace the frontmatter block (currently lines 1-14) with:

```astro
---
export const prerender = false;
import ProjectLayout from "../../../layouts/ProjectLayout.astro";
import JsonLd from "../../../components/seo/JsonLd.astro";
import { projectsService } from "../../../lib/projects";

const slug = Astro.params.slug ?? "";

let project = null;
let policy = null;
try {
  if (slug) {
    project = await projectsService.getProjectBySlug(slug);
    policy = await projectsService.getProjectPolicyBySlug(slug).catch(() => null);
  }
} catch (err) {
  console.error("Failed to load project", slug, err);
}

if (!project) {
  return Astro.redirect("/404");
}

const formatStatus = (status?: string) => {
  if (!status) return "Completed";
  return status
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const metaDescription = project.description || "View project details.";
const canonical = new URL(`/projects/${project.slug}`, Astro.site ?? new URL(Astro.url.origin)).toString();

const projectSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: project.title,
  description: metaDescription,
  url: canonical,
  image: project.imageUrl ? new URL(project.imageUrl, Astro.site ?? new URL(Astro.url.origin)).toString() : undefined,
  dateCreated: String(project.year ?? ""),
  keywords: (project.technologies ?? []).join(", "),
  creator: { "@type": "Person", name: "Hafiz Bahtiar" },
};
---
```

- [ ] **Step 2: Replace the `<ProjectLayout ...>` open tag**

Change (currently lines 16-19):

```astro
<ProjectLayout
  title="Project - Hafiz Bahtiar"
  description="View project details."
>
```

to:

```astro
<ProjectLayout
  title={`${project.title} - Hafiz Bahtiar`}
  description={metaDescription}
  image={project.imageUrl || undefined}
  imageAlt={project.title}
>
  <JsonLd schema={projectSchema} />
```

- [ ] **Step 3: Proceed to 4.2** (body must render before verifying).

### Task 4.2: Render project body server-side and remove the client fetch

**Files:**
- Modify: `src/pages/projects/[slug]/index.astro` (body markup + scripts)

- [ ] **Step 1: Replace the `#project-content` placeholder with server-rendered markup**

The client script builds the project view inside `#project-content` and toggles `#project-loading`/`#project-error` (`:85-87`, render code `:111-416`). Replace the loading/error/empty-content trio with the always-visible server-rendered project view, porting the exact markup the client builder emits (title, `project.description`, `formatStatus(project.status)`, `project.imageUrl` hero, technologies list, features, `githubUrl`/`liveUrl` links, year/role). Use the data already in `project`. Tabs that were wired by the client `<script>` (privacy/terms) should link to `/projects/${project.slug}/privacy` and `/projects/${project.slug}/terms` (those routes exist) or render `policy.privacyPolicy` / `policy.termsAndConditions` inline if present.

Because the project body markup is sizeable and already exists in the client `<script>`, port it block-by-block: copy each `escapeHtml(project.X)` interpolation to `{project.X}` (Astro auto-escapes), copy each `${...}` to `{...}`, and copy conditional sections (`features?.length`, `policy`) to `{cond && ( ... )}`. Keep all class names identical so styling is unchanged.

- [ ] **Step 2: Remove the data-loading `<script>`; keep the tab-switch behavior**

Delete the `<script>` block that performs `fetch(...)` and DOM injection (`:111-416`). If tab switching (privacy/terms/overview) was handled there, re-add a **small** presentation-only `<script>` that only toggles `.is-active` on `.tab-btn` and shows/hides the corresponding panels - no data fetching. Keep the `<style>` block (`:89-109`) unchanged.

- [ ] **Step 3: Type-check**

Run: `npx astro check 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "projects/\[slug\]/index|error ts" | head`
Expected: no errors. (Annotate any implicit-any params, e.g. `(w: string)` in `formatStatus`, `(tech: string)` when mapping technologies.)

- [ ] **Step 4: Build and assert real meta**

Run:
```bash
npm run build && npm run preview &
sleep 4
curl -s http://localhost:4321/projects/<real-slug> | grep -Eo '<title>[^<]+|og:title" content="[^"]+|og:image" content="[^"]+|application/ld\+json' | head
kill %1
```
Expected: `<title>` is the project's real title; `og:image` is the project's `imageUrl` (absolute); JSON-LD present.

- [ ] **Step 5: Commit**

```bash
git add "src/pages/projects/[slug]/index.astro"
git commit -m "feat(seo): server-render projects with real meta, per-project OG image, and CreativeWork JSON-LD"
```

### Task 4.3: Pass project image to privacy/terms subpages

**Files:**
- Modify: `src/pages/projects/[slug]/privacy.astro`
- Modify: `src/pages/projects/[slug]/terms.astro`

- [ ] **Step 1: Confirm these pages already fetch `project` in frontmatter**

Run:
```bash
sed -n '1,45p' "src/pages/projects/[slug]/privacy.astro"
```
Expected: shows a frontmatter that resolves `project` (they pass `title={...project?.title}` per the earlier audit at `:40-41`). If `project` is available, continue; if it's only client-side, skip this task and note it.

- [ ] **Step 2: Add `image` to the `<ProjectLayout>` tag in both files**

In each file, add to the `<ProjectLayout ...>` open tag:

```astro
  image={project?.imageUrl || undefined}
  imageAlt={project?.title}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx astro check 2>&1 | grep "error ts" | head`
Expected: no new errors.

```bash
git add "src/pages/projects/[slug]/privacy.astro" "src/pages/projects/[slug]/terms.astro"
git commit -m "feat(seo): pass project image to privacy/terms social cards"
```

---

## Phase 5 - Site-wide structured data

**Why:** Rich results for the homepage (knowledge-panel `Person`, site `WebSite`). Low risk, uses the `JsonLd` component from Phase 3.

### Task 5.1: Add Person + WebSite JSON-LD to the homepage

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Import JsonLd and define the schema in frontmatter**

In the frontmatter of `src/pages/index.astro`, add the import (with the other imports):

```astro
import JsonLd from "../components/seo/JsonLd.astro";
```

And define (adjust `sameAs` links to the user's real profiles - ask if unknown; omit `sameAs` if none are confirmed):

```astro
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Hafiz Bahtiar",
  jobTitle: "Flutter Developer",
  url: "https://hafizbahtiar.com",
  sameAs: [
    "https://github.com/hafizbahtiar",
  ],
};
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hafiz Bahtiar",
  url: "https://hafizbahtiar.com",
};
```

- [ ] **Step 2: Render the JsonLd components**

Immediately inside the `<PublicLayout>` opening tag in `src/pages/index.astro` (line ~87), add:

```astro
  <JsonLd schema={personSchema} />
  <JsonLd schema={websiteSchema} />
```

- [ ] **Step 3: Build + assert**

Run:
```bash
npm run build && npm run preview &
sleep 4
curl -s http://localhost:4321/ | grep -c 'application/ld+json'
kill %1
```
Expected: `2` (two JSON-LD blocks).

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(seo): add Person and WebSite JSON-LD to homepage"
```

---

## Final verification (run after all phases)

- [ ] **Type safety:** `npx astro check 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -c "error ts"` → expect `0`.
- [ ] **Build:** `npm run build` → completes (ECONNREFUSED OK).
- [ ] **Share preview spot-check:** With the backend reachable, run `npm run dev` and paste a blog URL and a project URL into a card validator (e.g. opengraph.xyz or the platform's debugger). Confirm distinct titles, descriptions, and images per page.
- [ ] **robots/sitemap:** `curl -s http://localhost:4321/robots.txt` and confirm `/sitemap-index.xml` resolves on the deployed site.

---

## Self-Review notes (author checklist results)

- **Spec coverage:** Every audit gap is mapped - client-side meta → Phase 3/4; layout drops `image` → Phase 1.2/1.3; wrong OG image size → Phase 1.1/1.4; no robots → 2.2; no sitemap → 2.1; no JSON-LD → 3.1/3.2/4.1/5.1; missing `og:type=article`/`article:published_time`/dimensions/alt → 1.4. Twitter handle intentionally deferred pending a real handle.
- **Backend gap:** blog cover image is the only item requiring backend work - isolated in "Backend Coordination" with a one-line frontend switch marked `TODO(backend)` in Task 3.2.
- **Type consistency:** service methods (`getPublicPostBySlug`, `getProjectBySlug`, `getProjectPolicyBySlug`), types (`BlogPost`, `BlogSection`, `BlogChecklist`, `Project`), and the `image`/`type`/`publishedTime`/`imageAlt` prop names are used identically across CoreLayout → PublicLayout → ProjectLayout and the pages.
- **Verification adapted** to this repo's no-test reality per `CLAUDE.md` (build + astro check + curl HTML assertions).
