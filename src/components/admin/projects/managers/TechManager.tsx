import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { cmsService, extractApiError } from "../../../../lib/projects-cms";
import { showToast } from "../../../../lib/admin-ui";
import { Select } from "../../../ui/Select";
import type { TechStack, ProjectTechStack, TechCategory } from "../../../../types/project-cms";

const CATEGORIES: TechCategory[] = ["backend", "mobile", "database", "web", "infra", "language", "tooling"];

export function TechManager({ projectId, onChanged }: { projectId: number; onChanged: () => void }) {
  const [all, setAll] = useState<TechStack[]>([]);
  const [attached, setAttached] = useState<ProjectTechStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [newTech, setNewTech] = useState({ name: "", category: "backend" as TechCategory });

  const load = async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([cmsService.listTechStacks(), cmsService.listProjectTech(projectId)]);
      setAll(a); setAttached(t);
    } catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId]);

  const attachedIds = new Set(attached.map((x) => x.techStackId));
  const available = all.filter((t) => !attachedIds.has(t.id));

  const attach = async () => {
    const id = Number(selectedId);
    if (!id) { showToast({ type: "warning", title: "Pick a tech stack" }); return; }
    try { await cmsService.attachTech(projectId, { techStackId: id }); setSelectedId(""); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Attach failed", message: extractApiError(e).message }); }
  };
  const createTech = async () => {
    if (!newTech.name.trim()) { showToast({ type: "warning", title: "Tech name required" }); return; }
    try {
      const created = await cmsService.createTechStack(newTech);
      setNewTech({ name: "", category: "backend" });
      if (created) { await cmsService.attachTech(projectId, { techStackId: created.id }).catch(() => {}); }
      await load(); onChanged();
      showToast({ type: "success", title: "Tech created" });
    } catch (e) { const { message, field } = extractApiError(e); showToast({ type: "error", title: field ? `Invalid ${field}` : "Create failed", message }); }
  };
  const setPrimary = async (it: ProjectTechStack, isPrimary: boolean) => {
    try { await cmsService.updateProjectTech(it.id, { isPrimary }); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Update failed", message: extractApiError(e).message }); }
  };
  const detach = async (it: ProjectTechStack) => {
    try { await cmsService.detachTech(it.id); await load(); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Detach failed", message: extractApiError(e).message }); }
  };
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...attached]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setAttached(next);
    try { await cmsService.reorderProjectTech(projectId, next.map((x) => x.id)); onChanged(); }
    catch (e) { showToast({ type: "error", title: "Reorder failed", message: extractApiError(e).message }); void load(); }
  };

  if (loading) return <p className="admin-help">Loading tech stacks…</p>;

  return (
    <div className="space-y-4">
      <div>
        <span className="admin-label">Attached</span>
        {attached.length === 0 && <p className="admin-help mt-1">No tech attached yet.</p>}
        <div className="mt-2 space-y-2">
          {attached.map((it, i) => (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
              <span className="font-medium text-slate-800 dark:text-slate-200">{it.tech?.name ?? `#${it.techStackId}`}</span>
              {it.tech?.category && <span className="admin-help">· {it.tech.category}</span>}
              <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={it.isPrimary} onChange={(e) => setPrimary(it, e.target.checked)} /> Primary
              </label>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}><ChevronUp className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-secondary !px-2" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === attached.length - 1}><ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => detach(it)} aria-label="Detach"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="max-w-[220px]"
          value={selectedId}
          onChange={(v) => setSelectedId(String(v))}
          options={available.map((t) => ({ value: String(t.id), label: t.name }))}
          placeholder="Attach existing tech…"
          ariaLabel="Available tech stacks"
        />
        <button type="button" className="admin-btn admin-btn-secondary" onClick={attach}><Plus className="h-4 w-4" /> Attach</button>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 flex flex-wrap items-center gap-2">
        <input className="admin-input max-w-[200px]" placeholder="New tech name" value={newTech.name}
          onChange={(e) => setNewTech({ ...newTech, name: e.target.value })} aria-label="New tech name" />
        <Select
          className="max-w-[150px]"
          value={newTech.category}
          onChange={(v) => setNewTech({ ...newTech, category: v as TechCategory })}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          ariaLabel="New tech category"
        />
        <button type="button" className="admin-btn admin-btn-secondary" onClick={createTech}><Plus className="h-4 w-4" /> Create + attach</button>
      </div>
    </div>
  );
}
