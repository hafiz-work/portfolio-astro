import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { quotesService, categoryLabel, sortCategories } from "../../../lib/quotes";
import { normalizeTagName } from "../../../lib/quote-text";
import { extractApiError } from "../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../lib/admin-ui";
import type { QuoteTag } from "../../../types/quotes";

// Category = free-text slug (spec §2.2): lowercase, spaces → "-", empty → "other".
const normalizeCategory = (c: string | null) =>
  (c ?? "").trim().toLowerCase().replace(/\s+/g, "-") || "other";
const SLUG = /^[a-z0-9-]{1,30}$/;

const snapshot = (t: QuoteTag) => JSON.stringify([t.name, t.category ?? ""]);
const emptyDraft = { name: "", category: "" };

export function QuoteTagsManager() {
  const [items, setItems] = useState<QuoteTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const saved = useRef(new Map<number, string>());

  const load = async () => {
    try {
      const rows = await quotesService.listQuoteTags();
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
    const name = normalizeTagName(draft.name);
    const category = normalizeCategory(draft.category);
    if (!name) { showToast({ type: "warning", title: "Name required" }); return; }
    if (isDuplicate(name)) { showToast({ type: "warning", title: `"${name}" already exists` }); return; }
    if (!SLUG.test(category)) { showToast({ type: "warning", title: "Invalid category", message: "Use letters, numbers and dashes (max 30)." }); return; }
    try {
      await quotesService.createQuoteTag({ name, category });
      setDraft({ ...emptyDraft, category: draft.category });
      await load();
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message });
    }
  };

  const setField = (id: number, patch: Partial<QuoteTag>) =>
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // Autosave on blur; no-op when unchanged.
  const commit = async (t: QuoteTag) => {
    const next = { ...t, name: normalizeTagName(t.name), category: normalizeCategory(t.category) };
    if (saved.current.get(t.id) === snapshot(next)) { setField(t.id, next); return; }
    if (!next.name) { showToast({ type: "warning", title: "Name can't be empty" }); return; }
    if (isDuplicate(next.name, t.id)) { showToast({ type: "warning", title: `"${next.name}" already exists` }); return; }
    if (!SLUG.test(next.category)) { showToast({ type: "warning", title: "Invalid category", message: "Use letters, numbers and dashes (max 30)." }); return; }
    try {
      await quotesService.updateQuoteTag(t.id, { name: next.name, category: next.category });
      saved.current.set(t.id, snapshot(next));
      setField(t.id, next);
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Save failed", message });
    }
  };

  const remove = async (t: QuoteTag) => {
    const ok = await confirmDialog({
      title: "Delete tag",
      message: `Delete "${t.name}"? It is also removed from any quote that uses it.`,
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    try { await quotesService.deleteQuoteTag(t.id); await load(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };

  // Group + suggest by the last *saved* category, so a row doesn't jump groups mid-typing.
  const savedCategory = (t: QuoteTag): string => JSON.parse(saved.current.get(t.id) ?? "[]")[1] || "other";
  const categories = useMemo(() => sortCategories(items.map(savedCategory)), [items]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCat = new Map<string, QuoteTag[]>();
    items
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((t) => {
        const key = savedCategory(t);
        byCat.set(key, [...(byCat.get(key) ?? []), t]);
      });
    return sortCategories(byCat.keys()).map((c) => ({ category: c, rows: byCat.get(c)! }));
  }, [items, query]);

  if (loading) return <p className="admin-help">Loading tags…</p>;

  return (
    <div className="space-y-6">
      <datalist id="quote-tag-categories">
        {categories.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="admin-card space-y-3">
        <h3 className="admin-card-title">Add tag</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="admin-input max-w-65"
            placeholder="e.g. naruto"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            aria-label="New tag name"
          />
          <input
            className="admin-input w-40"
            list="quote-tag-categories"
            placeholder="e.g. anime"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            aria-label="New tag category"
          />
          <button type="button" className="admin-btn admin-btn-primary" onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <p className="admin-help">Shared across all quotes - name + category.</p>
      </div>

      <div className="admin-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="admin-card-title">{items.length} {items.length === 1 ? "tag" : "tags"}</h3>
          <label className="relative block w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" className="admin-input pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tags" />
          </label>
        </div>
        <p className="admin-help">Changes save automatically when you leave a field.</p>

        {groups.length === 0 && (
          <p className="admin-help">{items.length ? "No tags match your search." : "No tags yet - add the first one above."}</p>
        )}

        {groups.map(({ category, rows }) => (
          <section key={category} className="space-y-2">
            <h4 className="font-mono text-xs/6 tracking-widest text-gray-500 uppercase dark:text-gray-400">
              {categoryLabel(category)} <span className="text-gray-400 dark:text-gray-500">· {rows.length}</span>
            </h4>
            <ul className="divide-y divide-gray-950/5 rounded-lg ring-1 ring-gray-950/5 dark:divide-white/10 dark:ring-white/10">
              {rows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <input
                    className="admin-input min-w-40 flex-1"
                    value={t.name}
                    onChange={(e) => setField(t.id, { name: e.target.value })}
                    onBlur={() => void commit(t)}
                    aria-label="Tag name"
                  />
                  <input
                    className="admin-input w-40"
                    list="quote-tag-categories"
                    value={t.category ?? ""}
                    onChange={(e) => setField(t.id, { category: e.target.value })}
                    onBlur={() => void commit(t)}
                    aria-label={`Category of ${t.name}`}
                  />
                  <button type="button" className="admin-btn admin-btn-danger px-2!" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
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
