import React, { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/ui/radio-group";
import { accountService, errorText, type MyPostInput } from "../../lib/account";
import { StatusBadge } from "./StatusBadge";
import { renderUserMarkdown } from "../../lib/sanitize";
import type { BlogPost, BlogPostSummary } from "../../types/blog";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDelete } from "./ConfirmDelete";
import { AccountDataTable, RowAction, asDate } from "./AccountDataTable";
import { BackButton, useFormGuard } from "./FormGuard";

// /account/blog: own posts. Published posts go live at once; a moderator can reject
// them (then they're read-only and show the reason).
const empty: MyPostInput = { title: "", excerpt: "", bodyContent: "", tags: [], status: "published" };

export function MyPosts() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number | null; data: MyPostInput; initial: string } | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [preview, setPreview] = useState(false);
  // The initial list fetch is a page-level LOAD error: it stays inline. Save and
  // delete outcomes are ACTIONS, so they surface as toasts instead.
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try { setPosts(await accountService.listPosts()); }
    catch (e) { setLoadError(errorText(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    void load();
    if (new URLSearchParams(location.search).has("new")) {
      history.replaceState(null, "", location.pathname);
      void open();
    }
  }, []);

  const open = async (summary?: BlogPostSummary) => {
    setLoadError(null);
    setPreview(false);
    // The list has no body; fetch the one post being edited.
    const post: BlogPost | null = summary ? await accountService.getPost(summary.id).catch(() => null) : null;
    const data: MyPostInput = post
      ? { title: post.title, excerpt: post.excerpt, bodyContent: post.bodyContent, tags: post.tags, status: post.status === "draft" ? "draft" : "published" }
      : empty;
    const tags = (data.tags ?? []).join(", ");
    setTagsText(tags);
    setEditing({ id: post?.id ?? null, data, initial: JSON.stringify([data, tags]) });
  };

  const html = useMemo(() => (preview && editing ? renderUserMarkdown(editing.data.bodyContent) : ""), [preview, editing]);

  const leave = useFormGuard(editing != null && JSON.stringify([editing.data, tagsText]) !== editing.initial);
  const closeEditor = () => void leave(() => setEditing(null));

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!editing) return;
    const data = { ...editing.data, tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) };
    try {
      const id = editing.id;
      const saved = id ? await accountService.updatePost(id, data) : await accountService.createPost(data);
      // Show the list at once with the saved post in it; the refetch then syncs silently.
      if (saved) setPosts((list) => (id ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list]));
      toast.success(id ? "Post updated" : "Post created");
      setEditing(null);
      void load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const remove = async (post: BlogPostSummary) => {
    try { await accountService.deletePost(post.id); setPosts((list) => list.filter((x) => x.id !== post.id)); toast.success("Post deleted"); }
    catch (err) { toast.error(errorText(err)); }
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
        <StatusBadge status={p.status} />
      ),
    },
    { id: "date", accessorFn: (p) => p.publishedDate ?? p.createdAt, header: "Date", meta: { className: "hidden sm:table-cell" }, cell: ({ getValue }) => asDate(getValue<string>()) },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
      cell: ({ row: { original: p } }) => (
        <div className="flex justify-end gap-1">
          {p.status !== "rejected" && <RowAction label="Edit" icon={<Pencil />} onClick={() => void open(p)} />}
          <ConfirmDelete what={`"${p.title}"`} onConfirm={() => void remove(p)} />
        </div>
      ),
    },
  ];

  if (editing) {
    const set = (patch: Partial<MyPostInput>) => setEditing({ ...editing, data: { ...editing.data, ...patch } });
    return (
      <div className="grid gap-6">
        <header className="grid gap-1 border-b border-border pb-6">
          <BackButton onClick={closeEditor}>Blog posts</BackButton>
          <h1 className="text-2xl font-semibold tracking-tight">{editing.id ? "Edit post" : "New post"}</h1>
          <p className="text-sm text-muted-foreground">Published posts appear on the blog straight away. Moderators may remove posts that break the rules.</p>
        </header>
        <form onSubmit={save} className="grid gap-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" maxLength={200} required value={editing.data.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="excerpt">Summary</Label>
              <Textarea id="excerpt" rows={2} maxLength={500} required value={editing.data.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="body">Post (Markdown)</Label>
                <Button type="button" variant="link" size="sm" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</Button>
              </div>
              {preview ? (
                <div className="prose prose-gray max-w-none rounded-md bg-muted/40 p-4 dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <Textarea id="body" rows={16} maxLength={50000} required className="font-mono text-sm" value={editing.data.bodyContent} onChange={(e) => set({ bodyContent: e.target.value })} />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" placeholder="comma, separated" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>
            <RadioGroup value={editing.data.status} onValueChange={(v) => set({ status: v as MyPostInput["status"] })} className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="published" id="st-pub" /><Label htmlFor="st-pub">Publish now</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="draft" id="st-draft" /><Label htmlFor="st-draft">Save as draft</Label></div>
            </RadioGroup>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-6">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={closeEditor}>Cancel</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Blog posts</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Loading…" : `${posts.length} ${posts.length === 1 ? "post" : "posts"} · written in Markdown`}</p>
        </div>
        <Button onClick={() => void open()}>New post</Button>
      </header>
      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      <AccountDataTable columns={columns} data={posts} filterPlaceholder="Filter posts…" loading={loading}
        empty={{
          title: "No posts yet",
          description: "Write your first post in Markdown. Published posts appear on the blog straight away.",
          icon: <FileText />,
          action: <Button onClick={() => void open()}><Plus />New post</Button>,
        }} />
    </div>
  );
}
