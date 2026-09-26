import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import type { ProjectFeature } from "../../../../types/project-cms";

export function FeaturesManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", description: "", icon: "" });

  const load = async () => {
    setLoading(true);
    try { setItems(await cmsService.listFeatures(projectId)); }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const setField = (id: number, patch: Partial<ProjectFeature>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = async () => {
    if (!draft.title.trim()) { showToast({ type: "warning", title: "Title required" }); return; }
    try { await cmsService.createFeature(projectId, draft); setDraft({ title: "", description: "", icon: "" }); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Add failed", message: extractApiError(e).message }); }
  };
  const save = async (it: ProjectFeature) => {
    try { await cmsService.updateFeature(it.id, { title: it.title, description: it.description, icon: it.icon, isVisible: it.isVisible }); showToast({ type: "success", title: "Feature saved" }); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
  };
  const remove = async (it: ProjectFeature) => {
    if (!(await confirmDialog({ title: "Delete feature", message: `Delete "${it.title}"?`, variant: "danger", confirmText: "Delete" }))) return;
    try { await cmsService.deleteFeature(it.id); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try { await cmsService.reorderFeatures(projectId, next.map((x) => x.id)); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Reorder failed", message: extractApiError(e).message }); void load(); }
  };

  if (loading) return <p className="admin-help">Loading features…</p>;

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="admin-help">No features yet.</p>}
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-gray-950/5 dark:border-white/10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input className="admin-input flex-1 min-w-[180px]" placeholder="Title" value={it.title}
              onChange={(e) => setField(it.id, { title: e.target.value })} aria-label="Feature title" />
            <input className="admin-input max-w-[120px]" placeholder="Icon" value={it.icon ?? ""}
              onChange={(e) => setField(it.id, { icon: e.target.value })} aria-label="Feature icon" />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <input type="checkbox" checked={it.isVisible} onChange={(e) => setField(it.id, { isVisible: e.target.checked })} /> Visible
            </label>
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => remove(it)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea className="admin-input min-h-16" placeholder="Description" value={it.description ?? ""}
            onChange={(e) => setField(it.id, { description: e.target.value })} aria-label="Feature description" />
          <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-primary" onClick={() => save(it)}>Save feature</button></div>
        </div>
      ))}
      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input className="admin-input flex-1 min-w-[180px]" placeholder="New feature title" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="New feature title" />
          <input className="admin-input max-w-[120px]" placeholder="Icon" value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })} aria-label="New feature icon" />
        </div>
        <textarea className="admin-input min-h-14" placeholder="Description" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="New feature description" />
        <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-secondary" onClick={add}><Plus className="h-4 w-4" /> Add feature</button></div>
      </div>
    </div>
  );
}
