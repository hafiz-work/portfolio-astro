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
  DeleteAction,
} from "../../ui/admin/primitives";
import { experiencesService } from "../../../lib/experiences";
import type { Experience } from "../../../types/experiences";

const formatDate = (value: string | null) => {
  if (!value) return "Present";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
};

export const ExperiencesTable = () => {
  const [data, setData] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadExperiences = async () => {
      try {
        const experiences = await experiencesService.getAdminExperiences();
        setData(experiences);
      } catch (error) {
        console.error("Failed to load experiences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExperiences();
  }, []);

  const confirmDelete = async (experience: Experience) => {
    const modal = (window as Window & { confirmModal?: any }).confirmModal;
    if (modal?.show) {
      return modal.show({
        title: "Delete experience",
        message: `Delete “${experience.companyName} - ${experience.role}”? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "danger",
      });
    }
    return confirm("Are you sure you want to delete this experience?");
  };

  const handleDelete = async (experience: Experience) => {
    if (!experience.id) {
      alert("Missing experience ID");
      return;
    }
    const shouldDelete = await confirmDelete(experience);
    if (!shouldDelete) return;
    try {
      const success = await experiencesService.deleteExperience(experience.id);
      if (success) {
        setData((prev) => prev.filter((item) => item.id !== experience.id));
      } else {
        alert("Failed to delete experience");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete experience");
    }
  };

  const columns: ColumnDef<Experience>[] = useMemo(
    () => [
      {
        accessorKey: "companyName",
        header: "Company",
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="flex items-center gap-2">
              <CellPrimary>{row.original.companyName}</CellPrimary>
              {row.original.isCurrent && (
                <AdminBadge variant="success" dot>
                  Current
                </AdminBadge>
              )}
            </span>
            <CellSecondary>{row.original.role}</CellSecondary>
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => <CellText>{row.original.location || "-"}</CellText>,
      },
      {
        accessorKey: "startDate",
        header: "Duration",
        size: 200,
        cell: ({ row }) => (
          <CellText mono>
            {formatDate(row.original.startDate)} -{" "}
            {formatDate(row.original.endDate)}
          </CellText>
        ),
      },
      {
        accessorKey: "displayOrder",
        header: "Order",
        size: 80,
        cell: ({ row }) => (
          <CellText mono>{row.original.displayOrder}</CellText>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 110,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions>
            <EditAction
              href={`/admin/experiences/edit?id=${row.original.id}`}
              label={`Edit ${row.original.companyName}`}
            />
            <DeleteAction
              onClick={() => handleDelete(row.original)}
              label={`Delete ${row.original.companyName}`}
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
      emptyTitle="No experiences yet"
      emptyDescription="Add a role to build your public timeline."
    />
  );
};
