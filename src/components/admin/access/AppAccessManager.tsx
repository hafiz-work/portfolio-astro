import React, { useEffect, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, Plus, Search, Undo2, X } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import { Select } from "../../ui/Select";
import { AdminAction, CellPrimary, CellSecondary, CellText, DeleteAction, RowActions } from "../../ui/admin/primitives";
import { appAccessError, appAccessService, type AppInfo, type AppMember } from "../../../lib/app-access";
import { userLabel, type AdminUser } from "../../../lib/access";
import { authService, can } from "../../../lib/auth";
import { confirmDialog, showToast } from "../../../lib/admin-ui";

// /admin/app-access: who holds which role in the owner's other apps (Nubi Sport, …).
// Owner only - roles.assign is never grantable to another role, so it marks the owner.
// The backend's /owner/apps gate is the real wall; this only hides.

const DMY = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
/** ISO or D1 "YYYY-MM-DD HH:MM:SS" (UTC, no zone) -> dd/mm/yyyy Malaysian date. */
const grantedOn = (s: string) => {
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "-" : DMY.format(d);
};
const fail = (title: string, e: unknown) => showToast({ type: "error", title, message: appAccessError(e) });

export function AppAccessManager() {
  const [allowed, setAllowed] = useState(false);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [appCode, setAppCode] = useState("");
  const [members, setMembers] = useState<AppMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Add member
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [picked, setPicked] = useState<AdminUser | null>(null);
  // Autocomplete: "idle" until 2+ chars, then searching -> done (done + no results = "No match").
  const [searchState, setSearchState] = useState<"idle" | "searching" | "done">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [newRole, setNewRole] = useState("");
  // Role picked in a row but not saved yet (userId -> role). Saved only via Update + confirm.
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const app = apps.find((a) => a.code === appCode);
  const roleOptions = (app?.roles ?? []).map((r) => ({ value: r.code, label: r.name }));
  const roleName = (code: string) => app?.roles.find((r) => r.code === code)?.name ?? code;

  useEffect(() => {
    void (async () => {
      if (!can(await authService.me(), "roles.assign")) {
        window.location.replace("/admin");
        return;
      }
      setAllowed(true);
      try {
        const list = await appAccessService.listApps();
        setApps(list);
        setAppCode(list[0]?.code ?? "");
        if (!list.length) setLoading(false);
      } catch (e) {
        setLoadError(appAccessError(e));
        setLoading(false);
      }
    })();
  }, []);

  const loadMembers = async (code: string) => {
    setLoading(true);
    try {
      setMembers(await appAccessService.members(code));
      setDraft({});
    } catch (e) {
      setMembers([]);
      fail("Load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!appCode) return;
    setPicked(null);
    setQuery("");
    setNewRole(""); // no default: picking the first role (often admin) by accident is the risky mistake
    void loadMembers(appCode);
  }, [appCode]);

  // Debounced user search (backend needs 2+ chars).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || picked) {
      setResults([]);
      setSearchState("idle");
      return;
    }
    let stale = false;
    setSearchState("searching");
    const t = setTimeout(async () => {
      try {
        const found = await appAccessService.searchUsers(q);
        if (!stale) {
          setResults(found.slice(0, 10));
          setActive(0);
        }
      } catch (e) {
        if (!stale) fail("Search failed", e);
      } finally {
        if (!stale) setSearchState("done");
      }
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, picked]);

  // Close the list on a click outside it.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (m: AppMember, role: string) =>
    setDraft((d) => {
      const { [m.userId]: _, ...rest } = d;
      return role === m.role ? rest : { ...d, [m.userId]: role };
    });

  const setRole = async (m: AppMember) => {
    const role = draft[m.userId];
    if (!role || role === m.role) return;
    const ok = await confirmDialog({
      title: "Change role",
      message: `Change ${m.displayName || m.email} in ${app?.name} from ${roleName(m.role)} to ${roleName(role)}?`,
      confirmText: "Update",
    });
    if (!ok) return;
    try {
      const row = await appAccessService.setRole(appCode, m.userId, role);
      setMembers((prev) => prev.map((x) => (x.userId === m.userId ? (row ?? { ...x, role }) : x)));
      setDraft((d) => {
        const { [m.userId]: _, ...rest } = d;
        return rest;
      });
      showToast({ type: "success", title: `${m.displayName || m.email} is now ${roleName(role)}` });
    } catch (e) {
      fail("Change failed", e);
    }
  };

  const add = async () => {
    if (!picked || !newRole) return;
    setSaving(true);
    try {
      await appAccessService.setRole(appCode, picked.id, newRole);
      showToast({ type: "success", title: `${userLabel(picked)} added as ${roleName(newRole)}` });
      setPicked(null);
      setQuery("");
      await loadMembers(appCode);
    } catch (e) {
      fail("Add failed", e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: AppMember) => {
    const ok = await confirmDialog({
      title: "Remove access",
      message: `Remove ${m.displayName || m.email} from ${app?.name}? They lose their role there.`,
      variant: "danger",
      confirmText: "Remove",
    });
    if (!ok) return;
    try {
      await appAccessService.remove(appCode, m.userId);
      setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
      showToast({ type: "success", title: "Access removed" });
    } catch (e) {
      fail("Remove failed", e);
    }
  };

  const columns: ColumnDef<AppMember>[] = [
    {
      id: "member",
      header: "Member",
      accessorFn: (m) => `${m.displayName ?? ""} ${m.email} ${m.username ?? ""}`,
      cell: ({ row: { original: m } }) => (
        <div className="min-w-0">
          <CellPrimary>{m.displayName || m.email}</CellPrimary>
          <CellSecondary>
            {m.displayName ? m.email : ""}
            {m.username && <span className="font-mono">{m.displayName ? " · " : ""}@{m.username}</span>}
          </CellSecondary>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      size: 180,
      cell: ({ row: { original: m } }) => (
        <Select className="w-40" value={draft[m.userId] ?? m.role} onChange={(v) => pick(m, String(v))} options={roleOptions}
          ariaLabel={`Role for ${m.displayName || m.email}`} />
      ),
    },
    {
      accessorKey: "grantedAt",
      header: "Granted",
      size: 110,
      cell: ({ row: { original: m } }) => <CellText mono>{grantedOn(m.grantedAt)}</CellText>,
    },
    {
      id: "grantedBy",
      header: "Granted by",
      size: 150,
      accessorFn: (m) => m.grantedBy?.displayName ?? "",
      cell: ({ row: { original: m } }) => <CellText>{m.grantedBy?.displayName ?? "-"}</CellText>,
    },
    {
      id: "actions",
      header: "Actions",
      size: 90,
      enableSorting: false,
      cell: ({ row: { original: m } }) => (
        <RowActions>
          {draft[m.userId] ? (
            <>
              <AdminAction variant="primary" icon={Check} onClick={() => void setRole(m)}
                label={`Update ${m.displayName || m.email} to ${roleName(draft[m.userId])}`} />
              <AdminAction icon={Undo2} onClick={() => pick(m, m.role)} label="Undo role change" />
            </>
          ) : (
            <DeleteAction onClick={() => void remove(m)} label={`Remove ${m.displayName || m.email}`} />
          )}
        </RowActions>
      ),
    },
  ];

  if (!allowed) return <p className="admin-help">Checking access…</p>;
  if (loadError) return <p className="admin-error">Couldn't load apps: {loadError}</p>;
  if (!loading && !apps.length) return <p className="admin-help">No apps are registered yet.</p>;

  const memberIds = new Set(members.map((m) => m.userId));
  // Rows the keyboard can land on: not already a member, active and verified.
  const pickable = results.filter((u) => !memberIds.has(u.id) && u.isActive && u.emailVerified);

  return (
    <div className="space-y-6">
      <div className="admin-card space-y-4">
        <Select className="w-56" label="App" value={appCode} onChange={(v) => setAppCode(String(v))}
          options={apps.map((a) => ({ value: a.code, label: a.name }))} />

        <h3 className="admin-card-title">Add member</h3>
        <div className="flex flex-wrap items-start gap-2">
          <div className="relative w-full max-w-sm" ref={boxRef}>
            {picked ? (
              <div className="admin-input flex items-center justify-between gap-2">
                <span className="truncate">{userLabel(picked)} <span className="text-gray-500 dark:text-gray-400">{picked.email}</span></span>
                <button type="button" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => setPicked(null)} aria-label="Clear picked user">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input type="search" className="admin-input pl-9" placeholder="Search name, email or username…" value={query}
                  role="combobox" aria-expanded={open && searchState !== "idle"} aria-controls="app-access-users" aria-autocomplete="list"
                  aria-activedescendant={open && pickable[active] ? `app-access-user-${pickable[active].id}` : undefined}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") return setOpen(false);
                    if (!pickable.length) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setOpen(true);
                      const step = e.key === "ArrowDown" ? 1 : -1;
                      setActive((a) => (a + step + pickable.length) % pickable.length);
                    } else if (e.key === "Enter" && open) {
                      e.preventDefault();
                      setPicked(pickable[active] ?? pickable[0]);
                    }
                  }}
                  aria-label="Search users to add" />
              </label>
            )}
            {!picked && open && searchState !== "idle" && (
              <ul id="app-access-users" role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-gray-950/10 dark:bg-gray-900 dark:ring-white/10">
                {searchState === "searching" && !results.length && <li className="admin-help px-3 py-2">Searching…</li>}
                {searchState === "done" && !results.length && <li className="admin-help px-3 py-2">No account matches "{query.trim()}".</li>}
                {results.map((u) => {
                  const member = memberIds.has(u.id);
                  // Backend answers 400 user_not_eligible for these anyway.
                  const eligible = u.isActive && u.emailVerified;
                  const isActive = pickable[active]?.id === u.id;
                  return (
                    <li key={u.id} id={`app-access-user-${u.id}`} role="option" aria-selected={isActive} aria-disabled={member || !eligible || undefined}>
                      <button type="button" tabIndex={-1} disabled={member || !eligible} onClick={() => setPicked(u)}
                        onMouseEnter={() => { const i = pickable.indexOf(u); if (i >= 0) setActive(i); }}
                        className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-950/2.5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/5 ${isActive ? "bg-gray-950/5 dark:bg-white/5" : ""}`}>
                        <span className="text-gray-950 dark:text-white">{userLabel(u)}{member ? " (already a member)" : !eligible && " (inactive or unverified)"}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{u.email}{u.username && ` · @${u.username}`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Select className="w-40" value={newRole} onChange={(v) => setNewRole(String(v))} options={roleOptions} placeholder="Choose role" ariaLabel="Role for new member" />
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void add()} disabled={!picked || !newRole || saving}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <p className="admin-help">Type at least 2 characters (name, email or username). ↑ ↓ to move, Enter to pick, Esc to close.</p>
      </div>

      <DataTable
        columns={columns}
        data={members}
        isLoading={loading}
        emptyTitle="No members yet"
        emptyDescription={`Nobody has a role in ${app?.name ?? "this app"}. Add someone above.`}
      />
    </div>
  );
}
