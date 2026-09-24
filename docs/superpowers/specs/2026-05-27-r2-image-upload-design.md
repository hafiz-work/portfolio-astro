# R2 Image Upload Helper - Design Spec
_Date: 2026-05-27_

## Goal

Replace the base64-over-FormData hack in the avatar picker with a real upload flow. Add the
same upload affordance to the project image URL field. Both places write a permanent R2 URL
directly into the relevant `<input>`, so every existing form save path (`handleSave` in
profile, and the project form submission) picks up the URL through their existing `FormData`
flows with no wiring changes.

---

## `src/lib/upload.ts`

**What it does:** Single exported async function `uploadImage(file: File): Promise<string>`.

**How it works:**
1. Add `export const getSharedAccessToken = () => _accessToken;` to `src/lib/api-client.ts` - the only change to the shared module.
2. `uploadImage` reads the token via `getSharedAccessToken()`.
3. Builds a `FormData` with the file appended under the key `"file"` (verify against the `/owner/upload` handler in `hono-workers` - change the key name if the backend expects something else).
4. `fetch`-POSTs to `${import.meta.env.PUBLIC_API_URL}/owner/upload` with `Authorization: Bearer <token>`. No `Content-Type` header - the browser sets the multipart boundary automatically.
5. Parses the standard `ApiResponse<{ url: string }>` envelope: `{ success: true, data: { url: "https://pub-xxx.r2.dev/images/abc123.webp" } }`.
6. Returns `data.data.url` on success.
7. Throws `ApiError` (imported from `api-client.ts`) on HTTP error or `success: false`.

**Why standalone (not a class):** The upload is always user-triggered; a visible error on expired auth is acceptable. There's no reason to add a class for one endpoint. Callers catch and `alert` on error.

---

## `src/pages/admin/profile.astro` - Avatar picker

**Remove:**
- `let newAvatarBase64: string | null = null;`
- The entire `FileReader` block inside `avatarUpload change` handler
- The `if (newAvatarBase64)` guard in `avatarInput input` handler
- The `if (newAvatarBase64) { data.avatarUrl = newAvatarBase64; }` block in `handleSave`

**Add:**
- Import `uploadImage` in the `<script>` block
- In `avatarUpload change` handler: call `await uploadImage(file)`, set `avatarImg.src` to the returned URL, set `avatarInput.value` to the returned URL
- Show a loading state (disable the file input or swap the label text) while upload is in flight
- On error: `alert('Upload failed: ' + error.message)`

**Result:** `handleSave` reads `avatarUrl` from `FormData` as normal - no special case needed.

---

## `src/components/admin/projects/ProjectForm.astro` - Image URL field

**Current markup (line 71–73):**
```html
<div class="space-y-2">
  <label class={labelClass}>Image URL</label>
  <input type="text" name="imageUrl" class={inputClass} />
</div>
```

**New markup:** Keep the text input. Below it, add a secondary upload row: a hidden `<input type="file" accept="image/*">` and a styled label that acts as the upload button. A small status `<span>` shows "Uploading…" while in flight.

**Add `<script>` block to `ProjectForm.astro`:**
- On file input `change`: disable the upload button, set status text to "Uploading…"
- Call `await uploadImage(file)`, set `imageUrlInput.value` to returned URL
- Restore button, clear status on success; alert on error

---

## Error handling

| Scenario | Behaviour |
|---|---|
| File > 2 MB (profile) | Existing size guard already blocks - unchanged |
| Network / server error | `ApiError` thrown, caught at call site, `alert(error.message)` |
| Auth expired during upload | `ApiError` with status 401 thrown; user sees alert, page refresh re-auths |

---

## Non-goals

- No token-refresh retry in the upload helper (the upload is user-triggered; the standard refresh loop handles the session on the next navigation)
- No drag-and-drop
- No progress bar
- No multi-file upload
