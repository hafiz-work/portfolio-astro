import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import { Select } from "../../../ui/Select";
import type { ProjectMedia, MediaType, DeviceFrame, MediaAsset } from "../../../../types/project-cms";

const MEDIA_TYPES: MediaType[] = ["screenshot", "video", "architecture_diagram", "logo", "cover", "og", "other"];
const DEVICE_FRAMES: DeviceFrame[] = ["none", "phone", "tablet", "desktop", "browser"];
const MEDIA_LABEL: Record<MediaType, string> = {
  screenshot: "Screenshot", video: "Video", architecture_diagram: "Architecture diagram",
  logo: "Logo", cover: "Cover image", og: "Social share (OG)", other: "Other",
};
const TYPE_OPTIONS = MEDIA_TYPES.map((t) => ({ value: t, label: MEDIA_LABEL[t] }));
const FRAME_OPTIONS = DEVICE_FRAMES.map((f) => ({ value: f, label: f === "none" ? "No frame" : f[0].toUpperCase() + f.slice(1) }));

// Only carousel media is shown in a device frame (see MediaCarousel.astro).
const GALLERY_TYPES: MediaType[] = ["screenshot", "video", "architecture_diagram"];

const snapshot = (it: ProjectMedia) =>
  JSON.stringify([it.mediaType, it.caption ?? "", it.deviceFrame, it.isVisible, it.isFeatured, it.asset?.altText ?? ""]);

export function MediaManager({ projectId, projectTitle, onChanged }: { projectId: number; projectTitle: string; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ url: "", altText: "", mediaType: "screenshot" as MediaType });
  const saved = useRef(new Map<number, string>());

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

  const addByUrl = async () => {
    if (!draft.url.trim()) { showToast({ type: "warning", title: "URL required" }); return; }
    try {
      const asset = await cmsService.createMediaAsset({ url: draft.url.trim(), altText: draft.altText.trim() || defaultAlt(draft.mediaType) });
      if (!asset) throw new Error("Asset create failed");
      await cmsService.attachMedia(projectId, { mediaAssetId: asset.id, mediaType: draft.mediaType });
      setDraft({ url: "", altText: "", mediaType: "screenshot" });
      await load(); onChanged();
      showToast({ type: "success", title: "Media added" });
    } catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message }); }
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
                className="max-w-[160px]"
                value={it.mediaType}
                onChange={(v) => change(it, { mediaType: v as MediaType })}
                options={TYPE_OPTIONS}
                ariaLabel="Media type"
              />
              {GALLERY_TYPES.includes(it.mediaType) && (
                <Select
                  className="max-w-[130px]"
                  value={it.deviceFrame}
                  onChange={(v) => change(it, { deviceFrame: v as DeviceFrame })}
                  options={FRAME_OPTIONS}
                  ariaLabel="Device frame"
                />
              )}
              <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><input type="checkbox" checked={it.isVisible} onChange={(e) => change(it, { isVisible: e.target.checked })} /> Visible</label>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => detach(it)} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
            {GALLERY_TYPES.includes(it.mediaType) && (
              <input className="admin-input" placeholder="Caption (shown under the image in the carousel)" value={it.caption ?? ""} onChange={(e) => setField(it.id, { caption: e.target.value })} onBlur={() => void commit(it)} aria-label="Media caption" />
            )}
            <div className="space-y-1">
              <input className="admin-input" placeholder={defaultAlt(it.mediaType, it.caption)}
                value={it.asset?.altText ?? ""} onChange={(e) => setAssetField(it.id, { altText: e.target.value })} onBlur={() => void commit(it)} aria-label="Alt text" />
              <p className="admin-help">Alt text (for screen readers & search) - filled automatically; edit only to describe the image better.</p>
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 space-y-2">
        <span className="admin-label">Add media by URL</span>
        <p className="admin-help">Paste an image URL (upload isn't wired yet).</p>
        <div className="flex flex-wrap items-center gap-2">
          {/^https?:\/\/\S+$/.test(draft.url.trim()) && (
            <img src={draft.url.trim()} alt="" className="h-12 w-20 rounded-lg bg-white object-contain p-1 border border-gray-950/5 dark:border-white/10" />
          )}
          <input className="admin-input flex-1 min-w-[220px]" type="url" placeholder="https://…/image.png" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addByUrl(); } }} aria-label="New media URL" />
          <Select
            className="max-w-[160px]"
            value={draft.mediaType}
            onChange={(v) => setDraft({ ...draft, mediaType: v as MediaType })}
            options={TYPE_OPTIONS}
            ariaLabel="New media type"
          />
        </div>
        <input className="admin-input" placeholder={`Alt text - optional, defaults to "${defaultAlt(draft.mediaType)}"`} value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} aria-label="New media alt text" />
        <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-secondary" onClick={addByUrl}><Plus className="h-4 w-4" /> Add media</button></div>
      </div>
    </div>
  );
}
