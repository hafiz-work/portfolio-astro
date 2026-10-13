import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { normalizeAuthor, normalizeQuote } from "@/lib/quote-text";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { accountService, errorText } from "../../lib/account";
import type { Quote } from "../../types/quotes";

const empty = { text: "", author: "", source: "" };
const LIST = "/account/quotes";

export function QuoteForm({ id = null }: { id?: number | null }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [draft, setDraft] = useState(empty);
  const [loading, setLoading] = useState(id != null);
  const [saving, setSaving] = useState(false);
  // The fetch that backs the edit form is a page-level LOAD error: it stays inline.
  // Save outcomes are ACTIONS, so they surface as toasts instead.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) return;
    let active = true;
    (async () => {
      try {
        const quotes = await accountService.listQuotes();
        const found = quotes.find((q) => q.id === id) ?? null;
        if (!active) return;
        if (!found) {
          window.location.assign(LIST);
          return;
        }
        setQuote(found);
        setDraft({ text: found.text, author: found.author, source: found.source ?? "" });
      } catch (e) {
        if (active) setLoadError(errorText(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      text: normalizeQuote(draft.text),
      author: normalizeAuthor(draft.author),
      source: draft.source.trim() || null,
    };
    try {
      if (quote) await accountService.updateQuote(quote.id, data);
      else await accountService.createQuote(data);
      toast.success(quote ? "Quote updated" : "Quote shared");
      // Let the toast land before the navigation swaps the page out.
      setTimeout(() => window.location.assign(LIST), 600);
    } catch (err) {
      toast.error(errorText(err));
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const editing = quote != null;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{editing ? "Edit quote" : "Share a quote"}</h1>
        <p className="text-sm text-muted-foreground">
          {editing ? "Your changes appear on the quotes page straight away." : "Shared quotes appear on the quotes page straight away."}
        </p>
      </header>
      <form onSubmit={save} className="grid gap-6">
        <div className="grid gap-4">
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
        </div>
        {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
        <div className="flex flex-wrap gap-2 border-t border-border pt-6">
          <Button type="submit" disabled={saving}>{editing ? "Save" : "Share"}</Button>
          <Button type="button" variant="ghost" onClick={() => window.location.assign(LIST)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
