import React, { useEffect, useState } from "react";
import { Select } from "../../ui/Select";
import { accessService, type ModerationItem, type ModerationUser } from "../../../lib/access";
import { authService, can, type Me } from "../../../lib/auth";
import { extractApiError } from "../../../lib/projects-cms";
import { showToast } from "../../../lib/admin-ui";

// User-authored blog posts + quotes. They go live at once; moderators reject (hide),
// restore or delete them with a reason the author sees. Strikes inform bans - never automatic.
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
const when = (iso: string) => new Date(iso + (/[Zz]|[+-]\d\d:\d\d$/.test(iso) ? "" : "Z")).toLocaleString();

export function ModerationManager() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [filter, setFilter] = useState({ type: "", status: "published" });
  const [pending, setPending] = useState<{ item: ModerationItem; action: Action; reason: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ModerationUser | null>(null);
  const [ban, setBan] = useState({ reason: "", length: "7" });

  const load = async () => {
    try {
      setItems(await accessService.moderationQueue({ type: (filter.type || undefined) as "blog" | "quote" | undefined, status: filter.status || undefined }));
    } catch (e) {
      showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
    }
  };
  useEffect(() => { void authService.me().then(setMe); }, []);
  useEffect(() => { void load(); }, [filter]);

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
          <span className="admin-help ml-auto">{items.length} items</span>
        </div>

        {items.length === 0 && <p className="admin-help">Nothing here.</p>}
        <ul className="divide-y divide-gray-950/5 rounded-lg ring-1 ring-gray-950/5 dark:divide-white/10 dark:ring-white/10">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium text-gray-950 dark:text-white">
                    <span className="mr-2 font-mono text-xs text-gray-500 uppercase">{item.type === "blog_post" ? "post" : "quote"}</span>
                    {item.type === "blog_post" && item.status === "published" && item.slug
                      ? <a href={`/blog/${item.slug}`} target="_blank" rel="noopener" className="hover:underline">{item.title}</a>
                      : item.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <button type="button" className="font-medium text-sky-600 hover:underline dark:text-sky-400" onClick={() => loadUser(item.author.id)}>
                      {item.author.name}
                    </button>{" "}
                    · {when(item.createdAt)} · <span className={statusTone[item.status] ?? ""}>{item.status}</span>
                    {item.moderationReason && <> · “{item.moderationReason}”</>}
                  </p>
                </div>
                {canAct && (
                  <div className="flex gap-1">
                    {item.status === "rejected"
                      ? <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPending({ item, action: "restore", reason: "" })}>Restore</button>
                      : <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPending({ item, action: "reject", reason: "" })}>Reject</button>}
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => setPending({ item, action: "delete", reason: "" })}>Delete</button>
                  </div>
                )}
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

      <aside className="admin-card space-y-4 self-start">
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
  );
}
