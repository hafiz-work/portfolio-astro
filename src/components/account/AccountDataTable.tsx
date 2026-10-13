import React, { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/shadcn/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/shadcn/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/ui/tooltip";

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
  /** Shown in the empty state when there's no data at all (not for "no matches"), e.g. a "New" button. */
  emptyAction?: ReactNode;
};

/** Account-area list: sortable headers, text filter (only past 5 rows), pagination.
 *  Borderless by design - a muted header pill and rounded hover rows carry the structure.
 *  Below md the same rows render as stacked blocks instead of a scrolling table. */
export function AccountDataTable<T>({
  columns,
  data,
  filterPlaceholder = "Filter…",
  pageSize = 10,
  empty = "Nothing here yet",
  emptyAction,
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
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
  const emptyState = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {data.length ? <Search /> : <Inbox />}
        </EmptyMedia>
        <EmptyTitle>
          {data.length ? "No matches" : empty.replace(/\.$/, "")}
        </EmptyTitle>
        {data.length > 0 && (
          <EmptyDescription>Try a different search.</EmptyDescription>
        )}
      </EmptyHeader>
      {!data.length && emptyAction && (
        <EmptyContent>{emptyAction}</EmptyContent>
      )}
    </Empty>
  );

  return (
    // Page islands sit outside the shell's provider, so row-action tooltips need their own.
    <TooltipProvider>
      <div className="grid gap-4">
        {data.length > 5 && (
          <Input
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          />
        )}
        <>
          {/* md and up: the regular table - headers stay, the empty state sits in the body. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => {
                      const sorted = h.column.getIsSorted();
                      const label = flexRender(
                        h.column.columnDef.header,
                        h.getContext(),
                      );
                      return (
                        <TableHead
                          key={h.id}
                          className={cn(
                            "text-muted-foreground",
                            h.column.columnDef.meta?.className,
                          )}
                        >
                          {h.isPlaceholder ? null : h.column.getCanSort() ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-2.5 h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                              onClick={h.column.getToggleSortingHandler()}
                            >
                              {label}
                              {sorted === "asc" ? (
                                <ArrowUp />
                              ) : sorted === "desc" ? (
                                <ArrowDown />
                              ) : (
                                <ArrowUpDown className="opacity-40" />
                              )}
                            </Button>
                          ) : (
                            label
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {!rows.length && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="p-0">
                      {emptyState}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.columnDef.meta?.className}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Below md: one stacked block per row, built from the same columns - no horizontal scroller. */}
          {!rows.length && <div className="md:hidden">{emptyState}</div>}
          <ul className="grid gap-2 text-sm md:hidden">
            {rows.map((row) => {
              const cells = row.getVisibleCells();
              const primary = cells[0];
              const rest = cells.slice(1);
              const actions = rest.find((cell) => cell.column.id === "actions");
              const details = rest.filter(
                (cell) => cell.column.id !== "actions",
              );
              return (
                <li key={row.id} className="rounded-[10px] bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {primary &&
                        flexRender(
                          primary.column.columnDef.cell,
                          primary.getContext(),
                        )}
                    </div>
                    {/* "actions" sits top-right on the row. */}
                    {actions && (
                      <div className="shrink-0 text-right">
                        {flexRender(
                          actions.column.columnDef.cell,
                          actions.getContext(),
                        )}
                      </div>
                    )}
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                      {details.map((cell) => (
                        <div key={cell.id} className="min-w-0">
                          <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            {typeof cell.column.columnDef.header === "string"
                              ? cell.column.columnDef.header
                              : cell.column.id}
                          </dt>
                          <dd className="mt-0.5 break-words">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </>
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            {/* shadcn Pagination renders links, so an unavailable end is a non-navigating stub. */}
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  {table.getCanPreviousPage() ? (
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        table.previousPage();
                      }}
                    />
                  ) : (
                    <PaginationPrevious
                      aria-disabled
                      tabIndex={-1}
                      className="pointer-events-none opacity-50"
                    />
                  )}
                </PaginationItem>
                <PaginationItem>
                  {table.getCanNextPage() ? (
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        table.nextPage();
                      }}
                    />
                  ) : (
                    <PaginationNext
                      aria-disabled
                      tabIndex={-1}
                      className="pointer-events-none opacity-50"
                    />
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/** Round icon button for a row's "actions" column; the label shows as a tooltip
 *  (and is the accessible name). Pass `href` for a link, else `onClick`. */
export function RowAction({
  label,
  icon,
  href,
  onClick,
  destructive,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const className = cn(
    "rounded-full text-muted-foreground",
    destructive
      ? "hover:bg-destructive/10 hover:text-destructive"
      : "hover:text-foreground",
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button asChild variant="ghost" size="icon-sm" className={className}>
            <a href={href} aria-label={label}>
              {icon}
            </a>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            onClick={onClick}
            aria-label={label}
          >
            {icon}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** API timestamps (UTC, often without a zone) as a local date. */
export const asDate = (iso: string | null | undefined) =>
  iso
    ? new Date(
      iso + (/[Zz]|[+-]\d\d:\d\d$/.test(iso) ? "" : "Z"),
    ).toLocaleDateString()
    : "-";
