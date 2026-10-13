import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { navigate } from "astro:transitions/client";
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { Button } from "@/components/shadcn/ui/button";
import { confirm } from "./ConfirmDialog";

const confirmDiscard = () =>
  confirm({
    title: "Discard changes?",
    description: "You have unsaved changes. They will be lost if you leave.",
    confirmLabel: "Discard",
    cancelLabel: "Keep editing",
    destructive: true,
  });

/** Guards unsaved form changes. While `dirty`: in-site navigation (ClientRouter links -
 *  sidebar, breadcrumb) asks with the shadcn dialog first, reload/close gets the
 *  browser's own prompt (the only one browsers allow). Returns `leave(fn)` for the
 *  form's own exits (Back, Cancel): asks if dirty, then runs fn unguarded. */
export function useFormGuard(dirty: boolean) {
  const armed = useRef(dirty);
  armed.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      if (armed.current) e.preventDefault();
    };
    const onNavigate = (e: Event) => {
      const nav = e as TransitionBeforePreparationEvent;
      // shortcut: browser back/forward (traverse) isn't guarded - the URL has already changed; add a history.go undo if that loses edits in practice.
      if (!armed.current || nav.navigationType === "traverse") return;
      nav.preventDefault();
      void confirmDiscard().then((ok) => {
        if (!ok) return;
        armed.current = false;
        void navigate(nav.to.href);
      });
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("astro:before-preparation", onNavigate);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("astro:before-preparation", onNavigate);
    };
  }, [dirty]);

  return async (fn: () => void) => {
    if (armed.current && !(await confirmDiscard())) return;
    armed.current = false;
    fn();
  };
}

/** Back link for edit/new screens: `<BackButton onClick={() => leave(...)} />`. */
export function BackButton({
  onClick,
  children = "Back",
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
      onClick={onClick}
    >
      <ArrowLeft />
      {children}
    </Button>
  );
}
