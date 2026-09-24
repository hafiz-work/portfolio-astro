import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, AlertTriangle } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import { Select } from "../../../ui/Select";
import type { ProjectMedia, MediaType, DeviceFrame, MediaAsset } from "../../../../types/project-cms";

const MEDIA_TYPES: MediaType[] = ["screenshot", "video", "architecture_diagram", "logo", "cover", "og", "other"];
const DEVICE_FRAMES: DeviceFrame[] = ["none", "phone", "tablet", "desktop", "browser"];

export function MediaManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ url: "", altText: "", mediaType: "screenshot" as MediaType });

  const load = async () => {
    setLoading(true);
    try { setItems(await cmsService.listProjectMedia(projectId)); }
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
      const asset = await cmsService.createMediaAsset({ url: draft.url, altText: draft.altText || null });
      if (!asset) throw new Error("Asset create failed");
      await cmsService.attachMedia(projectId, { mediaAssetId: asset.id, mediaType: draft.mediaType });
      setDraft({ url: "", altText: "", mediaType: "screenshot" });
      await load(); onChanged();
      showToast({ type: "success", title: "Media added" });
    } catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message }); }
  };
  const save = async (it: ProjectMedia) => {
    try {
      await cmsService.updateProjectMedia(it.id, {
        mediaType: it.mediaType, title: it.title, caption: it.caption,
        deviceFrame: it.deviceFrame, isVisible: it.isVisible, isFeatured: it.isFeatured,
      });
      if (it.asset) await cmsService.updateMediaAsset(it.asset.id, { altText: it.asset.altText, caption: it.asset.caption });
      showToast({ type: "success", title: "Media saved" }); onChanged();
    } catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
  };
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
      {items.length === 0 && <p className="admin-help">No media attached. Carousel order = the order below.</p>}
      {items.map((it, i) => {
        const missingAlt = it.isVisible && !(it.asset?.altText && it.asset.altText.trim());
        return (
          <div key={it.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {it.asset?.url && <img src={it.asset.url} alt="" className="h-10 w-16 rounded object-cover border border-slate-200 dark:border-slate-700" />}
              <Select
                className="max-w-[160px]"
                value={it.mediaType}
                onChange={(v) => setField(it.id, { mediaType: v as MediaType })}
                options={MEDIA_TYPES.map((t) => ({ value: t, label: t }))}
                ariaLabel="Media type"
              />
              <Select
                className="max-w-[120px]"
                value={it.deviceFrame}
                onChange={(v) => setField(it.id, { deviceFrame: v as DeviceFrame })}
                options={DEVICE_FRAMES.map((f) => ({ value: f, label: f }))}
                ariaLabel="Device frame"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><input type="checkbox" checked={it.isVisible} onChange={(e) => setField(it.id, { isVisible: e.target.checked })} /> Visible</label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><input type="checkbox" checked={it.isFeatured} onChange={(e) => setField(it.id, { isFeatured: e.target.checked })} /> Featured</label>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => detach(it)} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
            <input className="admin-input" placeholder="Caption (carousel)" value={it.caption ?? ""} onChange={(e) => setField(it.id, { caption: e.target.value })} aria-label="Media caption" />
            <div className="flex items-center gap-2">
              <input className={`admin-input flex-1 ${missingAlt ? "border-amber-400 dark:border-amber-500" : ""}`} placeholder="Alt text (required for visible public media)"
                value={it.asset?.altText ?? ""} onChange={(e) => setAssetField(it.id, { altText: e.target.value })} aria-label="Alt text" />
              {missingAlt && <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> needs alt</span>}
            </div>
            <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-primary" onClick={() => save(it)}>Save media</button></div>
          </div>
        );
      })}

      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 space-y-2">
        <span className="admin-label">Add media by URL</span>
        <p className="admin-help">Full upload isn’t wired yet — paste an image URL (e.g. an R2/hosted asset).</p>
        <div className="flex flex-wrap gap-2">
          <input className="admin-input flex-1 min-w-[220px]" placeholder="https://…/image.png" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} aria-label="New media URL" />
          <Select
            className="max-w-[160px]"
            value={draft.mediaType}
            onChange={(v) => setDraft({ ...draft, mediaType: v as MediaType })}
            options={MEDIA_TYPES.map((t) => ({ value: t, label: t }))}
            ariaLabel="New media type"
          />
        </div>
        <input className="admin-input" placeholder="Alt text" value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} aria-label="New media alt text" />
        <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-secondary" onClick={addByUrl}><Plus className="h-4 w-4" /> Add media</button></div>
      </div>
    </div>
  );
}
