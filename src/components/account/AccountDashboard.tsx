import React, { useEffect, useState } from "react";
import { FileText, Plus, Quote as QuoteIcon, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import { cn } from "@/lib/utils";
import { authService, type Me } from "../../lib/auth";
import { accountService, errorText, type ModerationEntry } from "../../lib/account";
import type { BlogPostSummary } from "../../types/blog";
import type { Quote } from "../../types/quotes";
import { AccountDataTable, asDate } from "./AccountDataTable";
import { PageLoading } from "./PageLoading";
import { StatusBadge } from "./StatusBadge";

type Data = {
  me: Me;
  posts: BlogPostSummary[];
  quotes: Quote[];
  moderation: { strikes: number; history: ModerationEntry[] };
};

const moderationColumns: ColumnDef<ModerationEntry>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ getValue }) => asDate(getValue<string>()) },
  { id: "type", accessorFn: (h) => (h.contentType === "quote" ? "Quote" : "Blog post"), header: "Type", meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "contentTitle", header: "Item", meta: { className: "min-w-40 whitespace-normal font-medium" } },
  { accessorKey: "action", header: "Action", cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  { accessorKey: "reason", header: "Reason", enableSorting: false, meta: { className: "min-w-48 whitespace-normal" } },
];

const newest = <T extends { updatedAt: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

// Borderless surface for cards on the white content panel (bg-card is the panel colour).
const surface = "gap-4 bg-muted/40 py-5 shadow-none";

function Stat({ label, value, icon, foot, tone }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  foot: string;
  tone?: "success" | "danger";
}) {
  return (
    <Card className={surface}>
      <CardHeader className="px-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        <CardAction className="text-muted-foreground [&_svg]:size-4">{icon}</CardAction>
      </CardHeader>
      <CardFooter className={cn("px-5 text-xs text-muted-foreground", tone === "success" && "text-success", tone === "danger" && "text-destructive")}>
        {foot}
      </CardFooter>
    </Card>
  );
}

function Recent({ title, href, empty, newHref, items }: {
  title: string;
  href: string;
  empty: string;
  newHref: string;
  items: { key: number; label: string; status: string; date: string }[];
}) {
  return (
    <Card className={surface}>
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
            <a href={href}>View all</a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-5">
        {items.length ? (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                <StatusBadge status={item.status} />
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums max-sm:hidden">{item.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            {empty}
            <Button asChild size="sm" variant="secondary">
              <a href={newHref}><Plus />New</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** /account: what a signed-in user lands on - counts, recent items, moderation. */
export function AccountDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // me() is memoised (AccountShell already asked), so this is the 3 list calls.
        const [me, posts, quotes, moderation] = await Promise.all([
          authService.me(),
          accountService.listPosts(),
          accountService.listQuotes(),
          accountService.moderation().catch(() => ({ strikes: 0, history: [] })),
        ]);
        if (me) setData({ me, posts, quotes, moderation });
      } catch (e) {
        setLoadError(errorText(e));
      }
    })();
  }, []);

  if (loadError) return <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>;
  if (!data) return <PageLoading />;

  const { me, posts, quotes, moderation } = data;
  const count = (rows: { status?: string }[], status: string) => rows.filter((r) => (r.status ?? "published") === status).length;
  const removed = count(posts, "rejected") + count(quotes, "rejected");

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {me.profile?.displayName || me.name}</h1>
          <p className="text-sm text-muted-foreground">Your posts, quotes and account standing at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><a href="/account/quotes/new"><Plus />New quote</a></Button>
          <Button asChild><a href="/account/blog?new=1"><Plus />New post</a></Button>
        </div>
      </header>

      <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
        <Stat label="Blog posts" value={posts.length} icon={<FileText />}
          foot={`${count(posts, "published")} published · ${count(posts, "draft")} drafts`} />
        <Stat label="Quotes" value={quotes.length} icon={<QuoteIcon />} foot={`${count(quotes, "published")} live on /quotes`} />
        <Stat label="Removed by moderators" value={removed} icon={<ShieldAlert />}
          foot={removed ? "See the reasons below" : "Nothing removed"} tone={removed ? "danger" : "success"} />
        <Stat label="Strikes (90 days)" value={moderation.strikes} icon={<ShieldCheck />}
          foot={moderation.strikes ? "Repeated strikes can lead to a ban" : "Good standing"} tone={moderation.strikes ? "danger" : "success"} />
      </div>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <Recent title="Recent posts" href="/account/blog" newHref="/account/blog?new=1" empty="No posts yet."
          items={newest(posts).map((p) => ({ key: p.id, label: p.title, status: p.status, date: asDate(p.updatedAt) }))} />
        <Recent title="Recent quotes" href="/account/quotes" newHref="/account/quotes/new" empty="No quotes yet."
          items={newest(quotes).map((q) => ({ key: q.id, label: `“${q.text}”`, status: q.status ?? "published", date: asDate(q.updatedAt) }))} />
      </div>

      {moderation.history.length > 0 && (
        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Moderation history</h2>
            <p className="text-sm text-muted-foreground">What moderators did to your posts and quotes, and why.</p>
          </div>
          <AccountDataTable columns={moderationColumns} data={moderation.history} filterPlaceholder="Filter notices…" pageSize={5} />
        </section>
      )}
    </div>
  );
}
