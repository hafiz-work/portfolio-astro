import React, { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Lock } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import { AdminAction, AdminBadge, CellPrimary, CellSecondary, CellText, DeleteAction, EditAction, RowActions } from "../../ui/admin/primitives";
import { accessService, type RoleInfo } from "../../../lib/access";
import { extractApiError } from "../../../lib/projects-cms";
import { confirmDialog, showToast } from "../../../lib/admin-ui";

// /admin/roles: every role with its user and permission counts. Owner only (roles.*).
// The owner role is locked; system roles (admin, user) can't be deleted; a role with
// users must have them reassigned first.
export function RolesTable() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setRoles(await accessService.listRoles());
    } catch (e) {
      showToast({ type: "error", title: "Load failed", message: extractApiError(e).message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => void load(), []);

  const remove = async (r: RoleInfo) => {
    const ok = await confirmDialog({ title: "Delete role", message: `Delete "${r.name}"?`, variant: "danger", confirmText: "Delete" });
    if (!ok) return;
    try {
      await accessService.deleteRole(r.code);
      showToast({ type: "success", title: `${r.name} deleted` });
      await load();
    } catch (e) {
      showToast({ type: "error", title: "Delete failed", message: extractApiError(e).message });
    }
  };

  const columns: ColumnDef<RoleInfo>[] = [
    {
      accessorKey: "name",
      header: "Role",
      cell: ({ row }) => (
        <div className="min-w-0">
          <CellPrimary>
            <span className="inline-flex items-center gap-1.5">
              {row.original.name}
              {row.original.code === "owner" && <Lock className="h-3.5 w-3.5 text-gray-400" aria-label="Locked" />}
            </span>
          </CellPrimary>
          <CellSecondary mono>{row.original.code}</CellSecondary>
        </div>
      ),
    },
    {
      accessorKey: "isSystem",
      header: "Type",
      size: 110,
      cell: ({ row }) => (
        <AdminBadge variant={row.original.isSystem ? "info" : "neutral"} dot>
          {row.original.isSystem ? "System" : "Custom"}
        </AdminBadge>
      ),
    },
    {
      accessorKey: "userCount",
      header: "Users",
      size: 90,
      cell: ({ row }) => <CellText mono>{row.original.userCount}</CellText>,
    },
    {
      id: "permissions",
      header: "Permissions",
      size: 120,
      accessorFn: (r) => r.permissions.length,
      cell: ({ row }) => <CellText mono>{row.original.code === "owner" ? "All" : row.original.permissions.length}</CellText>,
    },
    {
      id: "actions",
      header: "Actions",
      size: 130,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <RowActions>
            <AdminAction href={`/admin/roles/view?code=${encodeURIComponent(r.code)}`} label={`View ${r.name}`} icon={Eye} />
            {r.code !== "owner" && <EditAction href={`/admin/roles/edit?code=${encodeURIComponent(r.code)}`} label={`Edit ${r.name}`} />}
            {!r.isSystem && r.userCount === 0 && <DeleteAction onClick={() => void remove(r)} label={`Delete ${r.name}`} />}
          </RowActions>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={roles}
      isLoading={loading}
      emptyTitle="No roles"
      emptyDescription="Create a role to give people access to parts of the admin area."
    />
  );
}
