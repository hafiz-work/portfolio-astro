# Public Media Carousel Spec (Phase 5)

**Status:** Draft (Phase 1, built in Phase 4 Stage I)
**Inspiration:** App Store / Play Store screenshot strips - but **evidence-driven**, portfolio-specific, never decorative.
**Data source:** `project_media` (ordered by `sort_order`, `is_visible=1`) joined to `media_assets`. **No images hardcoded in components.**

---

## 1. Behavior
- **Horizontal scroll** strip (snap points), one source of order = admin drag order.
- **No forced autoplay** (videos are click-to-play; respects `prefers-reduced-motion`).
- **Keyboard accessible:** focusable track, `←/→` to move, `Home/End` to jump, visible focus ring, `aria-roledescription="carousel"`, each slide `role="group"` + `aria-label` from caption/alt, live region announcing "item X of N".
- **Touch/swipe friendly:** native scroll-snap + momentum; arrow buttons on pointer devices.
- Works mobile + desktop; container respects `container-main`.

## 2. Item model
Each item renders from `project_media`:
- `image` or `video` (`media_type`).
- `alt` (required - from `media_assets.alt_text`).
- optional `caption` (explains value/contribution, e.g. "Offline PDF export - works with zero connectivity").
- optional `device_frame`: `phone | tablet | desktop | browser | none` → CSS frame wrapper (no heavy image assets for frames).
- `architecture_diagram` type renders full-width, uncropped, with caption.

## 3. Performance / layout
- **Lazy load** all but the first 1–2 items (`loading="lazy"`, `decoding="async"`; first item eager + high fetchpriority).
- **No layout shift:** every item has known `width`/`height` (from `media_assets`) → reserved aspect-ratio box; optional `blurhash`/dominant-color placeholder while loading.
- Use `<Image>`/responsive `srcset` where the asset is a real screenshot; avoid upscaling logos (reuse the existing variant logic).
- Respect the existing CSP (`img-src https:` is already broad; R2 + remote hosts allowed).

## 4. Accessibility checklist
- [ ] Reachable and operable by keyboard alone.
- [ ] Every slide image has meaningful alt; captions are real text, not baked into images.
- [ ] Controls have accessible names; state announced via `aria-live="polite"`.
- [ ] `prefers-reduced-motion`: disable smooth-scroll animation, no autoplay.
- [ ] Sufficient contrast on controls in both themes (slate/cyan/blue palette).

## 5. Project **detail** page usage
- Full carousel placed **after the hero**, before the written case study.
- **5–7 images ideal**; captions explain value/contribution.
- Falls back to single cover image, then "Media coming soon" placeholder (already shipped Phase 0) when empty.

## 6. Project **list** page usage
- **Cover image only** by default.
- For **featured** projects, allow a **max 2–3** thumbnail preview (from `project_media where is_featured=1`).
- **Do NOT** mount a heavy carousel on every card (performance + visual noise).

## 7. Implementation notes
- Astro component + minimal vanilla JS (scroll-snap + intersection-based active-index), or a small React island only if interactivity warrants it. Prefer CSS scroll-snap to keep JS light and SSR-friendly; re-init on `astro:page-load` (existing pattern).
- Single component reused on detail (full) and list (thumbnail) via props (`variant="full" | "thumbnails"`).

## 8. Acceptance criteria
- [ ] Order matches admin drag order, no hardcoded arrays.
- [ ] Keyboard + touch operable; no CLS; lazy-loaded.
- [ ] Captions present and meaningful; alt text on every image.
- [ ] Empty state falls back gracefully.
- [ ] List cards stay lightweight (cover/thumbnails only).
