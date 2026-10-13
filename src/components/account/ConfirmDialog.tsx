import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

// Module-level, not React context: page islands are separate React roots from the
// shell, but they share this module, so any island can open the one dialog.
let show: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

/** `if (await confirm({ title: "Sign out?" })) …` - resolves false on cancel/Esc. */
export const confirm = (options: ConfirmOptions): Promise<boolean> =>
  show ? show(options) : Promise.resolve(window.confirm(options.title));

/** The one shadcn AlertDialog behind confirm(). Mounted once by AccountShell. */
export function ConfirmHost() {
  const [request, setRequest] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);

  useEffect(() => {
    show = (options) =>
      new Promise((resolve) => setRequest({ ...options, resolve }));
    return () => {
      show = null;
    };
  }, []);

  // A second call after resolving is a no-op, so the Action click + onOpenChange pair is safe.
  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <AlertDialog
      open={request != null}
      onOpenChange={(open) => !open && close(false)}
    >
      {/* No description: an explicit undefined tells Radix that's intended (no dev warning). */}
      <AlertDialogContent
        {...(request?.description ? {} : { "aria-describedby": undefined })}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && (
            <AlertDialogDescription>
              {request.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {request?.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => close(true)}
          >
            {request?.confirmLabel ?? "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
