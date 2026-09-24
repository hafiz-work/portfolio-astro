# Backend task: add `coverImageUrl` to blog posts

**Repo:** `/Users/hafiz/Developments/hono-workers` (Hono + Cloudflare Workers + D1). Branch off `main`.

**Why:** The portfolio frontend now server-renders blog detail pages and uses a per-post image for the Open Graph / Twitter share card (and blog listing cards). Blog posts currently have **no image field**, so they fall back to the site default `og-default.png`. Adding `coverImageUrl` lets each post supply its own social-share image. There is a `TODO(backend)` marker in the frontend at `src/pages/blog/[slug]/index.astro` waiting on this field.

**Field semantics:** `coverImageUrl` is an optional image URL (absolute `https://…` or root-relative `/…`), ideally sized ~1200×630 for social cards. Nullable. No other behavior changes.

This mirrors how `projects` already expose `imageUrl`.

---

## Changes (follow the repo's existing blog conventions)

### 1. Migration - `src/database/migrations/009_blog_cover_image.sql` (new)
```sql
ALTER TABLE blog_posts ADD COLUMN cover_image_url TEXT;
```
Apply with the repo's scripts: `npm run db:migrate` (local) and `npm run db:migrate:remote` (production). The migrate script tracks versions in `schema_migrations`.

> Also add the column to `src/database/schemas/blog.sql` (the canonical schema doc) under the metadata section, e.g. after `hero_text`:
> `cover_image_url TEXT, -- absolute or root-relative social-share image (~1200x630)`

### 2. Types - `src/types/blog.ts`
Add `coverImageUrl: string | null` to **`BlogPost`** (after `heroText`) and to **`BlogPostSummary`** (so listing cards can use it too). Add `coverImageUrl?: string | null` to **`CreateBlogPostData`**. `UpdateBlogPostData` extends `Partial<CreateBlogPostData>` so it inherits it automatically.

### 3. Validator - `src/validators/blog.ts`
In both `BlogCreateSchema` and `BlogUpdateSchema` add (matching the existing nullable-optional style):
```ts
coverImageUrl: z.string().url().max(2048).optional().nullable(),
```
> Note: both schemas use `.strict()`, so the field MUST be added or requests including it will be rejected. If root-relative paths (e.g. `/images/x.png`) should be allowed, relax `.url()` to a permissive `z.string().max(2048)` or a regex that accepts `^(https?://|/)`.

### 4. Service - `src/services/blog.ts`
- **SELECTs (4):** add `cover_image_url` to the column lists at lines ~34, ~45, ~61, ~71 (the two summary SELECTs and the two full-post SELECTs).
- **INSERT (~line 100):** add `cover_image_url` to the column list and a matching `?`, and bind `data.coverImageUrl ?? null` in the correct position.
- **UPDATE (~lines 147–176):** add to the "any field present?" guard (`|| data.coverImageUrl !== undefined`) and add the conditional:
  ```ts
  if (data.coverImageUrl !== undefined) {
      fields.push('cover_image_url = ?')
      values.push(data.coverImageUrl)
  }
  ```
- **Mappers:** in `mapRowToBlogPost` (~line 352) AND `mapRowToBlogPostSummary` (~line 372) add:
  ```ts
  coverImageUrl: row.cover_image_url !== null && row.cover_image_url !== undefined ? String(row.cover_image_url) : null,
  ```

### 5. Routes
No route changes needed. `GET /api/v1/blog` and `GET /api/v1/blog/:slug` (in `src/routes/v1/public/blog.ts`) and the owner create/update routes already pass validated data straight through the service. The field flows automatically once 1–4 are done.

---

## Verify
1. `npm run db:migrate` then start the worker (`npm run dev` or equivalent).
2. Owner create/update a post with `"coverImageUrl": "https://example.com/cover.png"`.
3. `GET /api/v1/blog/<slug>` → response `data.coverImageUrl` is the saved URL.
4. `GET /api/v1/blog` → each summary includes `coverImageUrl`.
5. Existing posts return `coverImageUrl: null` (column is nullable, no backfill needed).
6. Confirm `API_CONTRACT.md` is updated if it enumerates blog fields.

## After backend ships (frontend side - handled separately)
- Add `coverImageUrl: string | null` to the frontend `src/types/blog.ts` (`BlogPost` + `BlogPostSummary`).
- Flip the `TODO(backend)` in `src/pages/blog/[slug]/index.astro` from `const ogImage = undefined;` to `const ogImage = post.coverImageUrl ?? undefined;` (undefined keeps the CoreLayout default fallback).
- Optionally surface the cover on blog listing cards and add a cover-image input to the admin blog form.
