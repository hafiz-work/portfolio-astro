import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, ImageUp, Loader2 } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { compressImage, uploadImage, UPLOAD_TYPES } from "../../../../lib/upload";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import { Select } from "../../../ui/Select";
import type { ProjectMedia, MediaType, DeviceFrame, MediaAsset, MediaAssetInput } from "../../../../types/project-cms";

const MEDIA_TYPES: MediaType[] = ["screenshot", "video", "architecture_diagram", "logo", "cover", "og", "other"];
const DEVICE_FRAMES: DeviceFrame[] = ["none", "phone", "tablet", "desktop", "browser"];
const MEDIA_LABEL: Record<MediaType, string> = {
  screenshot: "Screenshot", video: "Video", architecture_diagram: "Architecture diagram",
  logo: "Logo", cover: "Cover image", og: "Social share (OG)", other: "Other",
};
const TYPE_OPTIONS = MEDIA_TYPES.map((t) => ({ value: t, label: MEDIA_LABEL[t] }));
const FRAME_OPTIONS = DEVICE_FRAMES.map((f) => ({ value: f, label: f === "none" ? "No frame" : f[0].toUpperCase() + f.slice(1) }));
// The Cover's frame drives the project card's device-frame preview (ProjectPreview.astro).
const COVER_FRAME_OPTIONS = [
  { value: "none", label: "Card: auto" },
  { value: "phone", label: "Card: phone" },
  { value: "browser", label: "Card: web app" },
];

// Only carousel media is shown in a device frame (see MediaCarousel.astro).
const GALLERY_TYPES: MediaType[] = ["screenshot", "video", "architecture_diagram"];

// One-per-project roles - a multi-file upload only gives the first file this type.
const SINGLE_TYPES: MediaType[] = ["cover", "logo", "og"];
const MAX_UPLOAD = 5 * 1024 * 1024; // backend limit (routes/v1/owner/upload.ts)
const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

const snapshot = (it: ProjectMedia) =>
  JSON.stringify([it.mediaType, it.caption ?? "", it.deviceFrame, it.isVisible, it.isFeatured, it.asset?.altText ?? ""]);

export function MediaManager({ projectId, projectTitle, onChanged }: { projectId: number; projectTitle: string; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ url: "", altText: "", mediaType: "screenshot" as MediaType });
  const saved = useRef(new Map<number, string>());
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Alt text is required to publish, so the system writes it: the caption if
  // there is one, else "<project> <type>". Editing it just overrides the default.
  const defaultAlt = (type: MediaType, caption?: string | null) =>
    caption?.trim() || `${projectTitle || "Project"} ${MEDIA_LABEL[type].toLowerCase()}`;

  const load = async () => {
    setLoading(true);
    try {
      let rows = await cmsService.listProjectMedia(projectId);
      // Backfill media that predates auto alt text, so it never blocks publishing.
      const missing = rows.filter((r) => r.asset && !r.asset.altText?.trim());
      if (missing.length) {
        await Promise.all(missing.map((r) => cmsService.updateMediaAsset(r.asset!.id, { altText: defaultAlt(r.mediaType, r.caption) })));
        rows = await cmsService.listProjectMedia(projectId);
        onChanged();
      }
      saved.current = new Map(rows.map((r) => [r.id, snapshot(r)]));
      setItems(rows);
      // New media defaults to Cover until the project has one - the card needs it.
      setDraft((d) => ({ ...d, mediaType: rows.some((r) => r.mediaType === "cover") ? "screenshot" : "cover" }));
    }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const setField = (id: number, patch: Partial<ProjectMedia>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const setAssetField = (id: number, patch: Partial<MediaAsset>) =>
    setItems((prev) => prev.map((it) => (it.id === id && it.asset ? { ...it, asset: { ...it.asset, ...patch } } : it)));

  const attach = async (input: MediaAssetInput & { url: string }, mediaType: MediaType) => {
    const asset = await cmsService.createMediaAsset({ ...input, altText: input.altText?.trim() || defaultAlt(mediaType) });
    if (!asset) throw new Error("Asset create failed");
    await cmsService.attachMedia(projectId, { mediaAssetId: asset.id, mediaType });
  };

  const addByUrl = async () => {
    if (!draft.url.trim()) { showToast({ type: "warning", title: "URL required" }); return; }
    try {
      await attach({ url: draft.url.trim(), altText: draft.altText }, draft.mediaType);
      setDraft({ url: "", altText: "", mediaType: "screenshot" });
      await load(); onChanged();
      showToast({ type: "success", title: "Media added" });
    } catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message }); }
  };

  // Compress in the browser (backend stores bytes as-is), upload, then attach.
  // Only the first file takes a one-per-project type (cover/logo/og); the rest become screenshots.
  const addFiles = async (picked: File[]) => {
    const files = picked.filter((f) => UPLOAD_TYPES.includes(f.type));
    if (files.length < picked.length) showToast({ type: "warning", title: "Skipped unsupported files", message: "Use JPG, PNG, WebP or GIF." });
    if (!files.length) return;
    let done = 0, before = 0, after = 0;
    try {
      for (const [n, original] of files.entries()) {
        const of = files.length > 1 ? ` ${n + 1} of ${files.length}` : "";
        setBusy(`Compressing${of}…`);
        const { file, width, height } = await compressImage(original);
        if (file.size > MAX_UPLOAD) throw new Error(`"${original.name}" is still over 5 MB after compression.`);
        setBusy(`Uploading${of}…`);
        const url = await uploadImage(file);
        const type = n > 0 && SINGLE_TYPES.includes(draft.mediaType) ? "screenshot" : draft.mediaType;
        await attach({
          url, width, height, sizeBytes: file.size, mimeType: file.type, originalFilename: original.name,
          storageKey: new URL(url).pathname.split("/media/")[1] ?? null,
        }, type);
        done++; before += original.size; after += file.size;
      }
    } catch (e) {
      showToast({ type: "error", title: done ? `Stopped after ${done} of ${files.length}` : "Upload failed", message: extractApiError(e).message });
    } finally {
      setBusy(null);
      if (done) {
        await load(); onChanged();
        showToast({ type: "success", title: done === 1 ? "Image added" : `${done} images added`, message: `${formatBytes(before)} → ${formatBytes(after)}` });
      }
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (!busy) void addFiles([...e.dataTransfer.files]);
  };
  // Autosave: called on blur and on select/checkbox change; no-op when unchanged.
  const commit = async (raw: ProjectMedia) => {
    // A cleared alt text falls back to the default instead of blocking publish.
    const it = raw.asset && !raw.asset.altText?.trim()
      ? { ...raw, asset: { ...raw.asset, altText: defaultAlt(raw.mediaType, raw.caption) } }
      : raw;
    if (it !== raw) setAssetField(it.id, { altText: it.asset!.altText });
    if (saved.current.get(it.id) === snapshot(it)) return;
    try {
      await cmsService.updateProjectMedia(it.id, {
        mediaType: it.mediaType, title: it.title, caption: it.caption,
        deviceFrame: it.deviceFrame, isVisible: it.isVisible, isFeatured: it.isFeatured,
      });
      if (it.asset) await cmsService.updateMediaAsset(it.asset.id, { altText: it.asset.altText, caption: it.asset.caption });
      saved.current.set(it.id, snapshot(it));
      onChanged();
    } catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
  };
  const change = (it: ProjectMedia, patch: Partial<ProjectMedia>) => { setField(it.id, patch); void commit({ ...it, ...patch }); };

  const detach = async (it: ProjectMedia) => {
    if (!(await confirmDialog({ title: "Remove media", message: "Remove this media from the project? (The asset stays in the library.)", variant: "danger", confirmText: "Remove" }))) return;
    try { await cmsService.deleteProjectMedia(it.id); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Remove failed", message: extractApiError(e).message }); }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try { await cmsService.reorderProjectMedia(projectId, next.map((x) => x.id)); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Reorder failed", message: extractApiError(e).message }); void load(); }
  };

  if (loading) return <p className="admin-help">Loading media…</p>;

  return (
    <div className="space-y-3">
      <p className="admin-help">The carousel follows this order. Set one image as <strong>Cover image</strong> for the project card. Changes save automatically.</p>
      {items.length === 0 && <p className="admin-help">No media attached yet.</p>}
      {items.map((it, i) => {
        return (
          <div key={it.id} className="rounded-lg border border-gray-950/5 dark:border-white/10 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {it.asset?.url && <img src={it.asset.url} alt="" className="h-12 w-20 rounded-lg bg-white object-contain p-1 border border-gray-950/5 dark:border-white/10" />}
              <Select
                className="max-w-40"
                value={it.mediaType}
                onChange={(v) => change(it, { mediaType: v as MediaType })}
                options={TYPE_OPTIONS}
                ariaLabel="Media type"
              />
              {GALLERY_TYPES.includes(it.mediaType) && (
                <Select
                  className="max-w-32.5"
                  value={it.deviceFrame}
                  onChange={(v) => change(it, { deviceFrame: v as DeviceFrame })}
                  options={FRAME_OPTIONS}
                  ariaLabel="Device frame"
                />
              )}
              {it.mediaType === "cover" && (
                <Select
                  className="max-w-40"
                  value={it.deviceFrame === "tablet" ? "phone" : it.deviceFrame === "desktop" ? "browser" : it.deviceFrame}
                  onChange={(v) => change(it, { deviceFrame: v as DeviceFrame })}
                  options={COVER_FRAME_OPTIONS}
                  ariaLabel="Card preview frame"
                />
              )}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><input type="checkbox" checked={it.isVisible} onChange={(e) => change(it, { isVisible: e.target.checked })} /> Visible</label>
                <button type="button" className="admin-btn admin-btn-secondary px-2!" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
                <button type="button" className="admin-btn admin-btn-secondary px-2!" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
                <button type="button" className="admin-btn admin-btn-danger px-2!" onClick={() => detach(it)} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {GALLERY_TYPES.includes(it.mediaType) && (
              <input className="admin-input" placeholder="Caption (shown under the image in the carousel)" value={it.caption ?? ""} onChange={(e) => setField(it.id, { caption: e.target.value })} onBlur={() => void commit(it)} aria-label="Media caption" />
            )}
            {it.mediaType === "cover" && (
              <p className="admin-help">Card frame applies when Basics → Card image style is "Device-frame preview". Auto shows a phone for mobile tech (Flutter, iOS, Android…), otherwise a web app.</p>
            )}
            <div className="space-y-1">
              <input className="admin-input" placeholder={defaultAlt(it.mediaType, it.caption)}
                value={it.asset?.altText ?? ""} onChange={(e) => setAssetField(it.id, { altText: e.target.value })} onBlur={() => void commit(it)} aria-label="Alt text" />
              <p className="admin-help">Alt text (for screen readers & search) - filled automatically; edit only to describe the image better.</p>
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="admin-label">Add images</span>
          <div className="flex items-center gap-2">
            <span className="admin-help">Add as</span>
            <Select
              className="w-44"
              value={draft.mediaType}
              onChange={(v) => setDraft({ ...draft, mediaType: v as MediaType })}
              options={TYPE_OPTIONS}
              ariaLabel="New media type"
            />
          </div>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          aria-busy={!!busy}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sky-500 ${busy ? "cursor-wait border-gray-950/10 opacity-70 dark:border-white/15" : dragging ? "cursor-copy border-sky-500 bg-sky-500/5" : "cursor-pointer border-gray-950/10 hover:border-sky-500/50 hover:bg-gray-950/2 dark:border-white/15 dark:hover:bg-white/3"}`}
        >
          <input type="file" accept={UPLOAD_TYPES.join(",")} multiple className="sr-only" disabled={!!busy}
            onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
          {busy
            ? <Loader2 className="h-6 w-6 animate-spin text-sky-500" aria-hidden="true" />
            : <ImageUp className={`h-6 w-6 ${dragging ? "text-sky-500" : "text-gray-400"}`} aria-hidden="true" />}
          <span className="text-sm/6 font-medium text-gray-950 dark:text-white" aria-live="polite">
            {busy ?? (dragging ? "Drop to upload" : <>
              <span className="sm:hidden">Tap to choose images</span>
              <span className="hidden sm:inline">Drop images here or <span className="text-sky-600 dark:text-sky-400">browse</span></span>
            </>)}
          </span>
          <span className="admin-help">JPG, PNG, WebP or GIF · resized and compressed automatically</span>
        </label>

        <details className="group">
          <summary className="cursor-pointer select-none text-sm/6 text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white">Or add by image URL</summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/^https?:\/\/\S+$/.test(draft.url.trim()) && (
                <img src={draft.url.trim()} alt="" className="h-12 w-20 rounded-lg bg-white object-contain p-1 border border-gray-950/5 dark:border-white/10" />
              )}
              <input className="admin-input flex-1 min-w-50" type="url" placeholder="https://…/image.png" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addByUrl(); } }} aria-label="New media URL" />
            </div>
            <input className="admin-input" placeholder={`Alt text - optional, defaults to "${defaultAlt(draft.mediaType)}"`} value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} aria-label="New media alt text" />
            <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-secondary" onClick={addByUrl}><Plus className="h-4 w-4" /> Add from URL</button></div>
          </div>
        </details>
      </div>
    </div>
  );
}
