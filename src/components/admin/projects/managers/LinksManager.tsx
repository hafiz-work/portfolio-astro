import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../../lib/admin-ui";
import { Select } from "../../../ui/Select";
import type { ProjectLink, ProjectLinkType, ProjectLinkStatus } from "../../../../types/project-cms";

const LINK_TYPES: ProjectLinkType[] = ["source", "demo", "app_store", "play_store", "case_study", "contact", "private", "other"];
const LINK_STATUSES: ProjectLinkStatus[] = ["active", "hidden", "disabled"];

export function LinksManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [items, setItems] = useState<ProjectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ label: "", url: "", linkType: "source" as ProjectLinkType });

  const load = async () => {
    setLoading(true);
    try { setItems(await cmsService.listLinks(projectId)); }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const setField = (id: number, patch: Partial<ProjectLink>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = async () => {
    if (!draft.label.trim() || !draft.url.trim()) { showToast({ type: "warning", title: "Label and URL required" }); return; }
    try { await cmsService.createLink(projectId, draft); setDraft({ label: "", url: "", linkType: "source" }); await load(); onChanged(); }
    catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message }); }
  };
  const save = async (it: ProjectLink) => {
    try { await cmsService.updateLink(it.id, { label: it.label, url: it.url, linkType: it.linkType, status: it.status, isPublic: it.isPublic }); showToast({ type: "success", title: "Link saved" }); onChanged(); }
    catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Save failed", message }); }
  };
  const remove = async (it: ProjectLink) => {
    if (!(await confirmDialog({ title: "Delete link", message: `Delete "${it.label}"?`, variant: "danger", confirmText: "Delete" }))) return;
    try { await cmsService.deleteLink(it.id); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try { await cmsService.reorderLinks(projectId, next.map((x) => x.id)); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Reorder failed", message: extractApiError(e).message }); void load(); }
  };

  if (loading) return <p className="admin-help">Loading links…</p>;

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="admin-help">No links yet. Public CTAs come from active + public links.</p>}
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-gray-950/5 dark:border-white/10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input className="admin-input max-w-[160px]" placeholder="Label" value={it.label}
              onChange={(e) => setField(it.id, { label: e.target.value })} aria-label="Link label" />
            <input className="admin-input flex-1 min-w-[200px]" placeholder="https://…" value={it.url}
              onChange={(e) => setField(it.id, { url: e.target.value })} aria-label="Link URL" />
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></button>
            <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => remove(it)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="max-w-[150px]"
              value={it.linkType}
              onChange={(v) => setField(it.id, { linkType: v as ProjectLinkType })}
              options={LINK_TYPES.map((t) => ({ value: t, label: t }))}
              ariaLabel="Link type"
            />
            <Select
              className="max-w-[130px]"
              value={it.status}
              onChange={(v) => setField(it.id, { status: v as ProjectLinkStatus })}
              options={LINK_STATUSES.map((s) => ({ value: s, label: s }))}
              ariaLabel="Link status"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <input type="checkbox" checked={it.isPublic} onChange={(e) => setField(it.id, { isPublic: e.target.checked })} /> Public
            </label>
            <span className="ml-auto"><button type="button" className="admin-btn admin-btn-primary" onClick={() => save(it)}>Save link</button></span>
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-dashed border-gray-950/10 dark:border-white/10 p-3 flex flex-wrap gap-2 items-center">
        <input className="admin-input max-w-[160px]" placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-label="New link label" />
        <input className="admin-input flex-1 min-w-[200px]" placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} aria-label="New link URL" />
        <Select
          className="max-w-[150px]"
          value={draft.linkType}
          onChange={(v) => setDraft({ ...draft, linkType: v as ProjectLinkType })}
          options={LINK_TYPES.map((t) => ({ value: t, label: t }))}
          ariaLabel="New link type"
        />
        <button type="button" className="admin-btn admin-btn-secondary" onClick={add}><Plus className="h-4 w-4" /> Add link</button>
      </div>
    </div>
  );
}
