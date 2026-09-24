import React, { useCallback, useEffect, useMemo, useState } from "react";
import { familyService } from "../../../lib/family";
import { Select } from "../../ui/Select";
import type {
  CreateFamilyPersonPayload,
  CreateFamilyTreePayload,
  FamilyGender,
  FamilyPerson,
  FamilyRelationship,
  FamilyTreeDetail,
  UpdateFamilyTreePayload,
} from "../../../types/family";
import { FamilyTreeChart } from "./FamilyTreeChart";

type BuilderMode = "new" | "edit";
type RelationAction = "father" | "mother" | "spouse" | "son" | "daughter" | null;
type RelativeAction = Exclude<RelationAction, null>;

interface FamilyTreeBuilderProps {
  mode: BuilderMode;
}

const emptyTreeForm: CreateFamilyTreePayload = {
  slug: "",
  name: "",
  description: "",
  isPublic: false,
};

const emptyPersonForm: CreateFamilyPersonPayload = {
  firstName: "",
  lastName: "",
  displayName: "",
  gender: "unknown",
  birthDate: null,
  deathDate: null,
  isLiving: true,
  photoUrl: "",
  notes: "",
  metadata: {},
};

const genderOptions: FamilyGender[] = ["male", "female", "other", "unknown"];
const genderSelectOptions = genderOptions.map((gender) => ({
  value: gender,
  label: gender,
}));

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

const builderShellClass =
  "admin-family-builder rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900/30 dark:shadow-none md:p-5";
const sectionCardClass =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-5";
const insetPanelClass =
  "rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/55";
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500";
const monoInputClass = `${inputClass} font-mono text-xs`;
const labelClass =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";
const eyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400";
const headingClass = "text-slate-900 dark:text-slate-100";
const bodyTextClass = "text-slate-600 dark:text-slate-400";
const toolbarButtonClass =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-400 hover:bg-cyan-50/60 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-200";
const emptyStateClass =
  "rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400";
const errorClass =
  "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
const selectedPillClass =
  "rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300";
const canvasFrameClass =
  "h-[70vh] min-h-[520px] rounded-xl border border-slate-200 bg-family-canvas p-3 shadow-inner shadow-slate-200/80 dark:border-slate-700 dark:shadow-none";

const relationActionStyles: Record<RelativeAction, {
  card: string;
  title: string;
  compact: string;
}> = {
  father: {
    card: "border-blue-200 bg-blue-50/70 hover:border-blue-300 hover:bg-blue-100/70 focus:ring-blue-500/20 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20",
    title: "text-blue-700 dark:text-cyan-300",
    compact: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500/20 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20",
  },
  mother: {
    card: "border-rose-200 bg-rose-50/70 hover:border-rose-300 hover:bg-rose-100/70 focus:ring-rose-500/20 dark:border-pink-500/30 dark:bg-pink-500/10 dark:hover:bg-pink-500/20",
    title: "text-rose-700 dark:text-pink-300",
    compact: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-500/20 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/20",
  },
  spouse: {
    card: "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/70 focus:ring-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20",
    title: "text-amber-700 dark:text-amber-300",
    compact: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
  },
  son: {
    card: "border-blue-200 bg-blue-50/70 hover:border-blue-300 hover:bg-blue-100/70 focus:ring-blue-500/20 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20",
    title: "text-blue-700 dark:text-cyan-300",
    compact: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500/20 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20",
  },
  daughter: {
    card: "border-rose-200 bg-rose-50/70 hover:border-rose-300 hover:bg-rose-100/70 focus:ring-rose-500/20 dark:border-pink-500/30 dark:bg-pink-500/10 dark:hover:bg-pink-500/20",
    title: "text-rose-700 dark:text-pink-300",
    compact: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-500/20 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/20",
  },
};

const normalizeText = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseMetadata = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.error("Invalid metadata JSON", error);
  }
  return null;
};

const isInvalidJson = (raw: string) => {
  if (!raw.trim()) return false;
  try {
    JSON.parse(raw.trim());
    return false;
  } catch {
    return true;
  }
};

const buildRelationshipSummary = (
  relationship: FamilyRelationship,
  peopleById: Map<number, FamilyPerson>,
) => {
  const left = peopleById.get(relationship.personId)?.displayName || "Unknown";
  const right =
    peopleById.get(relationship.relatedPersonId)?.displayName || "Unknown";
  return `${left} ${relationship.relationshipType} ${right}`;
};

const TechDateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) => {
  const inputId = React.useId();

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className={labelClass}
      >
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${inputClass} font-mono`}
      />
    </div>
  );
};

const CheckboxField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  const buttonId = React.useId();

  return (
    <div className="space-y-2">
      <label
        htmlFor={buttonId}
        className={labelClass}
      >
        {label}
      </label>
      <button
        id={buttonId}
        type="button"
        onClick={() => onChange(!checked)}
        className="group flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2 text-left text-slate-900 outline-none transition-colors hover:border-cyan-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-cyan-500/50"
      >
        <span className="truncate text-sm text-slate-700 transition-colors group-hover:text-cyan-700 dark:text-slate-300 dark:group-hover:text-cyan-400">
          {checked ? `${label}: ON` : `${label}: OFF`}
        </span>
        <div className="flex items-center text-slate-400 transition-colors group-hover:text-cyan-600 dark:text-slate-500 dark:group-hover:text-cyan-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 12h16"
            ></path>
          </svg>
        </div>
      </button>
    </div>
  );
};

const getSpouseIds = (detail: FamilyTreeDetail | null, personId: number) => {
  if (!detail) return [];
  return detail.relationships
    .filter(
      (relationship) =>
        relationship.relationshipType === "spouse" &&
        (relationship.personId === personId ||
          relationship.relatedPersonId === personId),
    )
    .map((relationship) =>
      relationship.personId === personId
        ? relationship.relatedPersonId
        : relationship.personId,
    )
    .filter((value, index, array) => array.indexOf(value) === index);
};

export const FamilyTreeBuilder = ({ mode }: FamilyTreeBuilderProps) => {
  const [treeId, setTreeId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FamilyTreeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [treeForm, setTreeForm] =
    useState<UpdateFamilyTreePayload>(emptyTreeForm);
  const [rootPersonForm, setRootPersonForm] =
    useState<CreateFamilyPersonPayload>(emptyPersonForm);
  const [rootMetadataInput, setRootMetadataInput] = useState("{}");

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<RelationAction>(null);
  const [personForm, setPersonForm] =
    useState<CreateFamilyPersonPayload>(emptyPersonForm);
  const [personMetadataInput, setPersonMetadataInput] = useState("{}");
  const [coParentId, setCoParentId] = useState<number | null>(null);

  const peopleById = useMemo(() => {
    const map = new Map<number, FamilyPerson>();
    detail?.people.forEach((person) => map.set(person.id, person));
    return map;
  }, [detail]);

  const selectedPerson = selectedPersonId
    ? peopleById.get(selectedPersonId) ?? null
    : null;

  const showToast = useCallback(
    (options: {
      type?: "success" | "error" | "warning" | "info";
      title?: string;
      message?: string;
      duration?: number;
    }) => {
      const registry = (window as any).__uiAlerts;
      registry?.["family-builder-alert"]?.show(options);
    },
    [],
  );

  const spouseOptions = useMemo(() => {
    if (!selectedPersonId) return [];
    return getSpouseIds(detail, selectedPersonId)
      .map((id) => peopleById.get(id))
      .filter(Boolean) as FamilyPerson[];
  }, [detail, peopleById, selectedPersonId]);

  const stats = useMemo(() => {
    const people = detail?.people.length || 0;
    const relationships = detail?.relationships.length || 0;
    const living = detail?.people.filter((person) => person.isLiving).length || 0;
    return { people, relationships, living };
  }, [detail]);

  const resetInspectorForm = () => {
    setSelectedAction(null);
    setPersonForm(emptyPersonForm);
    setPersonMetadataInput("{}");
    setCoParentId(null);
  };

  const patchPersonInDetail = useCallback((nextPerson: FamilyPerson) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        people: prev.people.map((person) =>
          person.id === nextPerson.id ? { ...person, ...nextPerson } : person,
        ),
      };
    });
  }, []);

  const centerOnPerson = (personId: number) => {
    setSelectedPersonId(personId);
    window.dispatchEvent(
      new CustomEvent("family:set-main", {
        detail: { id: String(personId) },
      }),
    );
  };

  const handleChartSelectPerson = useCallback((personId: number) => {
    setSelectedPersonId(personId);
  }, []);

  const loadDetail = async (
    nextTreeId: number,
    options?: { focusPersonId?: number | null },
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await familyService.getAdminTreeDetailById(nextTreeId);
      if (!result) {
        throw new Error("Family tree not found");
      }
      setTreeId(nextTreeId);
      setDetail(result);
      setTreeForm({
        slug: result.tree.slug,
        name: result.tree.name,
        description: result.tree.description || "",
        isPublic: result.tree.isPublic,
        defaultMainPersonId: result.tree.defaultMainPersonId ?? null,
      });
      const defaultSelectedId =
        result.tree.defaultMainPersonId ?? result.people[0]?.id ?? null;
      const focusedPersonId =
        options?.focusPersonId &&
          result.people.some((person) => person.id === options.focusPersonId)
          ? options.focusPersonId
          : defaultSelectedId;
      setSelectedPersonId(focusedPersonId);
      resetInspectorForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load family tree.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "edit") return;
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    if (!id || Number.isNaN(id)) {
      setError("Missing family tree ID.");
      setIsLoading(false);
      return;
    }
    loadDetail(id);
  }, [mode]);

  useEffect(() => {
    if (!selectedPerson) {
      setPersonForm(emptyPersonForm);
      setPersonMetadataInput("{}");
      return;
    }
    if (selectedAction) return;
    setPersonForm({
      firstName: selectedPerson.firstName || "",
      lastName: selectedPerson.lastName || "",
      displayName: selectedPerson.displayName,
      gender: selectedPerson.gender,
      birthDate: selectedPerson.birthDate,
      deathDate: selectedPerson.deathDate,
      isLiving: selectedPerson.isLiving,
      photoUrl: selectedPerson.photoUrl || "",
      notes: selectedPerson.notes || "",
      metadata: selectedPerson.metadata || {},
    });
    setPersonMetadataInput(JSON.stringify(selectedPerson.metadata || {}, null, 2));
  }, [selectedAction, selectedPerson]);

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const createdTree = await familyService.createTree({
        slug: treeForm.slug?.trim() || "",
        name: treeForm.name?.trim() || "",
        description: normalizeText(treeForm.description as string | null),
        isPublic: Boolean(treeForm.isPublic),
      });
      if (!createdTree) {
        throw new Error("Failed to create family tree");
      }

      let defaultMainPersonId: number | null = null;
      if (rootPersonForm.displayName?.trim()) {
        const createdRoot = await familyService.createPerson(createdTree.id, {
          firstName: normalizeText(rootPersonForm.firstName),
          lastName: normalizeText(rootPersonForm.lastName),
          displayName: rootPersonForm.displayName.trim(),
          gender: rootPersonForm.gender || "unknown",
          birthDate: normalizeText(rootPersonForm.birthDate),
          deathDate: normalizeText(rootPersonForm.deathDate),
          isLiving: Boolean(rootPersonForm.isLiving),
          photoUrl: normalizeText(rootPersonForm.photoUrl),
          notes: normalizeText(rootPersonForm.notes),
          metadata: parseMetadata(rootMetadataInput),
        });
        defaultMainPersonId = createdRoot?.id ?? null;
      }

      if (defaultMainPersonId) {
        await familyService.updateTree(createdTree.id, {
          defaultMainPersonId,
        });
      }

      window.location.href = `/admin/family/edit?id=${createdTree.id}`;
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeId) return;
    setIsSaving(true);
    setError(null);
    try {
      await familyService.updateTree(treeId, {
        slug: treeForm.slug?.trim(),
        name: treeForm.name?.trim(),
        description: normalizeText(treeForm.description as string | null),
        isPublic: Boolean(treeForm.isPublic),
        defaultMainPersonId: treeForm.defaultMainPersonId ?? null,
      });
      await loadDetail(treeId);
      showToast({
        type: "success",
        title: "Tree settings saved",
        message: `"${treeForm.name?.trim() || detail?.tree.name || "Tree"}" updated.`,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTree = async () => {
    if (!treeId || !detail) return;
    const confirmed = window.confirm(
      `Delete "${detail.tree.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    try {
      const ok = await familyService.deleteTree(treeId);
      if (!ok) {
        throw new Error("Failed to delete family tree");
      }
      window.location.href = "/admin/family";
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !treeId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updatedPerson = await familyService.updatePerson(selectedPerson.id, {
        firstName: normalizeText(personForm.firstName),
        lastName: normalizeText(personForm.lastName),
        displayName: personForm.displayName?.trim() || "",
        gender: personForm.gender || "unknown",
        birthDate: normalizeText(personForm.birthDate),
        deathDate: normalizeText(personForm.deathDate),
        isLiving: Boolean(personForm.isLiving),
        photoUrl: normalizeText(personForm.photoUrl),
        notes: normalizeText(personForm.notes),
        metadata: parseMetadata(personMetadataInput),
      });

      if (!updatedPerson) {
        throw new Error("Failed to save person");
      }

      if (
        treeForm.defaultMainPersonId === selectedPerson.id ||
        detail?.tree.defaultMainPersonId === selectedPerson.id
      ) {
        await familyService.updateTree(treeId, {
          defaultMainPersonId: selectedPerson.id,
        });
      }

      patchPersonInDetail(updatedPerson);
      centerOnPerson(updatedPerson.id);
      showToast({
        type: "success",
        title: "Person updated",
        message: `${updatedPerson.displayName} saved without resetting the builder.`,
      });
    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Failed to save person.";
      setError(message);
      showToast({
        type: "error",
        title: "Save failed",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!selectedPerson || !treeId) return;
    const confirmed = window.confirm(
      `Delete "${selectedPerson.displayName}" and related links?`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    try {
      const ok = await familyService.deletePerson(selectedPerson.id);
      if (!ok) throw new Error("Failed to delete person");
      await loadDetail(treeId);
      showToast({
        type: "success",
        title: "Person deleted",
        message: `${selectedPerson.displayName} and related links removed.`,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete person.");
    } finally {
      setIsSaving(false);
    }
  };

  const beginRelationAction = (action: Exclude<RelationAction, null>) => {
    if (!selectedPerson) return;
    const suggestedGender: FamilyGender =
      action === "father" || action === "son"
        ? "male"
        : action === "mother" || action === "daughter"
          ? "female"
          : "unknown";

    setSelectedAction(action);
    setPersonForm({
      ...emptyPersonForm,
      gender: suggestedGender,
      isLiving: true,
    });
    setPersonMetadataInput("{}");
    setCoParentId(spouseOptions[0]?.id ?? null);
  };

  const createRelativePerson = useCallback(
    async ({
      action,
      anchorPersonId,
      otherParentId,
      payload,
    }: {
      action: RelativeAction;
      anchorPersonId: number;
      otherParentId?: number | null;
      payload: CreateFamilyPersonPayload;
    }) => {
      if (!treeId) {
        throw new Error("Family tree not ready");
      }

      const created = await familyService.createPerson(treeId, {
        firstName: normalizeText(payload.firstName),
        lastName: normalizeText(payload.lastName),
        displayName: payload.displayName?.trim() || "",
        gender: payload.gender || "unknown",
        birthDate: normalizeText(payload.birthDate),
        deathDate: normalizeText(payload.deathDate),
        isLiving: Boolean(payload.isLiving),
        photoUrl: normalizeText(payload.photoUrl),
        notes: normalizeText(payload.notes),
        metadata: payload.metadata || null,
      });

      if (!created) {
        throw new Error("Failed to create related person");
      }

      if (action === "father" || action === "mother") {
        await familyService.createRelationship(treeId, {
          personId: created.id,
          relatedPersonId: anchorPersonId,
          relationshipType: "parent",
          isPrimary: true,
        });
      }

      if (action === "spouse") {
        await familyService.createRelationship(treeId, {
          personId: anchorPersonId,
          relatedPersonId: created.id,
          relationshipType: "spouse",
          isPrimary: true,
        });
        await familyService.createRelationship(treeId, {
          personId: created.id,
          relatedPersonId: anchorPersonId,
          relationshipType: "spouse",
          isPrimary: true,
        });
      }

      if (action === "son" || action === "daughter") {
        await familyService.createRelationship(treeId, {
          personId: anchorPersonId,
          relatedPersonId: created.id,
          relationshipType: "parent",
          isPrimary: true,
        });
        if (otherParentId) {
          await familyService.createRelationship(treeId, {
            personId: otherParentId,
            relatedPersonId: created.id,
            relationshipType: "parent",
            isPrimary: true,
          });
        }
      }

      return created;
    },
    [treeId],
  );

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeId || !selectedPerson || !selectedAction) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await createRelativePerson({
        action: selectedAction,
        anchorPersonId: selectedPerson.id,
        otherParentId: coParentId,
        payload: {
          ...personForm,
          metadata: parseMetadata(personMetadataInput),
        },
      });

      await loadDetail(treeId, { focusPersonId: created.id });
      setSelectedAction(null);
      centerOnPerson(created.id);
      showToast({
        type: "success",
        title: "Relative created",
        message: `${created.displayName} added to the canvas tree.`,
      });
    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Failed to create related person.";
      setError(message);
      showToast({
        type: "error",
        title: "Create failed",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCanvasInlineCreateRelative = useCallback(
    async ({
      relation,
      anchorPersonId,
      otherParentId,
      displayName,
      firstName,
      lastName,
      gender,
      birthDate,
      photoUrl,
    }: {
      relation: RelativeAction;
      anchorPersonId: number;
      otherParentId?: number | null;
      displayName: string;
      firstName?: string | null;
      lastName?: string | null;
      gender: FamilyGender;
      birthDate?: string | null;
      photoUrl?: string | null;
    }) => {
      if (!treeId) return;

      setIsSaving(true);
      setError(null);
      try {
        const created = await createRelativePerson({
          action: relation,
          anchorPersonId,
          otherParentId,
          payload: {
            firstName: firstName || null,
            lastName: lastName || null,
            displayName,
            gender,
            birthDate: birthDate || null,
            deathDate: null,
            isLiving: true,
            photoUrl: photoUrl || null,
            notes: null,
            metadata: null,
          },
        });

        await loadDetail(treeId, { focusPersonId: created.id });
        centerOnPerson(created.id);
        showToast({
          type: "success",
          title: "Relative created",
          message: `${created.displayName} added from the canvas.`,
        });
      } catch (err: any) {
        console.error(err);
        const message = err?.message || "Failed to create related person.";
        setError(message);
        showToast({
          type: "error",
          title: "Create failed",
          message,
        });
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [createRelativePerson, loadDetail, showToast, treeId],
  );

  const relationTitle = useMemo(() => {
    if (!selectedAction || !selectedPerson) return "";
    const map: Record<Exclude<RelationAction, null>, string> = {
      father: `Add Father for ${selectedPerson.displayName}`,
      mother: `Add Mother for ${selectedPerson.displayName}`,
      spouse: `Add Spouse for ${selectedPerson.displayName}`,
      son: `Add Son for ${selectedPerson.displayName}`,
      daughter: `Add Daughter for ${selectedPerson.displayName}`,
    };
    return map[selectedAction];
  }, [selectedAction, selectedPerson]);

  if (mode === "new") {
    return (
      <div className={`${builderShellClass} space-y-6`}>
        {error && (
          <div className={errorClass}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form
            onSubmit={handleCreateTree}
            className={`${sectionCardClass} space-y-6 p-6`}
          >
            <div>
              <p className={eyebrowClass}>Family setup</p>
              <h2 className={`mt-2 text-xl font-bold ${headingClass}`}>
                Create Family Tree
              </h2>
              <p className={`mt-2 text-sm ${bodyTextClass}`}>
                Start with the tree details, then optionally add the first person
                so the builder can open with a focused root card.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Family name"
                value={(treeForm.name as string) || ""}
                onChange={(e) =>
                  setTreeForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                className={inputClass}
              />
              <input
                type="text"
                placeholder="family-slug"
                value={(treeForm.slug as string) || ""}
                onChange={(e) =>
                  setTreeForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                required
                className={inputClass}
              />
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={(treeForm.description as string) || ""}
              onChange={(e) =>
                setTreeForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className={inputClass}
            />
            <CheckboxField
              label="Public tree"
              checked={Boolean(treeForm.isPublic)}
              onChange={(value) =>
                setTreeForm((prev) => ({ ...prev, isPublic: value }))
              }
            />

            <div className={`${insetPanelClass} p-5`}>
              <h3 className={`text-lg font-semibold ${headingClass}`}>Starter Person</h3>
              <p className={`mt-1 text-sm ${bodyTextClass}`}>
                Optional, but recommended so the edit builder opens with the first
                card already connected to the tree.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Display Name"
                  value={rootPersonForm.displayName || ""}
                  onChange={(e) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <Select
                  value={rootPersonForm.gender || "unknown"}
                  onChange={(value) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      gender: value as FamilyGender,
                    }))
                  }
                  options={genderSelectOptions}
                  label="Gender"
                />
                <input
                  type="text"
                  placeholder="First Name"
                  value={rootPersonForm.firstName || ""}
                  onChange={(e) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={rootPersonForm.lastName || ""}
                  onChange={(e) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
                <TechDateField
                  label="Birth Date"
                  value={rootPersonForm.birthDate}
                  onChange={(value) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      birthDate: value,
                    }))
                  }
                />
                <CheckboxField
                  label="Is Living"
                  checked={Boolean(rootPersonForm.isLiving)}
                  onChange={(value) =>
                    setRootPersonForm((prev) => ({
                      ...prev,
                      isLiving: value,
                    }))
                  }
                />
              </div>
              <textarea
                rows={3}
                placeholder="Metadata JSON"
                value={rootMetadataInput}
                onChange={(e) => setRootMetadataInput(e.target.value)}
                className={`mt-3 ${monoInputClass}`}
              />
              {isInvalidJson(rootMetadataInput) && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Invalid JSON - check your metadata.
                </p>
              )}
            </div>

            <div className="admin-form-actions">
              <a
                href="/admin/family"
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={isSaving}
                className="admin-btn admin-btn-primary"
              >
                Create And Open Builder
              </button>
            </div>
          </form>

          <aside className={`${sectionCardClass} p-6`}>
            <p className={eyebrowClass}>Builder notes</p>
            <h3 className={`mt-2 text-xl font-semibold ${headingClass}`}>
              Why Separate `new` And `edit`
            </h3>
            <ul className={`mt-4 space-y-3 text-sm ${bodyTextClass}`}>
              <li>
                `new` stays focused on tree setup and the first root card.
              </li>
              <li>
                `edit` becomes a dedicated builder with live chart, quick actions,
                and person inspector.
              </li>
              <li>
                This follows the family-chart demo better than one overloaded
                admin screen.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={`${builderShellClass} space-y-6`}>
      {error && (
        <div className={errorClass}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={emptyStateClass}>
          Loading family builder...
        </div>
      ) : !detail || !treeId ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          Family tree detail not available.
        </div>
      ) : (
        <div className="space-y-6">
          <section className={sectionCardClass}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className={eyebrowClass}>Tree config</p>
                <h2 className={`mt-2 text-xl font-semibold ${headingClass}`}>
                  {detail.tree.name}
                </h2>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>
                  Tree settings stay in one top row so the builder canvas and
                  inspector below can stay focused.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className={`text-lg font-semibold ${headingClass}`}>{stats.people}</div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    People
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className={`text-lg font-semibold ${headingClass}`}>
                    {stats.relationships}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Links
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className={`text-lg font-semibold ${headingClass}`}>{stats.living}</div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Living
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveTree} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.6fr)_220px_auto] xl:items-end">
              <input
                type="text"
                value={(treeForm.name as string) || ""}
                onChange={(e) =>
                  setTreeForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className={inputClass}
              />
              <input
                type="text"
                value={(treeForm.slug as string) || ""}
                onChange={(e) =>
                  setTreeForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                className={inputClass}
              />
              <textarea
                rows={2}
                value={(treeForm.description as string) || ""}
                onChange={(e) =>
                  setTreeForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={inputClass}
              />
              <CheckboxField
                label="Public tree"
                checked={Boolean(treeForm.isPublic)}
                onChange={(value) =>
                  setTreeForm((prev) => ({
                    ...prev,
                    isPublic: value,
                  }))
                }
              />
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={handleDeleteTree}
                  disabled={isSaving}
                  className="admin-btn admin-btn-danger"
                >
                  Delete Tree
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="admin-btn admin-btn-primary"
                >
                  Save Tree Settings
                </button>
              </div>
            </form>
          </section>

          <section className={`${sectionCardClass} space-y-4`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={eyebrowClass}>Visual builder</p>
                <h2 className={`mt-2 text-xl font-semibold ${headingClass}`}>
                  Tree Canvas
                </h2>
                <p className={`mt-1 text-sm ${bodyTextClass}`}>
                  Click a card to focus and open the inspector. This matches the
                  flexible editing flow you were pointing at in the family-chart
                  demo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("family:fit"))
                  }
                  className={toolbarButtonClass}
                >
                  Fit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("family:center-main"))
                  }
                  className={toolbarButtonClass}
                >
                  Center Main
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("family:set-orientation", {
                        detail: { vertical: true },
                      }),
                    )
                  }
                  className={toolbarButtonClass}
                >
                  Vertical
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("family:set-orientation", {
                        detail: { vertical: false },
                      }),
                    )
                  }
                  className={toolbarButtonClass}
                >
                  Horizontal
                </button>
              </div>
            </div>

            <div className={insetPanelClass}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className={`text-sm font-semibold ${headingClass}`}>
                    Canvas Actions
                  </h3>
                  <p className={`mt-1 text-sm ${bodyTextClass}`}>
                    Select a person directly on the tree, then add relatives from
                    here like the family-chart builder flow.
                  </p>
                </div>
                <div className={selectedPillClass}>
                  {selectedPerson
                    ? `Selected: ${selectedPerson.displayName}`
                    : "Select a person in the canvas"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <button
                  type="button"
                  onClick={() => beginRelationAction("father")}
                  disabled={!selectedPerson}
                  className={`rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${relationActionStyles.father.card}`}
                >
                  <div className={`text-lg font-semibold ${relationActionStyles.father.title}`}>+ Add Father</div>
                  <div className={`mt-1 text-xs ${bodyTextClass}`}>
                    Attach a father to the selected person
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => beginRelationAction("mother")}
                  disabled={!selectedPerson}
                  className={`rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${relationActionStyles.mother.card}`}
                >
                  <div className={`text-lg font-semibold ${relationActionStyles.mother.title}`}>+ Add Mother</div>
                  <div className={`mt-1 text-xs ${bodyTextClass}`}>
                    Attach a mother to the selected person
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => beginRelationAction("spouse")}
                  disabled={!selectedPerson}
                  className={`rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${relationActionStyles.spouse.card}`}
                >
                  <div className={`text-lg font-semibold ${relationActionStyles.spouse.title}`}>+ Add Spouse</div>
                  <div className={`mt-1 text-xs ${bodyTextClass}`}>
                    Link a spouse directly from the canvas
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => beginRelationAction("son")}
                  disabled={!selectedPerson}
                  className={`rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${relationActionStyles.son.card}`}
                >
                  <div className={`text-lg font-semibold ${relationActionStyles.son.title}`}>+ Add Son</div>
                  <div className={`mt-1 text-xs ${bodyTextClass}`}>
                    Add a son under the selected person
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => beginRelationAction("daughter")}
                  disabled={!selectedPerson}
                  className={`rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${relationActionStyles.daughter.card}`}
                >
                  <div className={`text-lg font-semibold ${relationActionStyles.daughter.title}`}>+ Add Daughter</div>
                  <div className={`mt-1 text-xs ${bodyTextClass}`}>
                    Add a daughter under the selected person
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="space-y-4">
                <div className={canvasFrameClass}>
                  <FamilyTreeChart
                    detail={detail}
                    currentSlug={detail.tree.slug}
                    enableCrossTreeNavigation={false}
                    onSelectPerson={handleChartSelectPerson}
                    enableInlineAdd={true}
                    onInlineCreateRelative={handleCanvasInlineCreateRelative}
                    sortChildrenBy="metadata.birth_order"
                    sortAscending={true}
                    showSiblings={true}
                    ancestryDepth={6}
                    progenyDepth={5}
                  />
                </div>

                <div className={insetPanelClass}>
                  <h3 className={`text-sm font-semibold ${headingClass}`}>Relationships</h3>
                  {detail.relationships.length === 0 ? (
                    <div className={`mt-3 ${emptyStateClass}`}>
                      No relationships have been added yet.
                    </div>
                  ) : (
                    <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                      {detail.relationships.map((relationship) => (
                        <div
                          key={relationship.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
                        >
                          {buildRelationshipSummary(relationship, peopleById)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/35 xl:sticky xl:top-5">
                {!selectedPerson ? (
                  <div className={emptyStateClass}>
                    Select a person from the chart to open the inspector.
                  </div>
                ) : (
                  <>
                    <div>
                      <p className={eyebrowClass}>Inspector</p>
                      <h2 className={`mt-2 text-lg font-semibold ${headingClass}`}>
                        {selectedAction ? relationTitle : selectedPerson.displayName}
                      </h2>
                      <p className={`mt-1 text-sm ${bodyTextClass}`}>
                        {selectedAction
                          ? "Create a related person directly from the selected node."
                          : "Edit the selected person and use quick actions to grow the tree."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                      {selectedPerson.photoUrl ? (
                        <img
                          src={selectedPerson.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          loading="lazy"
                          className="h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-600"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
                        >
                          {initials(selectedPerson.displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`truncate text-sm font-semibold ${headingClass}`}>
                          {selectedPerson.displayName}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700">
                            {selectedPerson.gender}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700">
                            {selectedPerson.isLiving ? "Living" : "Deceased"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!selectedAction ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => beginRelationAction("father")}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${relationActionStyles.father.compact}`}
                          >
                            Add Father
                          </button>
                          <button
                            type="button"
                            onClick={() => beginRelationAction("mother")}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${relationActionStyles.mother.compact}`}
                          >
                            Add Mother
                          </button>
                          <button
                            type="button"
                            onClick={() => beginRelationAction("son")}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${relationActionStyles.son.compact}`}
                          >
                            Add Son
                          </button>
                          <button
                            type="button"
                            onClick={() => beginRelationAction("daughter")}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${relationActionStyles.daughter.compact}`}
                          >
                            Add Daughter
                          </button>
                          <button
                            type="button"
                            onClick={() => beginRelationAction("spouse")}
                            className={`col-span-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${relationActionStyles.spouse.compact}`}
                          >
                            Add Spouse
                          </button>
                        </div>

                        <form onSubmit={handleSavePerson} className="space-y-3">
                          <input
                            type="text"
                            value={personForm.displayName || ""}
                            onChange={(e) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                displayName: e.target.value,
                              }))
                            }
                            required
                            className={inputClass}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="First Name"
                              value={personForm.firstName || ""}
                              onChange={(e) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  firstName: e.target.value,
                                }))
                              }
                              className={inputClass}
                            />
                            <input
                              type="text"
                              placeholder="Last Name"
                              value={personForm.lastName || ""}
                              onChange={(e) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  lastName: e.target.value,
                                }))
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              value={personForm.gender || "unknown"}
                              onChange={(value) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  gender: value as FamilyGender,
                                }))
                              }
                              options={genderSelectOptions}
                              label="Gender"
                            />
                            <CheckboxField
                              label="Is Living"
                              checked={Boolean(personForm.isLiving)}
                              onChange={(value) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  isLiving: value,
                                }))
                              }
                            />
                            <TechDateField
                              label="Birth Date"
                              value={personForm.birthDate}
                              onChange={(value) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  birthDate: value,
                                }))
                              }
                            />
                            <TechDateField
                              label="Death Date"
                              value={personForm.deathDate}
                              onChange={(value) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  deathDate: value,
                                }))
                              }
                            />
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Notes"
                            value={personForm.notes || ""}
                            onChange={(e) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                          <textarea
                            rows={3}
                            placeholder="Metadata JSON"
                            value={personMetadataInput}
                            onChange={(e) => setPersonMetadataInput(e.target.value)}
                            className={monoInputClass}
                          />
                          {isInvalidJson(personMetadataInput) && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Invalid JSON - the value would be saved as null.
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="admin-btn admin-btn-primary"
                            >
                              Save Person
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTreeForm((prev) => ({
                                  ...prev,
                                  defaultMainPersonId: selectedPerson.id,
                                }))
                              }
                              className={toolbarButtonClass}
                            >
                              Set As Main
                            </button>
                            <button
                              type="button"
                              onClick={handleDeletePerson}
                              disabled={isSaving}
                              className="admin-btn admin-btn-danger"
                            >
                              Delete
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <form onSubmit={handleQuickAdd} className="space-y-3">
                        <input
                          type="text"
                          value={personForm.displayName || ""}
                          onChange={(e) =>
                            setPersonForm((prev) => ({
                              ...prev,
                              displayName: e.target.value,
                            }))
                          }
                          required
                          placeholder="Display Name"
                          className={inputClass}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={personForm.firstName || ""}
                            onChange={(e) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={personForm.lastName || ""}
                            onChange={(e) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={personForm.gender || "unknown"}
                            onChange={(value) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                gender: value as FamilyGender,
                              }))
                            }
                            options={genderSelectOptions}
                            label="Gender"
                          />
                          <TechDateField
                            label="Birth Date"
                            value={personForm.birthDate}
                            onChange={(value) =>
                              setPersonForm((prev) => ({
                                ...prev,
                                birthDate: value,
                              }))
                            }
                          />
                        </div>
                        {(selectedAction === "son" || selectedAction === "daughter") &&
                          spouseOptions.length > 0 && (
                            <Select
                              value={coParentId ?? ""}
                              onChange={(value) =>
                                setCoParentId(value ? Number(value) : null)
                              }
                              options={[
                                {
                                  value: "",
                                  label: `Only connect ${selectedPerson.displayName}`,
                                },
                                ...spouseOptions.map((spouse) => ({
                                  value: spouse.id,
                                  label: `Connect spouse too: ${spouse.displayName}`,
                                })),
                              ]}
                              label="Co Parent"
                            />
                          )}
                        <textarea
                          rows={2}
                          placeholder="Notes"
                          value={personForm.notes || ""}
                          onChange={(e) =>
                            setPersonForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                        <textarea
                          rows={3}
                          placeholder="Metadata JSON"
                          value={personMetadataInput}
                          onChange={(e) => setPersonMetadataInput(e.target.value)}
                          className={monoInputClass}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="admin-btn admin-btn-primary"
                          >
                            Create Relation
                          </button>
                          <button
                            type="button"
                            onClick={resetInspectorForm}
                            className="admin-btn admin-btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
