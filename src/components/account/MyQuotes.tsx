import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { accountService, errorText } from "../../lib/account";
import type { Quote } from "../../types/quotes";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDelete } from "./ConfirmDelete";
import { StatusBadge } from "./StatusBadge";
import { AccountDataTable, RowAction, asDate } from "./AccountDataTable";

// /account/quotes: the signed-in user's own quotes. Live on /quotes at once; a
// moderator can reject them (they then show the reason). Create/edit live on their
// own pages (/account/quotes/new, /account/quotes/[id]/edit).
export function MyQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  // The list fetch is a page-level LOAD error: it stays inline. Delete outcomes are
  // ACTIONS, so they surface as toasts instead.
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try { setQuotes(await accountService.listQuotes()); }
    catch (e) { setLoadError(errorText(e)); }
  };
  useEffect(() => { void load(); }, []);

  const remove = async (q: Quote) => {
    try { await accountService.deleteQuote(q.id); toast.success("Quote deleted"); await load(); }
    catch (err) { toast.error(errorText(err)); }
  };

  const columns: ColumnDef<Quote>[] = [
    {
      accessorKey: "text", header: "Quote", meta: { className: "min-w-56 whitespace-normal" },
      cell: ({ row: { original: q } }) => (
        <>
          <p className="line-clamp-3 font-medium whitespace-pre-line" title={q.text}>“{q.text}”</p>
          {q.source && <p className="text-sm text-muted-foreground">{q.source}</p>}
          {q.status === "rejected" && (
            <p className="text-sm text-destructive">Removed by a moderator: {q.moderationReason}</p>
          )}
        </>
      ),
    },
    { accessorKey: "author", header: "Author", meta: { className: "whitespace-normal" } },
    {
      id: "status", accessorFn: (q) => q.status ?? "published", header: "Status",
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    { accessorKey: "createdAt", header: "Date", meta: { className: "hidden sm:table-cell" }, cell: ({ getValue }) => asDate(getValue<string>()) },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
      cell: ({ row: { original: q } }) => (
        <div className="flex justify-end gap-1">
          {q.status !== "rejected" && (
            <RowAction label="Edit" icon={<Pencil />} href={`/account/quotes/${q.id}/edit`} />
          )}
          <ConfirmDelete what="this quote" onConfirm={() => void remove(q)} />
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground">{quotes.length} {quotes.length === 1 ? "quote" : "quotes"} shared</p>
        </div>
        <Button asChild>
          <a href="/account/quotes/new">New quote</a>
        </Button>
      </header>
      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      <AccountDataTable columns={columns} data={quotes} filterPlaceholder="Filter quotes…" empty="No quotes yet." emptyAction={<Button asChild><a href="/account/quotes/new">New quote</a></Button>} />
    </div>
  );
}
