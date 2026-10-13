import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/ui/radio-group";
import { accountService, errorText, type MyPostInput } from "../../lib/account";
import { renderUserMarkdown } from "../../lib/sanitize";
import type { BlogPost, BlogPostSummary } from "../../types/blog";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDelete } from "./ConfirmDelete";
import { AccountDataTable, asDate } from "./AccountDataTable";

// /account/blog: own posts. Published posts go live at once; a moderator can reject
// them (then they're read-only and show the reason).
const empty: MyPostInput = { title: "", excerpt: "", bodyContent: "", tags: [], status: "published" };
const statusVariant = { published: "default", draft: "secondary", rejected: "destructive" } as const;

export function MyPosts() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number | null; data: MyPostInput } | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try { setPosts(await accountService.listPosts()); }
    catch (e) { setMsg(errorText(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const open = async (summary?: BlogPostSummary) => {
    setMsg(null);
    setPreview(false);
    // The list has no body; fetch the one post being edited.
    const post: BlogPost | null = summary ? await accountService.getPost(summary.id).catch(() => null) : null;
    const data: MyPostInput = post
      ? { title: post.title, excerpt: post.excerpt, bodyContent: post.bodyContent, tags: post.tags, status: post.status === "draft" ? "draft" : "published" }
      : empty;
    setTagsText((data.tags ?? []).join(", "));
    setEditing({ id: post?.id ?? null, data });
  };

  const html = useMemo(() => (preview && editing ? renderUserMarkdown(editing.data.bodyContent) : ""), [preview, editing]);

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!editing) return;
    const data = { ...editing.data, tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) };
    try {
      if (editing.id) await accountService.updatePost(editing.id, data);
      else await accountService.createPost(data);
      setEditing(null);
      await load();
    } catch (err) {
      setMsg(errorText(err));
    }
  };

  const remove = async (post: BlogPostSummary) => {
    try { await accountService.deletePost(post.id); await load(); }
    catch (err) { setMsg(errorText(err)); }
  };

  const columns: ColumnDef<BlogPostSummary>[] = [
    {
      accessorKey: "title", header: "Title", meta: { className: "min-w-48 whitespace-normal" },
      cell: ({ row: { original: p } }) => (
        <>
          <p className="font-medium">
            {p.status === "published" ? <a href={`/blog/${p.slug}`} className="hover:underline">{p.title}</a> : p.title}
          </p>
          {p.status === "rejected" && (
            <p className="text-sm text-destructive">Removed by a moderator: {p.moderationReason}</p>
          )}
        </>
      ),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row: { original: p } }) => (
        <Badge variant={statusVariant[p.status as keyof typeof statusVariant] ?? "secondary"} className="capitalize">{p.status}</Badge>
      ),
    },
    { id: "date", accessorFn: (p) => p.publishedDate ?? p.createdAt, header: "Date", meta: { className: "hidden sm:table-cell" }, cell: ({ getValue }) => asDate(getValue<string>()) },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
      cell: ({ row: { original: p } }) => (
        <div className="flex justify-end gap-1">
          {p.status !== "rejected" && <Button variant="ghost" size="sm" onClick={() => void open(p)}>Edit</Button>}
          <ConfirmDelete what={`"${p.title}"`} onConfirm={() => void remove(p)} />
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (editing) {
    const set = (patch: Partial<MyPostInput>) => setEditing({ ...editing, data: { ...editing.data, ...patch } });
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editing.id ? "Edit post" : "New post"}</CardTitle>
          <CardDescription>Published posts appear on the blog straight away. Moderators may remove posts that break the rules.</CardDescription>
        </CardHeader>
        <form onSubmit={save}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" maxLength={200} required value={editing.data.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="excerpt">Summary</Label>
              <Textarea id="excerpt" rows={2} maxLength={500} required value={editing.data.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Post (Markdown)</Label>
                <Button type="button" variant="link" size="sm" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</Button>
              </div>
              {preview ? (
                <div className="prose prose-gray max-w-none rounded-md p-4 ring-1 ring-border dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <Textarea id="body" rows={16} maxLength={50000} required className="font-mono text-sm" value={editing.data.bodyContent} onChange={(e) => set({ bodyContent: e.target.value })} />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" placeholder="comma, separated" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>
            <RadioGroup value={editing.data.status} onValueChange={(v) => set({ status: v as MyPostInput["status"] })} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="published" id="st-pub" /><Label htmlFor="st-pub">Publish now</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="draft" id="st-draft" /><Label htmlFor="st-draft">Save as draft</Label></div>
            </RadioGroup>
            {msg && <Alert variant="destructive"><AlertDescription>{msg}</AlertDescription></Alert>}
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Blog posts</CardTitle>
          <CardDescription>{posts.length} {posts.length === 1 ? "post" : "posts"} · written in Markdown</CardDescription>
        </div>
        <Button onClick={() => void open()}>New post</Button>
      </CardHeader>
      <CardContent>
        {msg && <Alert variant="destructive" className="mb-4"><AlertDescription>{msg}</AlertDescription></Alert>}
        <AccountDataTable columns={columns} data={posts} filterPlaceholder="Filter posts…" empty="No posts yet." />
      </CardContent>
    </Card>
  );
}
