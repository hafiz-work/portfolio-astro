import React, { useEffect, useState } from "react";
import { cmsService, extractApiError } from "../../../lib/projects-cms";
import { showToast, confirmDialog } from "../../../lib/admin-ui";
import { Select } from "../../ui/Select";
import { AdminBadge, statusBadgeVariant } from "../../ui/admin/primitives";
import type { AdminProjectDetail, ProjectType } from "../../../types/project-cms";
import { SectionsManager } from "./managers/SectionsManager";
import { FeaturesManager } from "./managers/FeaturesManager";
import { LinksManager } from "./managers/LinksManager";
import { TechManager } from "./managers/TechManager";
import { MediaManager } from "./managers/MediaManager";

type Tab = "basics" | "case-study" | "media" | "tech" | "links" | "publish";
const TABS: { id: Tab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "case-study", label: "Case Study" },
  { id: "media", label: "Media" },
  { id: "tech", label: "Tech Stack" },
  { id: "links", label: "Links & SEO" },
  { id: "publish", label: "Publish" },
];
const PROJECT_TYPES: ProjectType[] = ["personal", "business", "work"];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

type BasicsForm = {
  title: string; slug: string; subtitle: string; summary: string; description: string;
  projectType: ProjectType; projectScope: string; year: string; role: string; clientName: string;
  isPublic: boolean; isConfidential: boolean; featured: boolean; featuredOrder: string;
};
type CaseStudyForm = {
  problem: string; solution: string; contribution: string; architectureNotes: string; resultSummary: string; fullDescription: string;
};

const emptyBasics: BasicsForm = {
  title: "", slug: "", subtitle: "", summary: "", description: "", projectType: "personal",
  projectScope: "", year: String(new Date().getFullYear()), role: "", clientName: "",
  isPublic: true, isConfidential: false, featured: false, featuredOrder: "0",
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="admin-help">{hint}</p>}
    </div>
  );
}

export function ProjectEditor({ projectId }: { projectId?: number }) {
  const isCreate = projectId == null;
  const [tab, setTab] = useState<Tab>("basics");
  const [loading, setLoading] = useState(!isCreate);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [basics, setBasics] = useState<BasicsForm>(emptyBasics);
  const [caseStudy, setCaseStudy] = useState<CaseStudyForm>({ problem: "", solution: "", contribution: "", architectureNotes: "", resultSummary: "", fullDescription: "" });
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isCreate);

  const hydrate = (d: AdminProjectDetail) => {
    setBasics({
      title: d.title ?? "", slug: d.slug ?? "", subtitle: d.subtitle ?? "", summary: d.summary ?? "",
      description: d.description ?? "", projectType: d.projectType, projectScope: d.projectScope ?? "",
      year: String(d.year ?? new Date().getFullYear()), role: d.role ?? "", clientName: d.clientName ?? "",
      isPublic: d.isPublic !== false, isConfidential: !!d.isConfidential, featured: !!d.featured, featuredOrder: String(d.featuredOrder ?? 0),
    });
    setCaseStudy({
      problem: d.problem ?? "", solution: d.solution ?? "", contribution: d.contribution ?? "",
      architectureNotes: d.architectureNotes ?? "", resultSummary: d.resultSummary ?? "", fullDescription: d.fullDescription ?? "",
    });
  };

  const loadDetail = async (hydrateForms: boolean) => {
    if (projectId == null) return;
    try {
      const d = await cmsService.getProjectDetail(projectId);
      if (!d) { setNotFound(true); return; }
      setDetail(d);
      if (hydrateForms) hydrate(d);
    } catch (e) { showToast({ type: "error", title: "Load failed", message: extractApiError(e).message }); }
  };

  useEffect(() => {
    if (isCreate) return;
    setLoading(true);
    void loadDetail(true).finally(() => setLoading(false));
  }, [projectId]);

  // Warn on navigation with unsaved Basics/Case Study edits (child managers save immediately).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setB = (patch: Partial<BasicsForm>) => { setBasics((p) => ({ ...p, ...patch })); setDirty(true); };
  const setC = (patch: Partial<CaseStudyForm>) => { setCaseStudy((p) => ({ ...p, ...patch })); setDirty(true); };

  const onTitle = (title: string) => setB(slugTouched || !isCreate ? { title } : { title, slug: slugify(title) });

  const create = async () => {
    if (!basics.title.trim() || !basics.slug.trim() || !basics.description.trim()) {
      showToast({ type: "warning", title: "Title, slug and short description are required" }); return;
    }
    setSaving(true);
    try {
      const created = await cmsService.createProject({
        title: basics.title, slug: basics.slug, description: basics.description, projectType: basics.projectType,
        subtitle: basics.subtitle || null, summary: basics.summary || null, projectScope: basics.projectScope || null,
        clientName: basics.clientName || null, year: Number(basics.year) || undefined, role: basics.role || undefined,
        isPublic: basics.isPublic, isConfidential: basics.isConfidential, featured: basics.featured,
        featuredOrder: Number(basics.featuredOrder) || 0,
        // status omitted -> backend defaults to draft (not public by accident)
      });
      if (!created) throw new Error("Create failed");
      setDirty(false);
      showToast({ type: "success", title: "Draft created" });
      window.location.href = `/admin/projects/edit?id=${created.id}`;
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Create failed", message });
    } finally { setSaving(false); }
  };

  const saveBasics = async () => {
    if (projectId == null) return;
    setSaving(true);
    try {
      await cmsService.updateProject(projectId, {
        title: basics.title, slug: basics.slug, subtitle: basics.subtitle || null, summary: basics.summary || null,
        description: basics.description, projectType: basics.projectType, projectScope: basics.projectScope || null,
        year: Number(basics.year) || undefined, role: basics.role || undefined, clientName: basics.clientName || null,
        isPublic: basics.isPublic, isConfidential: basics.isConfidential, featured: basics.featured,
        featuredOrder: Number(basics.featuredOrder) || 0,
      });
      setDirty(false);
      showToast({ type: "success", title: "Basics saved" });
      await loadDetail(false);
    } catch (e) {
      const { message, field } = extractApiError(e);
      showToast({ type: "error", title: field ? `Invalid ${field}` : "Save failed", message });
    } finally { setSaving(false); }
  };

  const saveCaseStudy = async () => {
    if (projectId == null) return;
    setSaving(true);
    try {
      await cmsService.updateProject(projectId, {
        problem: caseStudy.problem || null, solution: caseStudy.solution || null, contribution: caseStudy.contribution || null,
        architectureNotes: caseStudy.architectureNotes || null, resultSummary: caseStudy.resultSummary || null,
        fullDescription: caseStudy.fullDescription || null,
      });
      setDirty(false);
      showToast({ type: "success", title: "Case study saved" });
      await loadDetail(false);
    } catch (e) { showToast({ type: "error", title: "Save failed", message: extractApiError(e).message }); }
    finally { setSaving(false); }
  };

  const lifecycle = async (label: string, fn: () => Promise<unknown>, confirm?: boolean) => {
    if (projectId == null) return;
    if (confirm && !(await confirmDialog({ title: `${label} project`, message: `${label} "${basics.title}"?`, confirmText: label, variant: "danger" }))) return;
    setSaving(true);
    try {
      const res = await fn();
      if (res === null) {
        // null = session expired (401 → redirect to /login). A missing project
        // (404) throws like any other API error and lands in the catch below.
        showToast({ type: "error", title: `Could not ${label.toLowerCase()}`, message: "Your session expired. Please sign in again." });
        return;
      }
      showToast({ type: "success", title: `${label} succeeded` });
      await loadDetail(false);
    } catch (e) { showToast({ type: "error", title: `${label} blocked`, message: extractApiError(e).message }); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="admin-help">Loading project…</p>;
  if (notFound) return (
    <div className="admin-card"><p className="text-gray-600 dark:text-gray-300">Project not found.</p>
      <a href="/admin/projects" className="admin-btn admin-btn-secondary mt-3">Back to projects</a></div>
  );

  const pid = projectId as number;

  return (
    <div className="space-y-5">
      {!isCreate && detail && (
        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge variant={statusBadgeVariant(detail.status ?? "")} dot>{(detail.status ?? "unknown").replace(/-/g, " ")}</AdminBadge>
          {detail.isConfidential && <AdminBadge variant="warning">Confidential</AdminBadge>}
          {detail.isPublic === false && <AdminBadge variant="neutral">Private</AdminBadge>}
          {detail.featured && <AdminBadge variant="accent">Featured</AdminBadge>}
        </div>
      )}

      {/* Tabs (create mode shows Basics only) */}
      {!isCreate && (
        <div className="border-b border-gray-950/5 dark:border-white/10">
          <div className="flex -mb-px overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-sky-500 text-gray-950 dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BASICS */}
      {(isCreate || tab === "basics") && (
        <div className="admin-card space-y-5">
          <h3 className="admin-card-title">Basics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title"><input className="admin-input" value={basics.title} onChange={(e) => onTitle(e.target.value)} /></Field>
            <Field label="Slug" hint="lowercase, numbers, hyphens"><input className="admin-input" value={basics.slug} onChange={(e) => { setSlugTouched(true); setB({ slug: e.target.value }); }} /></Field>
            <Field label="Subtitle"><input className="admin-input" value={basics.subtitle} onChange={(e) => setB({ subtitle: e.target.value })} /></Field>
            <Field label="Project type">
              <Select
                value={basics.projectType}
                onChange={(v) => setB({ projectType: v as ProjectType })}
                options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select type"
              />
            </Field>
            <Field label="Short description (required)"><textarea className="admin-input min-h-16" value={basics.description} onChange={(e) => setB({ description: e.target.value })} /></Field>
            <Field label="Summary"><textarea className="admin-input min-h-16" value={basics.summary} onChange={(e) => setB({ summary: e.target.value })} /></Field>
            <Field label="Project scope"><input className="admin-input" value={basics.projectScope} onChange={(e) => setB({ projectScope: e.target.value })} /></Field>
            <Field label="Year"><input type="number" className="admin-input" value={basics.year} onChange={(e) => setB({ year: e.target.value })} /></Field>
            <Field label="Role"><input className="admin-input" value={basics.role} onChange={(e) => setB({ role: e.target.value })} /></Field>
            <Field label="Client name" hint="Hidden publicly when confidential"><input className="admin-input" value={basics.clientName} onChange={(e) => setB({ clientName: e.target.value })} /></Field>
            <Field label="Featured order"><input type="number" className="admin-input" value={basics.featuredOrder} onChange={(e) => setB({ featuredOrder: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={basics.isPublic} onChange={(e) => setB({ isPublic: e.target.checked })} /> Public</label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={basics.isConfidential} onChange={(e) => setB({ isConfidential: e.target.checked })} /> Confidential</label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={basics.featured} onChange={(e) => setB({ featured: e.target.checked })} /> Featured</label>
          </div>
          <div className="admin-form-actions">
            <a href="/admin/projects" className="admin-btn admin-btn-secondary">Cancel</a>
            {isCreate
              ? <button type="button" className="admin-btn admin-btn-primary" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create draft"}</button>
              : <button type="button" className="admin-btn admin-btn-primary" onClick={saveBasics} disabled={saving}>{saving ? "Saving…" : "Save basics"}</button>}
          </div>
          {isCreate && <p className="admin-help">Case study, media, tech, links and publishing unlock after the draft is created.</p>}
        </div>
      )}

      {/* CASE STUDY */}
      {!isCreate && tab === "case-study" && (
        <div className="space-y-5">
          <div className="admin-card space-y-5">
            <h3 className="admin-card-title">Narrative</h3>
            <Field label="Problem"><textarea className="admin-input min-h-20" value={caseStudy.problem} onChange={(e) => setC({ problem: e.target.value })} /></Field>
            <Field label="Solution"><textarea className="admin-input min-h-20" value={caseStudy.solution} onChange={(e) => setC({ solution: e.target.value })} /></Field>
            <Field label="My contribution"><textarea className="admin-input min-h-20" value={caseStudy.contribution} onChange={(e) => setC({ contribution: e.target.value })} /></Field>
            <Field label="Architecture / tech decisions"><textarea className="admin-input min-h-20" value={caseStudy.architectureNotes} onChange={(e) => setC({ architectureNotes: e.target.value })} /></Field>
            <Field label="Results / impact"><textarea className="admin-input min-h-20" value={caseStudy.resultSummary} onChange={(e) => setC({ resultSummary: e.target.value })} /></Field>
            <Field label="Full description (HTML)" hint="Rendered as sanitized HTML on the public page"><textarea className="admin-input min-h-24" value={caseStudy.fullDescription} onChange={(e) => setC({ fullDescription: e.target.value })} /></Field>
            <div className="admin-form-actions"><button type="button" className="admin-btn admin-btn-primary" onClick={saveCaseStudy} disabled={saving}>{saving ? "Saving…" : "Save case study"}</button></div>
          </div>
          <div className="admin-card space-y-3"><h3 className="admin-card-title">Custom sections</h3><SectionsManager projectId={pid} onChanged={() => void loadDetail(false)} /></div>
          <div className="admin-card space-y-3"><h3 className="admin-card-title">Features</h3><FeaturesManager projectId={pid} onChanged={() => void loadDetail(false)} /></div>
        </div>
      )}

      {/* MEDIA */}
      {!isCreate && tab === "media" && (
        <div className="admin-card space-y-3"><h3 className="admin-card-title">Media carousel</h3><MediaManager projectId={pid} onChanged={() => void loadDetail(false)} /></div>
      )}

      {/* TECH */}
      {!isCreate && tab === "tech" && (
        <div className="admin-card space-y-3"><h3 className="admin-card-title">Tech stack</h3><TechManager projectId={pid} onChanged={() => void loadDetail(false)} /></div>
      )}

      {/* LINKS & SEO */}
      {!isCreate && tab === "links" && (
        <div className="space-y-5">
          <div className="admin-card space-y-3"><h3 className="admin-card-title">Links</h3><LinksManager projectId={pid} onChanged={() => void loadDetail(false)} /></div>
          <div className="admin-card space-y-2">
            <h3 className="admin-card-title">SEO / images</h3>
            <p className="admin-help">Cover / OG images are set in the Media tab (attach media with type <code>cover</code> or <code>og</code>).</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Cover image id: {detail?.coverImageId ?? "-"} · OG image id: {detail?.ogImageId ?? "-"}</p>
          </div>
        </div>
      )}

      {/* PUBLISH */}
      {!isCreate && tab === "publish" && detail && (
        <div className="admin-card space-y-4">
          <h3 className="admin-card-title">Publish</h3>
          <div>
            <span className="admin-label">Completeness</span>
            {detail.warnings.length === 0
              ? <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">No blocking issues.</p>
              : <ul className="mt-2 space-y-1.5">
                  {detail.warnings.map((w) => (
                    <li key={w.code} className="flex items-center gap-2 text-sm">
                      <AdminBadge variant={w.severity === "error" ? "danger" : "warning"}>{w.severity}</AdminBadge>
                      <span className="text-gray-600 dark:text-gray-300">{w.message}</span>
                    </li>
                  ))}
                </ul>}
            <p className="admin-help mt-2">Errors (e.g. visible media missing alt text) block publishing.</p>
          </div>
          <div className="admin-form-actions !justify-start flex-wrap">
            {detail.status !== "published"
              ? <button type="button" className="admin-btn admin-btn-primary" onClick={() => lifecycle("Publish", () => cmsService.publishProject(pid))} disabled={saving}>Publish</button>
              : <button type="button" className="admin-btn admin-btn-secondary" onClick={() => lifecycle("Unpublish", () => cmsService.unpublishProject(pid))} disabled={saving}>Unpublish</button>}
            {detail.status !== "archived" && <button type="button" className="admin-btn admin-btn-danger" onClick={() => lifecycle("Archive", () => cmsService.archiveProject(pid), true)} disabled={saving}>Archive</button>}
            {detail.status === "published" && detail.isPublic !== false && <a href={`/projects/${detail.slug}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary">View public page</a>}
          </div>
        </div>
      )}
    </div>
  );
}
