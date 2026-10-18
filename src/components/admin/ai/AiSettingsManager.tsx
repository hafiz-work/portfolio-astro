import React, { useEffect, useState } from "react";
import { FlaskConical, RefreshCw, RotateCcw, Save } from "lucide-react";
import { Select } from "../../ui/Select";
import {
  REASONING,
  aiSettingsError,
  aiSettingsService,
  type AiModelList,
  type AiRoute,
  type AiTestResult,
  type Reasoning,
} from "../../../lib/ai-settings";
import { authService, can } from "../../../lib/auth";
import { confirmDialog, showToast } from "../../../lib/admin-ui";

// /admin/ai: model + reasoning effort per backend AI use case. Owner only - same gate as
// App Access (roles.assign is never grantable). The backend's /owner/ai gate is the real wall.

const WHEN = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "short", timeStyle: "short" });
/** ISO or D1 "YYYY-MM-DD HH:MM:SS" (UTC, no zone) -> dd/mm/yyyy, hh:mm Malaysian time. */
const when = (s: string) => {
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "-" : WHEN.format(d);
};
const ctx = (n: number | null) => (n === null ? "" : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1e3)}K`);
const REASONING_LABEL: Record<Reasoning, string> = {
  none: "None",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high (xhigh)",
  max: "Max",
};
const DEFAULT = "default"; // Select value for "no reasoning_effort sent"
const fail = (title: string, e: unknown) => showToast({ type: "error", title, message: aiSettingsError(e) });

export function AiSettingsManager() {
  const [allowed, setAllowed] = useState(false);
  const [list, setList] = useState<AiModelList | null>(null);
  const [routes, setRoutes] = useState<AiRoute[]>([]);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadModels = async (refresh = false) => {
    setRefreshing(true);
    try {
      setList(await aiSettingsService.models(refresh));
    } catch (e) {
      fail("Model list failed", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (!can(await authService.me(), "roles.assign")) {
        window.location.replace("/admin");
        return;
      }
      setAllowed(true);
      try {
        setRoutes(await aiSettingsService.routes());
      } catch (e) {
        setLoadError(aiSettingsError(e));
      }
      await loadModels();
    })();
  }, []);

  if (!allowed) return <p className="admin-help">Checking access…</p>;
  if (loadError) return <p className="admin-error">Couldn't load AI settings: {loadError}</p>;

  const usable = list?.models.filter((m) => m.usable).length ?? 0;
  return (
    <div className="space-y-6">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3">
        <p className="admin-help">
          {list
            ? `${list.models.length} models from Command Code · ${usable} usable here · fetched ${when(list.fetchedAt)}`
            : "Loading the Command Code model list…"}
        </p>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadModels(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh list
        </button>
        {list?.stale && (
          <p className="admin-error w-full">Command Code didn't answer - this is the last list the backend fetched.</p>
        )}
      </div>
      {routes.map((r) => (
        <RouteCard key={r.useCase} route={r} list={list} onSaved={(n) => setRoutes((prev) => prev.map((x) => (x.useCase === n.useCase ? n : x)))} />
      ))}
    </div>
  );
}

function RouteCard({ route, list, onSaved }: { route: AiRoute; list: AiModelList | null; onSaved: (r: AiRoute) => void }) {
  const [model, setModel] = useState(route.model);
  const [reasoning, setReasoning] = useState<Reasoning | null>(route.reasoning);
  const [busy, setBusy] = useState<"" | "save" | "reset" | "test">("");
  const [test, setTest] = useState<AiTestResult | null>(null);

  useEffect(() => {
    setModel(route.model);
    setReasoning(route.reasoning);
  }, [route]);
  useEffect(() => setTest(null), [model, reasoning]); // a result belongs to the choice it tested

  const dirty = model !== route.model || reasoning !== route.reasoning;
  const known = list?.models.find((m) => m.id === model);
  // Usable first; /messages-only (Claude) listed greyed out so it's clear why they're missing.
  const modelOptions = [...(list?.models ?? [])]
    .sort((a, b) => Number(b.usable) - Number(a.usable))
    .map((m) => ({
      value: m.id,
      label: m.id === route.defaultModel ? `${m.name} (default)` : m.name,
      hint: m.usable ? [m.id, ctx(m.contextLength)].filter(Boolean).join(" · ") : "/messages only",
      disabled: !m.usable,
    }));

  const run = async (kind: "save" | "reset" | "test", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  };
  const save = () =>
    run("save", async () => {
      try {
        const next = await aiSettingsService.save(route.useCase, { model, reasoning });
        if (next) onSaved(next);
        showToast({ type: "success", title: `"${route.useCase}" now uses ${model}` });
      } catch (e) {
        fail("Save failed", e);
      }
    });
  const reset = async () => {
    const ok = await confirmDialog({
      title: "Reset to default",
      message: `Go back to ${route.defaultModel} with the model's default reasoning?`,
      confirmText: "Reset",
    });
    if (!ok) return;
    await run("reset", async () => {
      try {
        const next = await aiSettingsService.reset(route.useCase);
        if (next) onSaved(next);
        showToast({ type: "success", title: "Back to the default model" });
      } catch (e) {
        fail("Reset failed", e);
      }
    });
  };
  const runTest = () =>
    run("test", async () => {
      try {
        setTest(await aiSettingsService.test(route.useCase, { model, reasoning }));
      } catch (e) {
        fail("Test failed", e);
      }
    });

  return (
    <section className="admin-card space-y-4" aria-labelledby={`ai-${route.useCase}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="admin-card-title" id={`ai-${route.useCase}`}>
            Use case: <span className="font-mono">{route.useCase}</span>
          </h3>
          <p className="admin-help">
            Now: <span className="font-mono">{route.model}</span> · reasoning {route.reasoning ? REASONING_LABEL[route.reasoning] : "model default"}
            {route.overridden && route.updatedAt
              ? ` · set ${when(route.updatedAt)}${route.updatedBy?.displayName ? ` by ${route.updatedBy.displayName}` : ""}`
              : " · code default"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${route.configured ? "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"}`}>
          {route.provider} · {route.configured ? "key set" : "no API key"}
        </span>
      </div>
      {!route.configured && (
        <p className="admin-error">COMMANDCODE_API_KEY isn't set on the backend - AI is off and Test won't run. Saving still works.</p>
      )}

      <div className="space-y-2">
        <Select
          className="max-w-xl"
          label="Model"
          searchable
          searchPlaceholder="Search by name or id…"
          value={model}
          onChange={(v) => setModel(String(v))}
          options={known ? modelOptions : [{ value: model, label: model, hint: "not in the list" }, ...modelOptions]}
          placeholder={list ? "Pick a model" : "Loading models…"}
        />
        {list && !known && (
          <p className="admin-error">
            <span className="font-mono">{model}</span> isn't in Command Code's list any more - pick another model.
          </p>
        )}
      </div>

      <Select
        className="w-56"
        label="Reasoning effort"
        value={reasoning ?? DEFAULT}
        onChange={(v) => setReasoning(v === DEFAULT ? null : (v as Reasoning))}
        options={[{ value: DEFAULT, label: "Model default" }, ...REASONING.map((r) => ({ value: r, label: REASONING_LABEL[r] }))]}
      />
      <p className="admin-help">
        Sent as <span className="font-mono">reasoning_effort</span>. Command Code doesn't say which levels each model
        takes (xhigh is GPT-5.x+, max is Anthropic-style) - a model ignores or rejects one it doesn't know, so Test before saving.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void runTest()} disabled={!!busy || !route.configured || !known?.usable}>
          <FlaskConical className="h-4 w-4" /> {busy === "test" ? "Testing…" : "Test"}
        </button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={!!busy || !dirty || !known?.usable}>
          <Save className="h-4 w-4" /> {busy === "save" ? "Saving…" : "Save"}
        </button>
        {route.overridden && (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void reset()} disabled={!!busy}>
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
        )}
        {dirty && <span className="admin-help">Unsaved changes</span>}
      </div>

      {test && (
        <div role="status" className="rounded-lg bg-gray-950/2.5 p-3 text-sm dark:bg-white/5">
          {test.ok ? (
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium text-sky-700 dark:text-sky-300">Works.</span> Replied "{test.text}" in {(test.ms / 1000).toFixed(1)} s
              · <span className="font-mono">{test.model}</span>
              {test.usage && ` · ${test.usage.inputTokens} in / ${test.usage.outputTokens} out tokens`}
            </p>
          ) : (
            <p className="admin-error">
              Failed{test.status ? ` (HTTP ${test.status})` : ""}: {test.error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
