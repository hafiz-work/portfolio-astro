import React, { useEffect, useMemo, useState } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { AdminBadge } from "../../ui/admin/primitives";
import { accessService, type PermissionInfo, type RoleInfo } from "../../../lib/access";
import { extractApiError } from "../../../lib/projects-cms";
import { confirmDialog, showToast } from "../../../lib/admin-ui";
import { byModule } from "./permission-groups";

// /admin/roles/view?code=…: one role, read-only, with Edit / Delete.
export function RoleDetail() {
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [catalogue, setCatalogue] = useState<PermissionInfo[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    // ?code= is read on the client - islands also render on the server (no location there).
    const code = new URLSearchParams(location.search).get("code") ?? "";
    void (async () => {
      try {
        const [r, perms] = await Promise.all([accessService.getRole(code), accessService.listPermissions()]);
        setRole(r);
        setCatalogue(perms);
        setState(r ? "ready" : "missing");
      } catch {
        setState("missing");
      }
    })();
  }, []);

  const modules = useMemo(() => byModule(catalogue), [catalogue]);

  const remove = async () => {
    if (!role) return;
    const ok = await confirmDialog({ title: "Delete role", message: `Delete "${role.name}"?`, variant: "danger", confirmText: "Delete" });
    if (!ok) return;
    try {
      await accessService.deleteRole(role.code);
      showToast({ type: "success", title: `${role.name} deleted` });
      window.location.href = "/admin/roles";
    } catch (e) {
      showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message });
    }
  };

  if (state === "loading") return <p className="admin-help">Loading…</p>;
  if (state === "missing" || !role) return <p className="admin-help">Role not found.</p>;

  const owner = role.code === "owner";
  const has = (p: string) => owner || role.permissions.includes(p);
  const deletable = !role.isSystem && role.userCount === 0;

  return (
    <div className="space-y-6">
      <section className="admin-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="admin-card-title flex items-center gap-2">
              {role.name}
              {owner && <Lock className="h-3.5 w-3.5 text-gray-400" aria-label="Locked" />}
            </h3>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{role.code}</p>
          </div>
          {!owner && (
            <div className="flex items-center gap-2">
              <a href={`/admin/roles/edit?code=${encodeURIComponent(role.code)}`} className="admin-btn admin-btn-primary">
                <Pencil className="h-4 w-4" /> Edit
              </a>
              {deletable && (
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => void remove()}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="admin-label">Type</dt>
            <dd className="mt-1">
              <AdminBadge variant={role.isSystem ? "info" : "neutral"} dot>{role.isSystem ? "System" : "Custom"}</AdminBadge>
            </dd>
          </div>
          <div>
            <dt className="admin-label">Users</dt>
            <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{role.userCount}</dd>
          </div>
          <div>
            <dt className="admin-label">Permissions</dt>
            <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{owner ? "All (always)" : role.permissions.length}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="admin-label">Description</dt>
            <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{role.description || "-"}</dd>
          </div>
        </dl>
        {!owner && !deletable && (
          <p className="admin-help">{role.isSystem ? "System roles can't be deleted." : "Reassign this role's users before deleting it."}</p>
        )}
      </section>

      <section className="admin-card space-y-4">
        <h3 className="admin-card-title">Permissions by module</h3>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([module, perms]) => (
            <div key={module} className="space-y-1.5">
              <p className="font-mono text-xs/6 tracking-widest text-gray-500 uppercase dark:text-gray-400">{module}</p>
              <div className="flex flex-wrap gap-1.5">
                {perms.map((p) => (
                  <AdminBadge key={p.code} variant={has(p.code) ? "success" : "neutral"}>
                    {p.action}
                  </AdminBadge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
