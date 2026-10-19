import React, { useEffect, useState } from "react";
import { Check, RotateCcw, Sparkles, WandSparkles, X } from "lucide-react";
import { aiSettingsError, aiSettingsService, type AiGenerateRequest } from "../../../lib/ai-settings";
import { authService, can } from "../../../lib/auth";
import { showToast } from "../../../lib/admin-ui";

// AI writing help for one admin form field. Owner only for now (no per-account limits yet) -
// the backend /owner/ai/generate gate is the real wall; this only hides the buttons.
//
//   const ai = useAiField({ entity: "project", field: "subtitle", current: value, facts, onUse });
//   <label>…</label>{ai.buttons}  <input …/>  {ai.panel}
//
// Context, wide to narrow: the backend's system prompt (platform + copy rules), `facts()` = the
// whole record as it stands in the form (main context), the field's own brief (backend
// services/ai/fields.ts), then the owner's optional instruction.
// Generate = a fresh draft from the facts. Prompt = your instruction, applied to the current text.

export interface AiFieldOptions {
  entity: AiGenerateRequest["entity"];
  field: string;
  current: string;
  /** Called on click, so the latest unsaved form values go along. */
  facts: () => Record<string, string | string[]>;
  confidential?: boolean;
  onUse: (text: string) => void;
}

let ownerOnce: Promise<boolean> | null = null;
const isOwner = () => (ownerOnce ??= authService.me().then((me) => can(me, "roles.assign")).catch(() => false));

export function useAiField(opts: AiFieldOptions | undefined) {
  const [owner, setOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{ text: string; model: string } | null>(null);
  const [last, setLast] = useState<{ prompt?: string; withCurrent: boolean } | null>(null);

  useEffect(() => {
    if (opts) void isOwner().then(setOwner);
  }, [!!opts]);

  if (!opts || !owner) return { buttons: null, panel: null };

  const run = async (p: { prompt?: string; withCurrent: boolean }) => {
    setBusy(true);
    setLast(p);
    try {
      const r = await aiSettingsService.generate({
        entity: opts.entity,
        field: opts.field,
        facts: opts.facts(),
        confidential: opts.confidential,
        prompt: p.prompt || undefined,
        current: p.withCurrent && opts.current.trim() ? opts.current : undefined,
      });
      if (r) {
        setResult(r);
        setAsking(false);
      }
    } catch (e) {
      showToast({ type: "error", title: "AI couldn't write this field", message: aiSettingsError(e) });
    } finally {
      setBusy(false);
    }
  };

  const small = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50";
  const buttons = (
    <span className="ml-auto inline-flex items-center gap-1">
      <button type="button" className={`${small} text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-400/10`}
        onClick={() => void run({ withCurrent: false })} disabled={busy} title="Write a fresh draft from the record's facts">
        <Sparkles className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} aria-hidden="true" /> {busy ? "Writing…" : "Generate"}
      </button>
      <button type="button" className={`${small} text-gray-600 hover:bg-gray-950/5 dark:text-gray-300 dark:hover:bg-white/5`}
        onClick={() => setAsking((v) => !v)} disabled={busy} aria-expanded={asking} title="Tell the AI what you want">
        <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" /> Prompt
      </button>
    </span>
  );

  const panel = (asking || result) && (
    <div className="space-y-2 rounded-lg bg-sky-50/60 p-3 dark:bg-sky-400/5">
      {asking && (
        // stopPropagation: on Astro forms (AiField) this form sits inside the page form - its submit must not bubble up and save the page.
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (prompt.trim()) void run({ prompt: prompt.trim(), withCurrent: true }); }}>
          <textarea
            className="admin-input min-h-16"
            autoFocus
            maxLength={1000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); if (e.key === "Escape") setAsking(false); }}
            placeholder={opts.current.trim() ? 'e.g. "shorter", "mention it works offline", "more formal"' : 'e.g. "focus on the offline mode", "for non-technical readers"'}
            aria-label="Instruction for the AI"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !prompt.trim()}>
              <WandSparkles className="h-4 w-4" /> {busy ? "Writing…" : "Write"}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAsking(false)}>Cancel</button>
            <span className="admin-help">{opts.current.trim() ? "Applied to the current text." : "Uses the record's facts."} ⌘/Ctrl+Enter</span>
          </div>
        </form>
      )}
      {result && (
        <div className="space-y-2" role="status">
          <p className="whitespace-pre-wrap text-sm/6 text-gray-950 dark:text-white">{result.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => { opts.onUse(result.text); setResult(null); }}>
              <Check className="h-4 w-4" /> Use
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => last && void run(last)} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> {busy ? "Writing…" : "Try again"}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setResult(null)}>
              <X className="h-4 w-4" /> Discard
            </button>
            <span className="admin-help ml-auto">AI draft · {result.model} · check it before saving</span>
          </div>
        </div>
      )}
    </div>
  );

  return { buttons, panel };
}
