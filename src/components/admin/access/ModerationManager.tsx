import React, { useEffect, useMemo, useState } from "react";
import { Select } from "../../ui/Select";
import {
  accessService,
  type AiCheckStats,
  type AiCheckStatus,
  type ModerationCheck,
  type ModerationItem,
  type ModerationUser,
} from "../../../lib/access";
import { authService, can, type Me } from "../../../lib/auth";
import { extractApiError } from "../../../lib/projects-cms";
import { confirmDialog, showToast } from "../../../lib/admin-ui";

// User-authored blog posts + quotes. They go live at once; moderators reject (hide),
// restore or delete them with a reason the author sees. Strikes inform bans - never automatic.
// AI check (Clef-flash, owner switch in /admin/ai): scores are hints for sorting and picking -
// a moderator still makes every call, one at a time or on a selection. Setup: hono-workers docs/clef-flash.md.
type Action = "reject" | "restore" | "delete";
const BAN_LENGTHS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "permanent", label: "Permanent" },
];
const statusTone: Record<string, string> = {
  published: "text-emerald-700 dark:text-emerald-400",
  rejected: "text-red-700 dark:text-red-400",
  draft: "text-gray-500",
};
// Raw model probabilities, uncalibrated: red at the backend's flag threshold, amber at 50%.
const tone = (p: number, flagAt: number) =>
  p >= flagAt ? "text-red-700 dark:text-red-400" : p >= 0.5 ? "text-amber-700 dark:text-amber-400" : "text-gray-600 dark:text-gray-400";
const pct = (p: number) => `${Math.round(p * 100)}%`;
const keyOf = (item: Pick<ModerationItem, "type" | "id">) => `${item.type}-${item.id}`;
const risk = (c: ModerationCheck | null) => (c ? Math.max(c.spam, c.abuse) : -1);
/** Reason prefill for a flagged selection - the moderator edits it before confirming. */
const suggestedReason = (c: ModerationCheck | null) =>
  !c ? "" : c.abuse >= c.spam ? "Harassment, hate or explicit content" : "Spam or advertising";
const when = (iso: string) => new Date(iso + (/[Zz]|[+-]\d\d:\d\d$/.test(iso) ? "" : "Z")).toLocaleString();

export function ModerationManager() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [filter, setFilter] = useState({ type: "", status: "published" });
  const [view, setView] = useState({ ai: "", sort: "newest" });
  const [pending, setPending] = useState<{ item: ModerationItem; action: Action; reason: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ModerationUser | null>(null);
  const [ban, setBan] = useState({ reason: "", length: "7" });
  const [ai, setAi] = useState<AiCheckStatus | null>(null);
  const [stats, setStats] = useState<AiCheckStats | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ action: "reject" | "delete"; reason: string } | null>(null);

  const load = async () => {
    try {
      setItems(await accessService.moderationQueue({ type: (filter.type || undefined) as "blog" | "quote" | undefined, status: filter.status || undefined }));
      setSelected(new Set());
    } catch (e) {
      showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
    }
  };
  const loadStats = () => accessService.aiCheckStats().then(setStats, () => setStats(null));
  useEffect(() => {
    void authService.me().then(setMe);
    void accessService.aiCheckStatus().then((s) => {
      setAi(s?.enabled ? s : null);
      if (s?.enabled) void loadStats();
    }, () => setAi(null));
  }, []);
  useEffect(() => { void load(); }, [filter]);

  const flagAt = ai?.flagAt ?? 0.8;
  const shown = useMemo(() => {
    const list = items.filter((i) =>
      view.ai === "flagged" ? risk(i.check) >= flagAt : view.ai === "unchecked" ? !i.check : true);
    return view.sort === "risk" ? [...list].sort((a, b) => risk(b.check) - risk(a.check)) : list;
  }, [items, view, flagAt]);
  const unchecked = items.filter((i) => !i.check);
  const flaggedShown = shown.filter((i) => risk(i.check) >= flagAt);
  const chosen = items.filter((i) => selected.has(keyOf(i)));

  const loadUser = async (id: number) => {
    setUserId(id);
    try { setDetail(await accessService.moderationUser(id)); }
    catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
  };

  const confirmAction = async () => {
    if (!pending) return;
    if (pending.reason.trim().length < 3) { showToast({ type: "warning", title: "Give a reason (3+ characters)" }); return; }
    try {
      await accessService.moderate(pending.item, pending.action, pending.reason.trim());
      showToast({ type: "success", title: `Item ${pending.action === "delete" ? "deleted" : pending.action === "reject" ? "rejected" : "restored"}` });
      const author = pending.item.author.id;
      setPending(null);
      await load();
      if (ai) void loadStats();
      if (userId === author) await loadUser(author);
    } catch (e) {
      showToast({ type: "error", title: "Action failed", message: extractApiError(e).message });
    }
  };

  const doBan = async () => {
    if (!detail || ban.reason.trim().length < 3) { showToast({ type: "warning", title: "Give a reason (3+ characters)" }); return; }
    const expiresAt = ban.length === "permanent" ? null : new Date(Date.now() + Number(ban.length) * 86_400_000).toISOString();
    try {
      await accessService.ban(detail.user.id, ban.reason.trim(), expiresAt);
      setBan({ reason: "", length: "7" });
      await loadUser(detail.user.id);
    } catch (e) { showToast({ type: "error", title: "Ban failed", message: extractApiError(e).message }); }
  };

  const doUnban = async () => {
    if (!detail) return;
    try { await accessService.unban(detail.user.id); await loadUser(detail.user.id); }
    catch (e) { showToast({ type: "error", title: "Unban failed", message: extractApiError(e).message }); }
  };

  const setCheck = (key: string, check: ModerationCheck) =>
    setItems((prev) => prev.map((i) => (keyOf(i) === key ? { ...i, check } : i)));
  const mark = (keys: string[], on: boolean) =>
    setBusy((prev) => { const next = new Set(prev); keys.forEach((k) => (on ? next.add(k) : next.delete(k))); return next; });

  const aiCheck = async (item: ModerationItem) => {
    const key = keyOf(item);
    mark([key], true);
    try {
      const result = await accessService.assessModeration(item);
      if (!result) throw new Error("No result");
      setCheck(key, result);
      void loadStats();
    } catch (e) {
      showToast({ type: "error", title: "AI check failed", message: extractApiError(e).message });
    } finally {
      mark([key], false);
    }
  };

  // Every unchecked item in the loaded list, `bulkMax` per request. Failures are counted, not fatal.
  const checkAll = async () => {
    if (!ai || !unchecked.length) return;
    const todo = [...unchecked];
    let failed = 0;
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += ai.bulkMax) {
      const chunk = todo.slice(i, i + ai.bulkMax);
      mark(chunk.map(keyOf), true);
      try {
        for (const r of await accessService.assessMany(chunk)) {
          if ("check" in r) setCheck(keyOf(r), r.check);
          else failed++;
        }
      } catch (e) {
        failed += chunk.length;
        showToast({ type: "error", title: "AI check failed", message: extractApiError(e).message });
        if (i === 0) { mark(chunk.map(keyOf), false); break; } // e.g. switched off - don't hammer
      }
      mark(chunk.map(keyOf), false);
      setProgress({ done: Math.min(i + chunk.length, todo.length), total: todo.length });
    }
    setProgress(null);
    void loadStats();
    showToast({ type: failed ? "warning" : "success", title: `Checked ${todo.length - failed} of ${todo.length}`, message: failed ? `${failed} failed - run it again for those.` : undefined });
  };

  const toggle = (item: ModerationItem) =>
    setSelected((prev) => { const next = new Set(prev); const k = keyOf(item); next.has(k) ? next.delete(k) : next.add(k); return next; });
  const openBulk = (action: "reject" | "delete") =>
    setBulk({ action, reason: suggestedReason(chosen.find((i) => i.check)?.check ?? null) });

  // One request per item through the normal endpoint - same audit row, strike and author notice as a single action.
  const runBulk = async () => {
    if (!bulk) return;
    if (bulk.reason.trim().length < 3) { showToast({ type: "warning", title: "Give a reason (3+ characters)" }); return; }
    const targets = chosen.filter((i) => bulk.action === "delete" || i.status !== "rejected");
    if (!targets.length) { showToast({ type: "warning", title: "Nothing to reject - every selected item is already rejected" }); return; }
    const ok = await confirmDialog({
      title: `${bulk.action === "delete" ? "Delete" : "Reject"} ${targets.length} item${targets.length === 1 ? "" : "s"}`,
      message: `Reason (the authors see it): "${bulk.reason.trim()}". Each one adds a strike to its author.`,
      variant: "danger",
      confirmText: bulk.action === "delete" ? "Delete" : "Reject",
    });
    if (!ok) return;
    let failed = 0;
    for (const item of targets) {
      try { await accessService.moderate(item, bulk.action, bulk.reason.trim()); }
      catch { failed++; }
    }
    setBulk(null);
    await load();
    if (ai) void loadStats();
    showToast({ type: failed ? "warning" : "success", title: `${bulk.action === "delete" ? "Deleted" : "Rejected"} ${targets.length - failed} of ${targets.length}` });
  };

  const canAct = can(me, "moderation.act");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="admin-card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-36" value={filter.type} ariaLabel="Type"
            options={[{ value: "", label: "All types" }, { value: "blog", label: "Blog posts" }, { value: "quote", label: "Quotes" }]}
            onChange={(v) => setFilter({ ...filter, type: String(v) })} />
          <Select className="w-36" value={filter.status} ariaLabel="Status"
            options={[{ value: "", label: "Any status" }, { value: "published", label: "Published" }, { value: "rejected", label: "Rejected" }, { value: "draft", label: "Draft" }]}
            onChange={(v) => setFilter({ ...filter, status: String(v) })} />
          {ai && (
            <>
              <Select className="w-40" value={view.ai} ariaLabel="AI score"
                options={[{ value: "", label: "Any AI score" }, { value: "flagged", label: `Flagged (≥ ${pct(flagAt)})` }, { value: "unchecked", label: "Not checked" }]}
                onChange={(v) => setView({ ...view, ai: String(v) })} />
              <Select className="w-36" value={view.sort} ariaLabel="Sort"
                options={[{ value: "newest", label: "Newest first" }, { value: "risk", label: "Highest risk" }]}
                onChange={(v) => setView({ ...view, sort: String(v) })} />
            </>
          )}
          <span className="admin-help ml-auto">{shown.length === items.length ? `${items.length} items` : `${shown.length} of ${items.length} items`}</span>
        </div>

        {ai && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={checkAll} disabled={!!progress || !unchecked.length}
              title="Score every unchecked item in this list with Clef-flash - advisory only">
              {progress ? `Checking ${progress.done}/${progress.total}…` : `AI check unchecked (${unchecked.length})`}
            </button>
            {canAct && flaggedShown.length > 0 && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelected(new Set(flaggedShown.map(keyOf)))}>
                Select flagged ({flaggedShown.length})
              </button>
            )}
            <span className="admin-help">{ai.autoCheck ? "New and edited items are checked automatically." : "Scores are hints - you decide."}</span>
          </div>
        )}

        {canAct && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-950/5 p-2 dark:bg-white/5">
            <span className="text-sm text-gray-700 dark:text-gray-300">{selected.size} selected</span>
            {bulk ? (
              <>
                <input className="admin-input min-w-60 flex-1" autoFocus placeholder={`Reason to ${bulk.action} - the authors see this`}
                  value={bulk.reason} onChange={(e) => setBulk({ ...bulk, reason: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runBulk(); } }} />
                <button type="button" className={`admin-btn ${bulk.action === "delete" ? "admin-btn-danger" : "admin-btn-primary"}`} onClick={runBulk}>
                  Confirm {bulk.action}
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setBulk(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openBulk("reject")}>Reject selected</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => openBulk("delete")}>Delete selected</button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelected(new Set())}>Clear</button>
              </>
            )}
          </div>
        )}

        {shown.length === 0 && <p className="admin-help">Nothing here.</p>}
        <ul className="divide-y divide-gray-950/5 rounded-lg ring-1 ring-gray-950/5 dark:divide-white/10 dark:ring-white/10">
          {shown.map((item) => (
            <li key={keyOf(item)} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-start gap-3">
                {canAct && (
                  <input type="checkbox" className="mt-1" checked={selected.has(keyOf(item))} onChange={() => toggle(item)}
                    aria-label={`Select ${item.title}`} />
                )}
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium text-gray-950 dark:text-white">
                    <span className="mr-2 font-mono text-xs text-gray-500 uppercase">{item.type === "blog_post" ? "post" : "quote"}</span>
                    {item.type === "blog_post" && item.status === "published" && item.slug
                      ? <a href={`/blog/${item.slug}`} target="_blank" rel="noopener" className="hover:underline">{item.title}</a>
                      : item.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <button type="button" className="link" onClick={() => loadUser(item.author.id)}>
                      {item.author.name}
                    </button>{" "}
                    · {when(item.createdAt)} · <span className={statusTone[item.status] ?? ""}>{item.status}</span>
                    {item.moderationReason && <> · “{item.moderationReason}”</>}
                  </p>
                  {ai && item.check && (
                    <p className="text-xs" role="status">
                      <span className={tone(item.check.spam, flagAt)}>Spam {pct(item.check.spam)}</span> ·{" "}
                      <span className={tone(item.check.abuse, flagAt)}>Abuse {pct(item.check.abuse)}</span> ·{" "}
                      <span className={tone(item.check.lowQuality, flagAt)}>Low quality {pct(item.check.lowQuality)}</span>
                      <span className="text-gray-400"> · {item.check.auto ? "auto" : "checked"} {when(item.check.checkedAt)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {ai && (
                    <button type="button" className="admin-btn admin-btn-secondary" disabled={busy.has(keyOf(item))}
                      onClick={() => aiCheck(item)} title="Spam / abuse / low-quality signal from Clef-flash - advisory only">
                      {busy.has(keyOf(item)) ? "Checking…" : item.check ? "Re-check" : "AI check"}
                    </button>
                  )}
                  {canAct && (<>
                    {item.status === "rejected"
                      ? <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPending({ item, action: "restore", reason: "" })}>Restore</button>
                      : <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPending({ item, action: "reject", reason: suggestedReason(risk(item.check) >= flagAt ? item.check : null) })}>Reject</button>}
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => setPending({ item, action: "delete", reason: "" })}>Delete</button>
                  </>)}
                </div>
              </div>
              {pending?.item === item && (
                <div className="flex flex-wrap items-center gap-2">
                  <input className="admin-input min-w-60 flex-1" autoFocus placeholder={`Reason to ${pending.action} - the author sees this`}
                    value={pending.reason} onChange={(e) => setPending({ ...pending, reason: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void confirmAction(); } }} />
                  <button type="button" className={`admin-btn ${pending.action === "delete" ? "admin-btn-danger" : "admin-btn-primary"}`} onClick={confirmAction}>
                    Confirm {pending.action}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPending(null)}>Cancel</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6 self-start">
      {ai && stats && (
        <section className="admin-card space-y-2">
          <h3 className="admin-card-title">AI vs your decisions</h3>
          {stats.checked === 0 ? (
            <p className="admin-help">No checked items yet. Run an AI check, then moderate as usual - this card compares the two.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <dt>Checked</dt><dd className="text-right font-medium">{stats.checked}</dd>
                <dt>Flagged (≥ {pct(stats.flagAt)})</dt><dd className="text-right font-medium">{stats.flagged}</dd>
                <dt>Flagged, you removed</dt><dd className="text-right font-medium text-emerald-700 dark:text-emerald-400">{stats.flaggedActioned}</dd>
                <dt>Flagged, you kept</dt><dd className="text-right font-medium text-amber-700 dark:text-amber-400">{stats.flaggedKept}</dd>
                <dt>You removed, not flagged</dt><dd className="text-right font-medium text-red-700 dark:text-red-400">{stats.missed}</dd>
              </dl>
              <p className="admin-help">
                {stats.flagged > 0 && `When it flags, you agree ${pct(stats.flaggedActioned / stats.flagged)} of the time. `}
                "Kept" counts items you haven't decided on yet too.
              </p>
            </>
          )}
        </section>
      )}
      <aside className="admin-card space-y-4">
        {!detail ? (
          <p className="admin-help">Pick an author to see their strike score, history and bans.</p>
        ) : (
          <>
            <div>
              <h3 className="admin-card-title">{detail.user.name}</h3>
              <p className="admin-help">{detail.user.email} · {detail.user.role}</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Strikes (90 days): <strong className={detail.strikes >= 3 ? "text-red-600 dark:text-red-400" : ""}>{detail.strikes}</strong>
            </p>
            {detail.activeBan ? (
              <div className="space-y-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                <p>Banned {detail.activeBan.expiresAt ? `until ${when(detail.activeBan.expiresAt)}` : "permanently"} - {detail.activeBan.reason}</p>
                {can(me, "users.ban") && <button type="button" className="admin-btn admin-btn-secondary" onClick={doUnban}>Lift ban</button>}
              </div>
            ) : can(me, "users.ban") && (
              <div className="space-y-2">
                <input className="admin-input" placeholder="Ban reason" value={ban.reason} onChange={(e) => setBan({ ...ban, reason: e.target.value })} />
                <div className="flex gap-2">
                  <Select className="w-36" value={ban.length} options={BAN_LENGTHS} ariaLabel="Ban length" onChange={(v) => setBan({ ...ban, length: String(v) })} />
                  <button type="button" className="admin-btn admin-btn-danger" onClick={doBan}>Ban</button>
                </div>
              </div>
            )}
            <div>
              <h4 className="mb-1 font-mono text-xs tracking-widest text-gray-500 uppercase">History</h4>
              {detail.history.length === 0 && <p className="admin-help">No actions.</p>}
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {detail.history.map((h) => (
                  <li key={h.id}><span className="font-mono uppercase">{h.action}</span> {h.contentTitle} - {h.reason} <span className="text-gray-400">({when(h.createdAt)})</span></li>
                ))}
              </ul>
            </div>
            {detail.bans.length > 0 && (
              <div>
                <h4 className="mb-1 font-mono text-xs tracking-widest text-gray-500 uppercase">Bans</h4>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {detail.bans.map((b) => (
                    <li key={b.id}>{b.reason} - {b.expiresAt ? `until ${when(b.expiresAt)}` : "permanent"}{b.liftedAt && " (lifted)"}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
      </div>
    </div>
  );
}
