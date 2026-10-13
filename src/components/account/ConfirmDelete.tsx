import React from "react";
import { Button } from "@/components/shadcn/ui/button";
import { confirm } from "./ConfirmDialog";

/** Delete button that asks first (shared by MyPosts / MyQuotes). */
export function ConfirmDelete({ what, onConfirm }: { what: string; onConfirm: () => void }) {
  const ask = async () => {
    if (await confirm({ title: `Delete ${what}?`, description: "This can't be undone.", confirmLabel: "Delete", destructive: true })) onConfirm();
  };
  return <Button variant="ghost" size="sm" onClick={() => void ask()}>Delete</Button>;
}
