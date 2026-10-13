import React from "react";
import { Trash2 } from "lucide-react";
import { confirm } from "./ConfirmDialog";
import { RowAction } from "./AccountDataTable";

/** Delete row action that asks first (shared by MyPosts / MyQuotes). */
export function ConfirmDelete({ what, onConfirm }: { what: string; onConfirm: () => void }) {
  const ask = async () => {
    if (await confirm({ title: `Delete ${what}?`, description: "This can't be undone.", confirmLabel: "Delete", destructive: true })) onConfirm();
  };
  return <RowAction label="Delete" icon={<Trash2 />} destructive onClick={() => void ask()} />;
}
