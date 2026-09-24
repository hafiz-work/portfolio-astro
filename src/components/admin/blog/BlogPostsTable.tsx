import React, { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../ui/DataTable";
import {
  AdminBadge,
  statusBadgeVariant,
  CellPrimary,
  CellSecondary,
  CellText,
  RowActions,
  EditAction,
  DeleteAction,
} from "../../ui/admin/primitives";
import { blogService } from "../../../lib/blog";
import type { BlogPostSummary } from "../../../types/blog";

export const BlogPostsTable = () => {
  const [data, setData] = useState<BlogPostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const posts = await blogService.getAdminPosts();
        setData(posts);
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  const confirmDelete = async (post: BlogPostSummary) => {
    const modal = (window as Window & { confirmModal?: any }).confirmModal;
    if (modal?.show) {
      return modal.show({
        title: "Delete post",
        message: `Delete “${post.title}”? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "danger",
      });
    }
    return confirm("Are you sure you want to delete this post?");
  };

  const handleDelete = async (post: BlogPostSummary) => {
    if (!post.id) {
      alert("Missing blog post ID");
      return;
    }
    const shouldDelete = await confirmDelete(post);
    if (!shouldDelete) return;
    try {
      const success = await blogService.deletePost(post.id);
      if (success) {
        setData((prev) => prev.filter((item) => item.id !== post.id));
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete post");
    }
  };

  const columns: ColumnDef<BlogPostSummary>[] = [
    {
      accessorKey: "title",
      header: "Post",
      cell: ({ row }) => (
        <div className="min-w-0">
          <CellPrimary>{row.original.title}</CellPrimary>
          <CellSecondary mono>{row.original.slug}</CellSecondary>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 130,
      cell: ({ row }) => {
        const status = (row.getValue("status") as string) || "unknown";
        return (
          <AdminBadge variant={statusBadgeVariant(status)} dot>
            {status}
          </AdminBadge>
        );
      },
    },
    {
      accessorKey: "publishedDate",
      header: "Published",
      size: 130,
      cell: ({ row }) => (
        <CellText mono>{row.original.publishedDate || "-"}</CellText>
      ),
    },
    {
      accessorKey: "readTimeMinutes",
      header: "Read Time",
      size: 110,
      cell: ({ row }) => (
        <CellText>
          {row.original.readTimeMinutes
            ? `${row.original.readTimeMinutes} min`
            : "-"}
        </CellText>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 110,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions>
          <EditAction
            href={`/admin/blog/edit?id=${row.original.id}`}
            label={`Edit ${row.original.title}`}
          />
          <DeleteAction
            onClick={() => handleDelete(row.original)}
            label={`Delete ${row.original.title}`}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle="No posts yet"
      emptyDescription="Write your first post to populate the blog."
    />
  );
};
