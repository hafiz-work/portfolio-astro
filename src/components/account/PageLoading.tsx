import React from "react";
import { Spinner } from "@/components/shadcn/ui/spinner";

/** Page-level loading: centred in the content column (AccountShell makes it a flex column). */
export const PageLoading = () => (
  <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
    <Spinner role="presentation" aria-hidden="true" />
    Loading…
  </div>
);
