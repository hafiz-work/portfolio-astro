import React, { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Send, EyeOff, Archive } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import {
  AdminBadge,
  statusBadgeVariant,
  CellPrimary,
  CellSecondary,
  CellText,
  RowActions,
  AdminAction,
  EditAction,
  type BadgeVariant,
} from "../../ui/admin/primitives";
import { Select } from "../../ui/Select";
import { cmsService, extractApiError } from "../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../lib/admin-ui";
import type { CmsProject, ProjectWarning } from "../../../types/project-cms";

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  business: "info",
  personal: "accent",
  work: "neutral",
};

const WARNING_LABEL: Record<string, string> = {
  missing_summary: "No summary",
  missing_media: "Missing media",
  missing_tech: "Missing tech",
  no_public_links: "No public links",
  media_missing_alt: "Media missing alt",
  hidden_links: "Hidden links",
};

const isPubliclyViewable = (p: CmsProject) =>
  p.isPublic !== false &&
  !p.archivedAt &&
  ["published", "completed", "in-progress", "maintained"].includes(p.status ?? "");

const formatDate = (s?: string) => {
  if (!s) return "-";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

export const ProjectsCmsTable = () => {
  const [data, setData] = useState<CmsProject[]>([]);
  const [warnings, setWarnings] = useState<Record<number, ProjectWarning[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  const loadWarnings = async (projects: CmsProject[]) => {
    const results = await Promise.allSettled(
      projects.map((p) => cmsService.getProjectDetail(p.id)),
    );
    const map: Record<number, ProjectWarning[]> = {};
    results.forEach((res, i) => {
      if (res.status === "fulfilled" && res.value) map[projects[i].id] = res.value.warnings ?? [];
    });
    setWarnings(map);
  };

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projects = await cmsService.listProjects();
      setData(projects);
      // Warning badges are best-effort and load after the list (one detail
      // fetch per project). Failures simply omit warning badges for that row.
      void loadWarnings(projects);
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const runAction = async (
    label: string,
    p: CmsProject,
    fn: () => Promise<unknown>,
  ) => {
    setBusyId(p.id);
    try {
      const res = await fn();
      if (res === null) {
        // null = not found (404) or session expired (401 → ApiClient redirects
        // to /login). Not a business-rule rejection, so don't say "blocked".
        showToast({ type: "error", title: `Could not ${label.toLowerCase()}`, message: `"${p.title}" was not found, or your session expired.` });
        return;
      }
      showToast({ type: "success", title: `${label} succeeded`, message: `"${p.title}"` });
      await loadAll();
    } catch (e) {
      const { message } = extractApiError(e);
      showToast({ type: "error", title: `${label} blocked`, message });
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = (p: CmsProject) => runAction("Publish", p, () => cmsService.publishProject(p.id));
  const handleUnpublish = (p: CmsProject) => runAction("Unpublish", p, () => cmsService.unpublishProject(p.id));
  const handleArchive = async (p: CmsProject) => {
    const ok = await confirmDialog({
      title: "Archive project",
      message: `Archive "${p.title}"? It will be hidden from the public site. This is reversible.`,
      confirmText: "Archive",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    await runAction("Archive", p, () => cmsService.archiveProject(p.id));
  };

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (statusFilter !== "all" && (p.status ?? "") !== statusFilter) return false;
      if (typeFilter !== "all" && p.projectType !== typeFilter) return false;
      if (visibilityFilter === "public" && (p.isPublic === false || p.isConfidential)) return false;
      if (visibilityFilter === "confidential" && !p.isConfidential) return false;
      if (visibilityFilter === "private" && p.isPublic !== false) return false;
      return true;
    });
  }, [data, statusFilter, typeFilter, visibilityFilter]);

  const columns: ColumnDef<CmsProject>[] = [
    {
      accessorKey: "title",
      header: "Project",
      cell: ({ row }) => {
        const p = row.original;
        const w = warnings[p.id] ?? [];
        return (
          <div className="min-w-0">
            <CellPrimary>{p.title}</CellPrimary>
            <CellSecondary mono>{p.slug}</CellSecondary>
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {p.featured && <AdminBadge variant="accent">Featured</AdminBadge>}
              {p.isConfidential && <AdminBadge variant="warning">Confidential</AdminBadge>}
              {w.map((warn) => (
                <AdminBadge
                  key={warn.code}
                  variant={warn.severity === "error" ? "danger" : "warning"}
                >
                  {WARNING_LABEL[warn.code] ?? warn.code}
                </AdminBadge>
              ))}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "projectType",
      header: "Type",
      size: 110,
      cell: ({ row }) => (
        <AdminBadge variant={TYPE_VARIANT[row.original.projectType] ?? "neutral"}>
          {row.original.projectType || "-"}
        </AdminBadge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 130,
      cell: ({ row }) => {
        const status = (row.original.status as string) || "unknown";
        return (
          <AdminBadge variant={statusBadgeVariant(status)} dot>
            {status.replace(/-/g, " ")}
          </AdminBadge>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      size: 110,
      cell: ({ row }) => <CellText>{formatDate(row.original.updatedAt)}</CellText>,
    },
    {
      id: "actions",
      header: "Actions",
      size: 190,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const busy = busyId === p.id;
        const published = p.status === "published";
        return (
          <RowActions>
            <EditAction href={`/admin/projects/edit?id=${p.id}`} label={`Edit ${p.title}`} />
            {isPubliclyViewable(p) ? (
              <AdminAction
                href={`/projects/${p.slug}`}
                label="Preview (public)"
                icon={Eye}
              />
            ) : (
              <button
                type="button"
                disabled
                title="Preview available after publish"
                aria-label="Preview unavailable"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {published ? (
              <AdminAction onClick={() => !busy && handleUnpublish(p)} label="Unpublish" icon={EyeOff} />
            ) : (
              <AdminAction onClick={() => !busy && handlePublish(p)} label="Publish" icon={Send} />
            )}
            {p.status !== "archived" && (
              <AdminAction onClick={() => !busy && handleArchive(p)} label="Archive" icon={Archive} variant="danger" />
            )}
          </RowActions>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <p className="font-medium">Failed to load projects</p>
        <p className="mt-1 opacity-80">{error}</p>
        <button type="button" onClick={() => void loadAll()} className="admin-btn admin-btn-secondary mt-3">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyTitle="No projects"
        emptyDescription="Create your first project to feature it on the portfolio."
        filters={
          <>
            <Select
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(String(v))}
              className="w-40"
              options={[
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" },
                { value: "completed", label: "Completed" },
                { value: "in-progress", label: "In progress" },
                { value: "maintained", label: "Maintained" },
              ]}
            />
            <Select
              ariaLabel="Filter by type"
              value={typeFilter}
              onChange={(v) => setTypeFilter(String(v))}
              className="w-40"
              options={[
                { value: "all", label: "All types" },
                { value: "personal", label: "Personal" },
                { value: "business", label: "Business" },
                { value: "work", label: "Work" },
              ]}
            />
            <Select
              ariaLabel="Filter by visibility"
              value={visibilityFilter}
              onChange={(v) => setVisibilityFilter(String(v))}
              className="w-40"
              options={[
                { value: "all", label: "All" },
                { value: "public", label: "Public" },
                { value: "confidential", label: "Confidential" },
                { value: "private", label: "Private" },
              ]}
            />
          </>
        }
      />
    </div>
  );
};
