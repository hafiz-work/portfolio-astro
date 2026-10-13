import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Select } from "../../ui/Select";
import { accessService, userLabel, type AdminUser, type RoleInfo } from "../../../lib/access";
import { authService, can, type Me } from "../../../lib/auth";
import { extractApiError } from "../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../lib/admin-ui";

// The backend already filters: without roles.assign only 'user' rows come back, and
// the owner row can never be changed. This UI mirrors those rules; it doesn't enforce them.
const emptyDraft = { email: "", password: "", role: "user" };

export function UsersManager() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(emptyDraft);

  const canAssign = can(me, "roles.assign");

  const load = async () => {
    try {
      const who = await authService.me();
      setMe(who);
      const [list, roleList] = await Promise.all([
        accessService.listUsers(),
        can(who, "roles.read") ? accessService.listRoles() : Promise.resolve([]),
      ]);
      setUsers(list);
      setRoles(roleList);
    } catch (e) {
      showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  // 'owner' is never assignable.
  const roleOptions = (roles.length ? roles.map((r) => ({ value: r.code, label: r.name })) : [{ value: "user", label: "User" }])
    .filter((o) => o.value !== "owner");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => !q || `${u.email} ${userLabel(u)} ${u.role}`.toLowerCase().includes(q));
  }, [users, query]);

  const save = async (u: AdminUser, patch: Partial<{ role: string; isActive: boolean }>) => {
    try {
      await accessService.updateUser(u.id, patch);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: extractApiError(e).message });
    }
  };

  const add = async () => {
    if (!draft.email.trim() || draft.password.length < 12) {
      showToast({ type: "warning", title: "Email and a 12+ character password are required" });
      return;
    }
    try {
      await accessService.createUser({ email: draft.email.trim(), password: draft.password, role: canAssign ? draft.role : "user" });
      setDraft(emptyDraft);
      await load();
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Add failed", message });
    }
  };

  const remove = async (u: AdminUser) => {
    const ok = await confirmDialog({
      title: "Delete user",
      message: `Delete ${u.email}? This can't be undone.`,
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    try { await accessService.deleteUser(u.id); await load(); }
    catch (e) { showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message }); }
  };

  if (loading) return <p className="admin-help">Loading users…</p>;

  return (
    <div className="space-y-6">
      {can(me, "users.create") && (
        <div className="admin-card space-y-3">
          <h3 className="admin-card-title">Add user</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input className="admin-input max-w-65" type="email" placeholder="email@example.com" value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })} aria-label="New user email" />
            <input className="admin-input max-w-56" type="password" placeholder="Password (12+)" value={draft.password} autoComplete="new-password"
              onChange={(e) => setDraft({ ...draft, password: e.target.value })} aria-label="New user password" />
            {canAssign && (
              <Select className="w-40" value={draft.role} onChange={(v) => setDraft({ ...draft, role: String(v) })} options={roleOptions} ariaLabel="New user role" />
            )}
            <button type="button" className="admin-btn admin-btn-primary" onClick={add}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <p className="admin-help">{canAssign ? "Pick any role except Owner." : "New accounts get the User role."}</p>
        </div>
      )}

      <div className="admin-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="admin-card-title">{users.length} {users.length === 1 ? "user" : "users"}</h3>
          <label className="relative block w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" className="admin-input pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
          </label>
        </div>

        {visible.length === 0 && <p className="admin-help">{users.length ? "No users match your search." : "No users yet."}</p>}

        <ul className="divide-y divide-gray-950/5 rounded-lg ring-1 ring-gray-950/5 dark:divide-white/10 dark:ring-white/10">
          {visible.map((u) => {
            const isOwner = u.role === "owner";
            const isSelf = u.id === me?.id;
            const editable = !isOwner && !isSelf && can(me, "users.update");
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium text-gray-950 dark:text-white">{userLabel(u)}{isSelf && <span className="admin-help"> (you)</span>}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {u.email} · {u.emailVerified ? "verified" : "unverified"} · last login {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "never"}
                  </p>
                </div>
                {isOwner ? (
                  <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">Owner</span>
                ) : editable && canAssign ? (
                  <Select className="w-40" value={u.role} onChange={(v) => void save(u, { role: String(v) })} options={roleOptions} ariaLabel={`Role of ${u.email}`} />
                ) : (
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{u.role}</span>
                )}
                {editable && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={u.isActive} onChange={(e) => void save(u, { isActive: e.target.checked })} />
                    Active
                  </label>
                )}
                {editable && can(me, "users.delete") && (
                  <button type="button" className="admin-btn admin-btn-danger px-2!" onClick={() => remove(u)} aria-label={`Delete ${u.email}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
