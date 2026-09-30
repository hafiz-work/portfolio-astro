import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { cmsService, extractApiError } from "../../lib/projects-cms";
import { showToast, confirmDialog } from "../../lib/admin-ui";
import { Select } from "../ui/Select";
import type { TechCategory, TechStack } from "../../types/project-cms";

const CATEGORIES: TechCategory[] = ["backend", "mobile", "database", "web", "infra", "language", "tooling"];
// Same levels as the homepage Stack section, so it can read this later.
const PROFICIENCY = ["advanced", "proficient", "familiar"] as const;

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: label(c) }));
const proficiencyOptions = (current?: string | null) => [
  { value: "", label: "No level" },
  ...PROFICIENCY.map((p) => ({ value: p, label: label(p) })),
  // Keep an unexpected stored value selectable instead of silently hiding it.
  ...(current && !PROFICIENCY.includes(current as never) ? [{ value: current, label: current }] : []),
];

const snapshot = (t: TechStack) => JSON.stringify([t.name, t.category ?? "", t.proficiency ?? ""]);
const emptyDraft = { name: "", category: "backend" as TechCategory, proficiency: "" };

export function TechStacksManager() {
  const [items, setItems] = useState<TechStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const saved = useRef(new Map<number, string>());

  const load = async () => {
    try {
      const rows = await cmsService.listTechStacks();
      saved.current = new Map(rows.map((r) => [r.id, snapshot(r)]));
      setItems(rows);
    } catch (e) {
      showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const isDuplicate = (name: string, exceptId?: number) =>
    items.some((t) => t.id !== exceptId && t.name.trim().toLowerCase() === name.trim().toLowerCase());

  const add = async () => {
    const name = draft.name.trim();
    if (!name) { showToast({ type: "warning", title: "Name required" }); return; }
    if (isDuplicate(name)) { showToast({ type: "warning", title: `"${name}" already exists` }); return; }
    try {
      await cmsService.createTechStack({ name, category: draft.category, proficiency: draft.proficiency || null });
      setDraft({ ...emptyDraft, category: draft.category });
      await load();
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message });
    }
  };

  const setField = (id: number, patch: Partial<TechStack>) =>
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // Autosave: on blur for the name, immediately for selects; no-op when unchanged.
  const commit = async (t: TechStack) => {
    if (saved.current.get(t.id) === snapshot(t)) return;
    if (!t.name.trim()) { showToast({ type: "warning", title: "Name can't be empty" }); return; }
    if (isDuplicate(t.name, t.id)) { showToast({ type: "warning", title: `"${t.name.trim()}" already exists` }); return; }
    try {
      await cmsService.updateTechStack(t.id, { name: t.name.trim(), category: (t.category as TechCategory) || null, proficiency: t.proficiency || null });
      saved.current.set(t.id, snapshot(t));
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: extractApiError(e).message });
    }
  };
  const change = (t: TechStack, patch: Partial<TechStack>) => {
    setField(t.id, patch);
    void commit({ ...t, ...patch });
  };

  const remove = async (t: TechStack) => {
    const ok = await confirmDialog({
      title: "Delete tech",
      message: `Delete "${t.name}"? It is also removed from any project that uses it.`,
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    try { await cmsService.deleteTechStack(t.id); await load(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = items
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    const byCat = new Map<string, TechStack[]>();
    for (const t of visible) {
      const key = t.category && CATEGORIES.includes(t.category as TechCategory) ? t.category : "other";
      byCat.set(key, [...(byCat.get(key) ?? []), t]);
    }
    return [...CATEGORIES, "other"].filter((c) => byCat.has(c)).map((c) => ({ category: c, rows: byCat.get(c)! }));
  }, [items, query]);

  if (loading) return <p className="admin-help">Loading tech stack…</p>;

  return (
    <div className="space-y-6">
      <div className="admin-card space-y-3">
        <h3 className="admin-card-title">Add tech</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="admin-input max-w-[260px]"
            placeholder="e.g. Flutter"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            aria-label="New tech name"
          />
          <Select className="w-40" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v as TechCategory })} options={CATEGORY_OPTIONS} ariaLabel="New tech category" />
          <Select className="w-40" value={draft.proficiency} onChange={(v) => setDraft({ ...draft, proficiency: String(v) })} options={proficiencyOptions()} ariaLabel="New tech proficiency" />
          <button type="button" className="admin-btn admin-btn-primary" onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <p className="admin-help">Available in every project's Tech Stack tab. Proficiency uses the same levels as the homepage Stack section.</p>
      </div>

      <div className="admin-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="admin-card-title">{items.length} {items.length === 1 ? "tech" : "techs"}</h3>
          <label className="relative block w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" className="admin-input pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tech" />
          </label>
        </div>
        <p className="admin-help">Changes save automatically when you leave a field.</p>

        {groups.length === 0 && (
          <p className="admin-help">{items.length ? "No tech matches your search." : "No tech yet - add the first one above."}</p>
        )}

        {groups.map(({ category, rows }) => (
          <section key={category} className="space-y-2">
            <h4 className="font-mono text-xs/6 tracking-widest text-gray-500 uppercase dark:text-gray-400">
              {label(category)} <span className="text-gray-400 dark:text-gray-500">· {rows.length}</span>
            </h4>
            <ul className="divide-y divide-gray-950/5 rounded-lg ring-1 ring-gray-950/5 dark:divide-white/10 dark:ring-white/10">
              {rows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <input
                    className="admin-input min-w-[160px] flex-1"
                    value={t.name}
                    onChange={(e) => setField(t.id, { name: e.target.value })}
                    onBlur={() => void commit(t)}
                    aria-label="Tech name"
                  />
                  <Select className="w-40" value={t.category ?? ""} onChange={(v) => change(t, { category: v as TechCategory })} options={CATEGORY_OPTIONS} placeholder="Category" ariaLabel={`Category of ${t.name}`} />
                  <Select className="w-40" value={t.proficiency ?? ""} onChange={(v) => change(t, { proficiency: String(v) || null })} options={proficiencyOptions(t.proficiency)} ariaLabel={`Proficiency of ${t.name}`} />
                  <button type="button" className="admin-btn admin-btn-danger !px-2" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
