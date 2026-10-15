import React from "react";
import { Badge } from "@/components/shadcn/ui/badge";

// Every status/action word the account area shows, mapped to one state tone.
const TONE: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  published: "success",
  draft: "secondary",
  pending: "warning",
  rejected: "danger",
  reject: "danger",
  restore: "success",
  delete: "secondary",
};

/** Soft tinted pill with a dot, coloured by the state tokens (shadcn.css). */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TONE[status] ?? "secondary"} className="capitalize">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </Badge>
  );
}
