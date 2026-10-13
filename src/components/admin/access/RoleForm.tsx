import React, { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { accessService, type PermissionInfo } from "../../../lib/access";
import { extractApiError } from "../../../lib/projects-cms";
import { showToast } from "../../../lib/admin-ui";
import { byModule, OWNER_ONLY_MODULE } from "./permission-groups";

// /admin/roles/new and /admin/roles/edit?code=…: name, description, permission grid.
// Create takes no permissions (backend), so "new" creates then saves the grid.
const CODE = /^[a-z][a-z0-9_]{1,31}$/;

export function RoleForm({ mode }: { mode: "new" | "edit" }) {
  const [catalogue, setCatalogue] = useState<PermissionInfo[]>([]);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // ?code= is read on the client - islands also render on the server (no location there).
    const code0 = mode === "edit" ? new URLSearchParams(location.search).get("code") ?? "" : "";
    void (async () => {
      try {
        const [perms, role] = await Promise.all([
          accessService.listPermissions(),
          mode === "edit" ? accessService.getRole(code0) : Promise.resolve(null),
        ]);
        setCatalogue(perms);
        if (mode === "edit") {
          if (!role || role.code === "owner") return setNotFound(true);
          setForm({ code: role.code, name: role.name, description: role.description ?? "" });
          setGranted(new Set(role.permissions));
        }
      } catch (e) {
        if (mode === "edit") setNotFound(true);
        showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const modules = useMemo(() => byModule(catalogue), [catalogue]);
  const toggle = (p: string) =>
    setGranted((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const code = form.code.trim().toLowerCase();
    if (mode === "new" && !CODE.test(code)) {
      return showToast({ type: "warning", title: "Invalid code", message: "Lowercase letters, numbers and _ (2-32), starting with a letter." });
    }
    if (!form.name.trim()) return showToast({ type: "warning", title: "Name required" });
    setSaving(true);
    try {
      if (mode === "new") await accessService.createRole({ code, name: form.name.trim(), description: form.description.trim() || undefined });
      await accessService.updateRole(code, {
        ...(mode === "edit" ? { name: form.name.trim(), description: form.description.trim() || null } : {}),
        permissions: [...granted],
      });
      showToast({ type: "success", title: `${form.name.trim()} saved` });
      window.location.href = `/admin/roles/view?code=${encodeURIComponent(code)}`;
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Save failed", message });
      setSaving(false);
    }
  };

  if (loading) return <p className="admin-help">Loading…</p>;
  if (notFound) return <p className="admin-help">Role not found (the owner role can't be edited).</p>;

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="admin-card space-y-4">
        <h3 className="admin-card-title">Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="admin-label" htmlFor="role-code">Code</label>
            <input
              id="role-code"
              className="admin-input font-mono"
              value={form.code}
              placeholder="editor"
              disabled={mode === "edit"}
              required
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <p className="admin-help">{mode === "edit" ? "The code can't change once created." : "Lowercase letters, numbers and _. Can't change later."}</p>
          </div>
          <div className="space-y-2">
            <label className="admin-label" htmlFor="role-name">Name</label>
            <input id="role-name" className="admin-input" value={form.name} placeholder="Editor" maxLength={100} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="admin-label" htmlFor="role-description">Description</label>
            <textarea
              id="role-description"
              className="admin-input min-h-20"
              value={form.description}
              maxLength={500}
              placeholder="What people with this role do"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="admin-card space-y-4">
        <div>
          <h3 className="admin-card-title">Permissions</h3>
          <p className="admin-help">Give it admin.access to let it into the admin area. Role administration stays owner-only.</p>
        </div>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([module, perms]) => (
            <fieldset key={module} className="space-y-1">
              <legend className="font-mono text-xs/6 tracking-widest text-gray-500 uppercase dark:text-gray-400">{module}</legend>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {perms.map((p) => (
                  <label key={p.code} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300" title={p.description ?? p.code}>
                    <input type="checkbox" checked={granted.has(p.code)} disabled={module === OWNER_ONLY_MODULE} onChange={() => toggle(p.code)} />
                    {p.action}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="admin-form-actions">
        <a href={mode === "edit" ? `/admin/roles/view?code=${encodeURIComponent(form.code)}` : "/admin/roles"} className="admin-btn admin-btn-secondary">
          Cancel
        </a>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : mode === "new" ? "Create role" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
