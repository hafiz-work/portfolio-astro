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
import { quotesService } from "../../../lib/quotes";
import { showToast, confirmDialog } from "../../../lib/admin-ui";
import type { Quote } from "../../../types/quotes";

const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const QuotesTable = () => {
  const [data, setData] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    quotesService
      .getAdminQuotes()
      .then(setData)
      .catch((error) => console.error("Failed to load quotes:", error))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (quote: Quote) => {
    const ok = await confirmDialog({
      title: "Delete quote",
      message: `Delete “${truncate(quote.text, 60)}” by ${quote.author}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    if (await quotesService.deleteQuote(quote.id)) {
      setData((prev) => prev.filter((item) => item.id !== quote.id));
    } else {
      showToast({ type: "error", title: "Delete failed", message: "Failed to delete quote." });
    }
  };

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      {
        accessorKey: "text",
        header: "Quote",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-md">
            <CellPrimary>{truncate(row.original.text)}</CellPrimary>
            <CellSecondary>{row.original.author}</CellSecondary>
          </div>
        ),
      },
      {
        id: "tags",
        header: "Tags",
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          if (!tags.length) return <CellText>-</CellText>;
          return (
            <span className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((t) => (
                <AdminBadge key={t.id}>{t.name}</AdminBadge>
              ))}
              {tags.length > 3 && <AdminBadge>+{tags.length - 3}</AdminBadge>}
            </span>
          );
        },
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => <CellText>{row.original.source || "-"}</CellText>,
      },
      {
        id: "actions",
        header: "Actions",
        size: 110,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions>
            <EditAction
              href={`/admin/quotes/edit?id=${row.original.id}`}
              label={`Edit quote by ${row.original.author}`}
            />
            <DeleteAction
              onClick={() => handleDelete(row.original)}
              label={`Delete quote by ${row.original.author}`}
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
      emptyTitle="No quotes yet"
      emptyDescription="Add a quote to start the public collection."
    />
  );
};
