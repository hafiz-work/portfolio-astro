import React, { useMemo, useState, type ReactNode } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Inbox,
    Search,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    enableRowSelection?: boolean;
    /** Extra controls rendered next to the search field (e.g. column filters). */
    filters?: ReactNode;
    /** Shown in the empty state, e.g. "No projects yet". */
    emptyTitle?: string;
    emptyDescription?: string;
}

const checkboxClass =
    "h-4 w-4 rounded border-gray-300 bg-white text-sky-600 focus:ring-2 focus:ring-sky-500/30 dark:border-gray-600 dark:bg-gray-800";

/**
 * Admin data table. One integrated card: toolbar, table, pagination footer.
 * Below `md` the table swaps to a card list built from the same column
 * definitions (first column = card header, "actions" column = card footer),
 * so phones never get a 720px-wide horizontal scroller.
 */
export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading = false,
    enableRowSelection = false,
    filters,
    emptyTitle = "Nothing here yet",
    emptyDescription = "Records you create will show up in this list.",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [rowSelection, setRowSelection] = useState({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const tableColumns = useMemo(() => {
        if (!enableRowSelection) return columns;

        const selectionColumn: ColumnDef<TData, TValue> = {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        aria-label="Select all rows"
                        className={checkboxClass}
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        aria-label="Select row"
                        className={checkboxClass}
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 44,
        };

        return [selectionColumn, ...columns];
    }, [columns, enableRowSelection]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        state: {
            sorting,
            globalFilter,
            rowSelection,
            pagination,
        },
        enableRowSelection,
    });

    const selectedCount = Object.keys(rowSelection).length;
    const rows = table.getRowModel().rows;
    const totalRows = table.getFilteredRowModel().rows.length;
    const pageCount = table.getPageCount() || 1;
    const { pageIndex, pageSize } = table.getState().pagination;
    const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalRows);

    const emptyState = (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span className="pattern flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 ring-1 ring-gray-950/5 dark:text-gray-500 dark:ring-white/10">
                <Inbox className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-gray-950 dark:text-white">
                {globalFilter ? "No matching results" : emptyTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {globalFilter
                    ? "Try a different search term."
                    : emptyDescription}
            </p>
        </div>
    );

    const loadingState = (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-gray-500 dark:text-gray-400">
            <span className="terminal-loader" aria-hidden="true" />
            <p className="text-sm">Loading…</p>
        </div>
    );

    return (
        <div className="rounded-xl bg-white ring-1 ring-gray-950/5 dark:bg-white/3 dark:ring-white/10">
            {/* Toolbar - part of the card, not a floating box */}
            <div className="flex flex-col gap-3 border-b border-gray-950/5 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-56">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            placeholder="Search…"
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="field pl-9"
                        />
                    </div>

                    {filters}
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="whitespace-nowrap text-xs text-gray-500 tabular-nums dark:text-gray-400">
                        {totalRows} {totalRows === 1 ? "record" : "records"}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        Show
                        <span className="relative">
                            <select
                                value={pageSize}
                                onChange={(event) => table.setPageSize(Number(event.target.value))}
                                className="field w-auto appearance-none pr-8"
                            >
                                {[10, 20, 30, 50].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                                aria-hidden="true"
                            />
                        </span>
                    </label>
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-950/5 bg-gray-950/2 dark:border-white/10 dark:bg-white/2">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const sorted = header.column.getIsSorted();
                                    const isActions = header.column.id === "actions";
                                    return (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            className={`px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 first:pl-5 last:pr-5 ${isActions ? "text-right" : ""}`}
                                            style={{
                                                width: header.getSize() !== 150 ? header.getSize() : undefined,
                                            }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <button
                                                    type="button"
                                                    disabled={!header.column.getCanSort()}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={`inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors enabled:hover:text-gray-950 disabled:cursor-default dark:enabled:hover:text-white ${isActions ? "justify-end w-full" : ""}`}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() && (
                                                        <span className={sorted ? "text-sky-500" : "text-gray-400"}>
                                                            {sorted === "asc" ? (
                                                                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                                                            ) : sorted === "desc" ? (
                                                                <ArrowDown className="h-3 w-3" aria-hidden="true" />
                                                            ) : (
                                                                <ChevronsUpDown className="h-3 w-3" aria-hidden="true" />
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-950/5 dark:divide-white/10">
                        {isLoading ? (
                            <tr>
                                <td colSpan={tableColumns.length}>{loadingState}</td>
                            </tr>
                        ) : rows.length > 0 ? (
                            rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={
                                        row.getIsSelected()
                                            ? "bg-sky-500/5"
                                            : "transition-colors hover:bg-gray-950/2 dark:hover:bg-white/2"
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={`px-4 py-2.5 align-middle first:pl-5 last:pr-5 ${cell.column.id === "actions" ? "text-right" : ""}`}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={tableColumns.length}>{emptyState}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile card list - same rows, no horizontal scroll */}
            <div className="md:hidden">
                {isLoading ? (
                    loadingState
                ) : rows.length > 0 ? (
                    <ul className="divide-y divide-gray-950/5 dark:divide-white/10">
                        {rows.map((row) => {
                            const cells = row
                                .getVisibleCells()
                                .filter((cell) => cell.column.id !== "select");
                            const primary = cells[0];
                            const actions = cells.find((cell) => cell.column.id === "actions");
                            const rest = cells.filter(
                                (cell) => cell !== primary && cell !== actions,
                            );
                            return (
                                <li key={row.id} className="px-4 py-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {primary &&
                                                flexRender(
                                                    primary.column.columnDef.cell,
                                                    primary.getContext(),
                                                )}
                                        </div>
                                        {actions && (
                                            <div className="shrink-0">
                                                {flexRender(
                                                    actions.column.columnDef.cell,
                                                    actions.getContext(),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {rest.length > 0 && (
                                        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                                            {rest.map((cell) => (
                                                <div key={cell.id} className="min-w-0">
                                                    <dt className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                                                        {typeof cell.column.columnDef.header === "string"
                                                            ? cell.column.columnDef.header
                                                            : cell.column.id}
                                                    </dt>
                                                    <dd className="mt-0.5 truncate">
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
                ) : (
                    emptyState
                )}
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-950/5 px-4 py-2.5 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {selectedCount > 0 && (
                        <span className="mr-3 font-medium text-sky-600 dark:text-sky-400">
                            {selectedCount} selected
                        </span>
                    )}
                    {totalRows > 0 ? (
                        <>
                            <span className="font-medium text-gray-950 dark:text-white">
                                {rangeStart}–{rangeEnd}
                            </span>{" "}
                            of {totalRows}
                        </>
                    ) : (
                        "0 of 0"
                    )}
                </p>
                <div className="flex items-center gap-1.5">
                    <span className="mr-1 hidden text-xs text-gray-500 dark:text-gray-400 tabular-nums sm:inline">
                        Page {pageIndex + 1} / {pageCount}
                    </span>
                    <button
                        type="button"
                        aria-label="Previous page"
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-600 ring-1 ring-gray-950/10 ring-inset transition-colors hover:bg-gray-950/3 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:ring-white/15 dark:hover:bg-white/5 dark:hover:text-white"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next page"
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-600 ring-1 ring-gray-950/10 ring-inset transition-colors hover:bg-gray-950/3 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:ring-white/15 dark:hover:bg-white/5 dark:hover:text-white"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}
