import React, { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../ui/DataTable";
import {
  AdminBadge,
  CellPrimary,
  CellSecondary,
  CellText,
  RowActions,
  EditAction,
} from "../../ui/admin/primitives";
import { familyService } from "../../../lib/family";
import type { FamilyTree } from "../../../types/family";

export const FamilyTreesTable = () => {
  const [data, setData] = useState<FamilyTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrees = async () => {
      try {
        const trees = await familyService.getAdminTrees();
        setData(trees);
      } catch (error) {
        console.error("Failed to load family trees:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrees();
  }, []);

  const columns: ColumnDef<FamilyTree>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Family Tree",
        cell: ({ row }) => (
          <div className="min-w-0">
            <CellPrimary>{row.original.name}</CellPrimary>
            <CellSecondary mono>/{row.original.slug}</CellSecondary>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <CellText>{row.original.description || "-"}</CellText>
        ),
      },
      {
        accessorKey: "isPublic",
        header: "Visibility",
        size: 120,
        cell: ({ row }) => (
          <AdminBadge
            variant={row.original.isPublic ? "success" : "neutral"}
            dot
          >
            {row.original.isPublic ? "Public" : "Private"}
          </AdminBadge>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        size: 120,
        cell: ({ row }) => (
          <CellText mono>
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </CellText>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions>
            <EditAction
              href={`/admin/family/edit?id=${row.original.id}`}
              label={`Open builder for ${row.original.name}`}
            />
          </RowActions>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle="No family trees yet"
      emptyDescription="Create a tree to start mapping family members."
    />
  );
};
