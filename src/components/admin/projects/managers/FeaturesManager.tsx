import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import { FEATURE_ICONS } from "../../../../lib/feature-icons";
import { Select } from "../../../ui/Select";
import type { ProjectFeature } from "../../../../types/project-cms";

const snapshot = (it: ProjectFeature) => JSON.stringify([it.title, it.description ?? "", it.icon ?? "", it.isVisible]);

const ICON_OPTIONS = [
  { value: "", label: "Default (check)", icon: <Check className="h-4 w-4 shrink-0" /> },
  ...Object.entries(FEATURE_ICONS).filter(([k]) => k !== "check").map(([k, Icon]) => ({
    value: k, label: k.replace(/-/g, " "), icon: <Icon className="h-4 w-4 shrink-0" />,
  })),
];

function IconSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <Select className="w-48" value={value} onChange={(v) => onChange(String(v))} options={ICON_OPTIONS} ariaLabel={label} />;
}

export function FeaturesManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", description: "", icon: "" });
  const saved = useRef(new Map<number, string>());

  const load = async () => {
    setLoading(true);
    try {
      const rows = await cmsService.listFeatures(projectId);
      saved.current = new Map(rows.map((r) => [r.id, snapshot(r)]));
      setItems(rows);
    }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const setField = (id: number, patch: Partial<ProjectFeature>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  // Autosave: called on blur and on select/checkbox change; no-op when unchanged.
  const commit = async (it: ProjectFeature) => {
    if (saved.current.get(it.id) === snapshot(it)) return;
    if (!it.title.trim()) { showToast({ type: "warning", title: "Feature title can't be empty" }); return; }
    try {
      await cmsService.updateFeature(it.id, { title: it.title, description: it.description, icon: it.icon || null, isVisible: it.isVisible });
      saved.current.set(it.id, snapshot(it));
      onChanged();
    } catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
  };
  const change = (it: ProjectFeature, patch: Partial<ProjectFeature>) => {
    const next = { ...it, ...patch };
    setField(it.id, patch);
    void commit(next);
  };

  const add = async () => {
    if (!draft.title.trim()) { showToast({ type: "warning", title: "Title required" }); return; }
    try { await cmsService.createFeature(projectId, { ...draft, icon: draft.icon || null }); setDraft({ title: "", description: "", icon: "" }); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Add failed", message: extractApiError(e).message }); }
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
      <p className="admin-help">Changes save automatically when you leave a field.</p>
      {items.length === 0 && <p className="admin-help">No features yet.</p>}
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-gray-950/5 dark:border-white/10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <IconSelect value={it.icon ?? ""} onChange={(icon) => change(it, { icon })} label="Feature icon" />
            <input className="admin-input flex-1 min-w-[180px]" placeholder="Title" value={it.title}
              onChange={(e) => setField(it.id, { title: e.target.value })} onBlur={() => void commit(it)} aria-label="Feature title" />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <input type="checkbox" checked={it.isVisible} onChange={(e) => change(it, { isVisible: e.target.checked })} /> Visible
              </label>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => remove(it)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <textarea className="admin-input min-h-16" placeholder="Description" value={it.description ?? ""}
            onChange={(e) => setField(it.id, { description: e.target.value })} onBlur={() => void commit(it)} aria-label="Feature description" />
        </div>
      ))}
      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <IconSelect value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} label="New feature icon" />
          <input className="admin-input flex-1 min-w-[180px]" placeholder="New feature title" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} aria-label="New feature title" />
        </div>
        <textarea className="admin-input min-h-14" placeholder="Description" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="New feature description" />
        <div className="flex justify-end"><button type="button" className="admin-btn admin-btn-secondary" onClick={add}><Plus className="h-4 w-4" /> Add feature</button></div>
      </div>
    </div>
  );
}
