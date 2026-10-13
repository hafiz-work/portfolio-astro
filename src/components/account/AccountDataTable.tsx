import React, { useState } from "react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type RowData, type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/ui/table";

declare module "@tanstack/react-table" {
  // Extra classes for a column's <th> and <td> (e.g. "hidden sm:table-cell", "whitespace-normal").
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

type Props<T> = {
  columns: ColumnDef<T, any>[];
  data: T[];
  filterPlaceholder?: string;
  pageSize?: number;
  empty?: string;
};

/** Account-area list: sortable headers, text filter (only past 5 rows), pagination. */
export function AccountDataTable<T>({ columns, data, filterPlaceholder = "Filter…", pageSize = 10, empty = "Nothing here yet." }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const table = useReactTable({
    data, columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="grid gap-3">
      {data.length > 5 && (
        <Input placeholder={filterPlaceholder} aria-label={filterPlaceholder} value={filter}
          onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      )}
      <div className="rounded-md ring-1 ring-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const label = flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <TableHead key={h.id} className={h.column.columnDef.meta?.className}>
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <Button variant="ghost" size="sm" className="-ml-2" onClick={h.column.getToggleSortingHandler()}>
                          {label}
                          {sorted === "asc" ? <ArrowUp /> : sorted === "desc" ? <ArrowDown /> : <ArrowUpDown className="opacity-50" />}
                        </Button>
                      ) : label}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                  {data.length ? "No matches." : empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span className="mr-auto">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      )}
    </div>
  );
}

/** API timestamps (UTC, often without a zone) as a local date. */
export const asDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + (/[Zz]|[+-]\d\d:\d\d$/.test(iso) ? "" : "Z")).toLocaleDateString() : "-";
