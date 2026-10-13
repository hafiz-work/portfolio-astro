import React, { useEffect, useState } from "react";
import { normalizeAuthor, normalizeQuote } from "@/lib/quote-text";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { accountService, errorText } from "../../lib/account";
import type { Quote } from "../../types/quotes";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDelete } from "./ConfirmDelete";
import { AccountDataTable, asDate } from "./AccountDataTable";

// /account/quotes: own quotes. Live on /quotes at once; a moderator can reject them.
const empty = { text: "", author: "", source: "" };

export function MyQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [draft, setDraft] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try { setQuotes(await accountService.listQuotes()); }
    catch (e) { setMsg(errorText(e)); }
  };
  useEffect(() => { void load(); }, []);

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const data = { text: normalizeQuote(draft.text), author: normalizeAuthor(draft.author), source: draft.source.trim() || null };
    try {
      if (editId) await accountService.updateQuote(editId, data);
      else await accountService.createQuote(data);
      setDraft(empty);
      setEditId(null);
      setMsg(null);
      await load();
    } catch (err) {
      setMsg(errorText(err));
    }
  };

  const remove = async (q: Quote) => {
    try { await accountService.deleteQuote(q.id); await load(); }
    catch (err) { setMsg(errorText(err)); }
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
      cell: ({ getValue }) => {
        const st = getValue<string>();
        return <Badge variant={st === "rejected" ? "destructive" : "default"} className="capitalize">{st}</Badge>;
      },
    },
    { accessorKey: "createdAt", header: "Date", meta: { className: "hidden sm:table-cell" }, cell: ({ getValue }) => asDate(getValue<string>()) },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
      cell: ({ row: { original: q } }) => (
        <div className="flex justify-end gap-1">
          {q.status !== "rejected" && (
            <Button variant="ghost" size="sm" onClick={() => { setEditId(q.id); setDraft({ text: q.text, author: q.author, source: q.source ?? "" }); }}>Edit</Button>
          )}
          <ConfirmDelete what="this quote" onConfirm={() => void remove(q)} />
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @4xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>{editId ? "Edit quote" : "Share a quote"}</CardTitle>
          <CardDescription>Shared quotes appear on the quotes page straight away.</CardDescription>
        </CardHeader>
        <form onSubmit={save}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="q-text">Quote</Label>
              <Textarea id="q-text" rows={3} maxLength={500} required value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q-author">Said by</Label>
              <Input id="q-author" maxLength={120} required value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q-source">Source (optional)</Label>
              <Input id="q-source" maxLength={120} placeholder="Book, film, speech…" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </div>
            {msg && <Alert variant="destructive"><AlertDescription>{msg}</AlertDescription></Alert>}
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit">{editId ? "Save" : "Share"}</Button>
            {editId && <Button type="button" variant="ghost" onClick={() => { setEditId(null); setDraft(empty); }}>Cancel</Button>}
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your quotes</CardTitle>
          <CardDescription>{quotes.length} shared</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountDataTable columns={columns} data={quotes} filterPlaceholder="Filter quotes…" empty="No quotes yet." />
        </CardContent>
      </Card>
    </div>
  );
}
