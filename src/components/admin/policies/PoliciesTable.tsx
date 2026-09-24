import React, { useCallback, useEffect, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { FilePlus2 } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import {
  AdminBadge,
  AdminAction,
  CellPrimary,
  CellSecondary,
  CellText,
  RowActions,
  EditAction,
} from "../../ui/admin/primitives";
import { projectsService } from "../../../lib/projects";

interface PolicyRow {
  id: number;
  title: string;
  slug: string;
  hasPrivacy: boolean;
  hasTerms: boolean;
  updatedAt?: string | null;
}

export const PoliciesTable = () => {
  const [data, setData] = useState<PolicyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isActiveRef = useRef(true);

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    const projects = await projectsService.getAdminProjects();
    const rows = await Promise.all(
      projects.map(async (project) => {
        const policy = await projectsService
          .getAdminProjectPolicyById(project.id)
          .catch(() => null);
        return {
          id: project.id,
          title: project.title,
          slug: project.slug,
          hasPrivacy: Boolean(policy?.privacyPolicy),
          hasTerms: Boolean(policy?.termsAndConditions),
          updatedAt: policy?.updatedAt ?? null,
        };
      }),
    );
    if (!isActiveRef.current) return;
    setData(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    isActiveRef.current = true;

    const runLoad = async () => {
      try {
        await loadPolicies();
      } catch (error) {
        if (!isActiveRef.current) return;
        console.error("Failed to load policies:", error);
        setIsLoading(false);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        runLoad();
      }
    };

    runLoad();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      isActiveRef.current = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [loadPolicies]);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const columns: ColumnDef<PolicyRow>[] = [
    {
      accessorKey: "title",
      header: "Project",
      cell: ({ row }) => (
        <div className="min-w-0">
          <CellPrimary>{row.original.title}</CellPrimary>
          <CellSecondary mono>{row.original.slug}</CellSecondary>
        </div>
      ),
    },
    {
      accessorKey: "hasPrivacy",
      header: "Privacy",
      size: 120,
      cell: ({ row }) => (
        <AdminBadge variant={row.original.hasPrivacy ? "accent" : "neutral"} dot>
          {row.original.hasPrivacy ? "Published" : "None"}
        </AdminBadge>
      ),
    },
    {
      accessorKey: "hasTerms",
      header: "Terms",
      size: 120,
      cell: ({ row }) => (
        <AdminBadge variant={row.original.hasTerms ? "info" : "neutral"} dot>
          {row.original.hasTerms ? "Published" : "None"}
        </AdminBadge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      size: 120,
      cell: ({ row }) => (
        <CellText mono>{formatDate(row.original.updatedAt)}</CellText>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 90,
      enableSorting: false,
      cell: ({ row }) => {
        const hasPolicy = row.original.hasPrivacy || row.original.hasTerms;
        return (
          <RowActions>
            {hasPolicy ? (
              <EditAction
                href={`/admin/policies/edit?id=${row.original.id}`}
                label={`Edit policies for ${row.original.title}`}
              />
            ) : (
              <AdminAction
                href={`/admin/policies/new?projectId=${row.original.id}`}
                label={`Create policies for ${row.original.title}`}
                icon={FilePlus2}
              />
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle="No projects found"
      emptyDescription="Policies are attached to projects - create a project first."
    />
  );
};
