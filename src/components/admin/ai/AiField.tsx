import React, { useEffect, useState } from "react";
import { useAiField } from "./AiFieldAssist";
import type { AiGenerateRequest } from "../../../lib/ai-settings";

// AI writing help on an Astro (non-React) admin form. Reads the live values at
// click time and writes the accepted text back into the form control, then
// fires input/change so form-guard and Tiptap's hidden textarea both sync.
// Owner check lives in useAiField; the backend gate is the real wall.
//
// The control is looked up by name every time, never held: TextEditor swaps its
// hidden textarea for a new node once the editor mounts. Listeners sit on the
// document in the capture phase, so the edit page's non-bubbling `change` counts too.

type Control = HTMLInputElement | HTMLTextAreaElement;
const control = (name: string) =>
  document.querySelector<Control>(`[name="${CSS.escape(name)}"]`);

// Backend facts cap (validators/ai.ts). ponytail: a long post body is cut, not summarised.
const FACT_MAX = 20000;

export function AiField({ entity, field, target, factsFrom = [] }: {
  entity: AiGenerateRequest["entity"];
  field: string;
  /** name= of the form control this field writes to. */
  target: string;
  /** name= of the other controls sent along as facts. */
  factsFrom?: string[];
}) {
  const [found, setFound] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const el = control(target);
    setFound(!!el);
    setValue(el?.value ?? "");
    const sync = (e: Event) => {
      const t = e.target as Control;
      if (t.name === target) setValue(t.value);
    };
    document.addEventListener("input", sync, true);
    document.addEventListener("change", sync, true);
    return () => {
      document.removeEventListener("input", sync, true);
      document.removeEventListener("change", sync, true);
    };
  }, [target]);

  const ai = useAiField(found ? {
    entity, field, current: value,
    facts: () => Object.fromEntries(factsFrom.map((name) => [name, (control(name)?.value ?? "").slice(0, FACT_MAX)])),
    onUse: (text) => {
      const el = control(target);
      if (!el) return;
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
  } : undefined);

  if (!ai.buttons && !ai.panel) return null;
  return <div className="space-y-2">{ai.buttons}{ai.panel}</div>;
}
