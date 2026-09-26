import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import type { ProjectSection } from "../../../../types/project-cms";

const SECTION_TYPES = ["problem", "solution", "contribution", "architecture", "challenges", "results", "custom"];

export function SectionsManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ sectionType: "problem", title: "", body: "" });

  const load = async () => {
    setLoading(true);
    try { setItems(await cmsService.listSections(projectId)); }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const setField = (id: number, patch: Partial<ProjectSection>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = async () => {
    if (!draft.sectionType.trim()) { showToast({ type: "warning", title: "Section type required" }); return; }
    try {
      await cmsService.createSection(projectId, draft);
      setDraft({ sectionType: "problem", title: "", body: "" });
      await load(); onChanged();
    } catch (e) { showToast({ type: "error", title: "Add failed", message: extractApiError(e).message }); }
  };
  const save = async (it: ProjectSection) => {
    try {
      await cmsService.updateSection(it.id, { sectionType: it.sectionType, title: it.title, body: it.body, isVisible: it.isVisible });
      showToast({ type: "success", title: "Section saved" }); onChanged();
    } catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
  };
  const remove = async (it: ProjectSection) => {
    if (!(await confirmDialog({ title: "Delete section", message: `Delete "${it.title || it.sectionType}"?`, variant: "danger", confirmText: "Delete" }))) return;
    try { await cmsService.deleteSection(it.id); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try { await cmsService.reorderSections(projectId, next.map((x) => x.id)); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Reorder failed", message: extractApiError(e).message }); void load(); }
  };

  if (loading) return <p className="admin-help">Loading sections…</p>;

  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="admin-help">No case-study sections yet.</p>}
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-gray-950/5 dark:border-white/10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${"admin-input"} max-w-[180px]`} value={it.sectionType} list="section-types"
              onChange={(e) => setField(it.id, { sectionType: e.target.value })} aria-label="Section type" />
            <input className="admin-input flex-1 min-w-[160px]" placeholder="Title (optional)" value={it.title ?? ""}
              onChange={(e) => setField(it.id, { title: e.target.value })} aria-label="Section title" />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <input type="checkbox" checked={it.isVisible} onChange={(e) => setField(it.id, { isVisible: e.target.checked })} /> Visible
            </label>
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => remove(it)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea className="admin-input min-h-20" placeholder="Body (plain text / HTML)" value={it.body ?? ""}
            onChange={(e) => setField(it.id, { body: e.target.value })} aria-label="Section body" />
          <div className="flex justify-end">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => save(it)}>Save section</button>
          </div>
        </div>
      ))}

      <datalist id="section-types">{SECTION_TYPES.map((t) => <option key={t} value={t} />)}</datalist>

      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input className="admin-input max-w-[180px]" value={draft.sectionType} list="section-types"
            onChange={(e) => setDraft({ ...draft, sectionType: e.target.value })} aria-label="New section type" />
          <input className="admin-input flex-1 min-w-[160px]" placeholder="Title (optional)" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="New section title" />
        </div>
        <textarea className="admin-input min-h-16" placeholder="Body" value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })} aria-label="New section body" />
        <div className="flex justify-end">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={add}><Plus className="h-4 w-4" /> Add section</button>
        </div>
      </div>
    </div>
  );
}
