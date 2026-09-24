import React, { useEffect, useMemo, useState } from "react";
import { familyService } from "../../../lib/family";
import { FamilyTreeChart } from "./FamilyTreeChart";
import type {
  CreateFamilyPersonPayload,
  CreateFamilyRelationshipPayload,
  CreateFamilyTreePayload,
  FamilyGender,
  FamilyPerson,
  FamilyRelationship,
  FamilyRelationshipType,
  FamilyTree,
  FamilyTreeDetail,
  UpdateFamilyPersonPayload,
  UpdateFamilyTreePayload,
} from "../../../types/family";

const relationshipTypeOptions: FamilyRelationshipType[] = [
  "parent",
  "child",
  "spouse",
  "sibling",
  "adoptive_parent",
  "adopted_child",
];

const genderOptions: FamilyGender[] = ["male", "female", "other", "unknown"];

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

const emptyRelationshipForm: CreateFamilyRelationshipPayload = {
  personId: 0,
  relatedPersonId: 0,
  relationshipType: "parent",
  isPrimary: true,
  startDate: null,
  endDate: null,
  notes: "",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
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
    return null;
  } catch {
    return null;
  }
};

export const FamilyManager = () => {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FamilyTreeDetail | null>(null);
  const [isLoadingTrees, setIsLoadingTrees] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [treeCreateForm, setTreeCreateForm] =
    useState<CreateFamilyTreePayload>(emptyTreeForm);
  const [treeEditForm, setTreeEditForm] =
    useState<UpdateFamilyTreePayload>(emptyTreeForm);
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [personForm, setPersonForm] =
    useState<CreateFamilyPersonPayload>(emptyPersonForm);
  const [editingRelationshipId, setEditingRelationshipId] = useState<
    number | null
  >(null);
  const [relationshipForm, setRelationshipForm] =
    useState<CreateFamilyRelationshipPayload>(emptyRelationshipForm);
  const [metadataInput, setMetadataInput] = useState("{}");

  const peopleById = useMemo(() => {
    const map = new Map<number, FamilyPerson>();
    detail?.people.forEach((person) => map.set(person.id, person));
    return map;
  }, [detail]);

  const personOptions = useMemo(
    () =>
      (detail?.people || []).map((person) => ({
        value: person.id,
        label: person.displayName,
      })),
    [detail],
  );

  const selectedMainPerson = useMemo(() => {
    const defaultId = treeEditForm.defaultMainPersonId ?? detail?.tree.defaultMainPersonId;
    return defaultId ? peopleById.get(defaultId) ?? null : null;
  }, [detail, peopleById, treeEditForm.defaultMainPersonId]);

  const treeStats = useMemo(() => {
    const peopleCount = detail?.people.length || 0;
    const relationshipCount = detail?.relationships.length || 0;
    const livingCount =
      detail?.people.filter((person) => person.isLiving).length || 0;
    return { peopleCount, relationshipCount, livingCount };
  }, [detail]);

  const canSubmitRelationship =
    relationshipForm.personId > 0 &&
    relationshipForm.relatedPersonId > 0 &&
    relationshipForm.personId !== relationshipForm.relatedPersonId;

  const refreshTrees = async (preferredTreeId?: number) => {
    const allTrees = await familyService.getAdminTrees();
    setTrees(allTrees);

    const fallbackId = allTrees[0]?.id ?? null;
    const nextId =
      preferredTreeId && allTrees.some((tree) => tree.id === preferredTreeId)
        ? preferredTreeId
        : fallbackId;

    setSelectedTreeId(nextId);
  };

  const loadDetail = async (treeId: number) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const nextDetail = await familyService.getAdminTreeDetailById(treeId);
      setDetail(nextDetail);
      if (nextDetail?.tree) {
        setTreeEditForm({
          slug: nextDetail.tree.slug,
          name: nextDetail.tree.name,
          description: nextDetail.tree.description || "",
          isPublic: nextDetail.tree.isPublic,
          defaultMainPersonId: nextDetail.tree.defaultMainPersonId ?? null,
        });
      }
      setEditingPersonId(null);
      setEditingRelationshipId(null);
      setPersonForm(emptyPersonForm);
      setRelationshipForm(emptyRelationshipForm);
      setMetadataInput("{}");
    } catch (err) {
      console.error(err);
      setError("Failed to load family tree detail.");
      setDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoadingTrees(true);
      setError(null);
      try {
        await refreshTrees();
      } catch (err) {
        console.error(err);
        setError("Failed to load family trees.");
      } finally {
        setIsLoadingTrees(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedTreeId) {
      setDetail(null);
      return;
    }

    loadDetail(selectedTreeId);
  }, [selectedTreeId]);

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const created = await familyService.createTree({
        slug: treeCreateForm.slug?.trim() || "",
        name: treeCreateForm.name?.trim() || "",
        description: normalizeText(treeCreateForm.description),
        isPublic: Boolean(treeCreateForm.isPublic),
      });

      if (!created) {
        throw new Error("Failed to create tree");
      }

      setTreeCreateForm(emptyTreeForm);
      await refreshTrees(created.id);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreeId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await familyService.updateTree(selectedTreeId, {
        slug: treeEditForm.slug?.trim(),
        name: treeEditForm.name?.trim(),
        description: normalizeText(treeEditForm.description as string | null),
        isPublic: Boolean(treeEditForm.isPublic),
        defaultMainPersonId: treeEditForm.defaultMainPersonId ?? null,
      });

      if (!updated) {
        throw new Error("Failed to update tree");
      }

      await refreshTrees(selectedTreeId);
      await loadDetail(selectedTreeId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTree = async () => {
    if (!selectedTreeId || !detail?.tree) return;
    const shouldDelete = window.confirm(
      `Delete family tree "${detail.tree.name}"? This cannot be undone.`,
    );
    if (!shouldDelete) return;

    setIsSaving(true);
    setError(null);
    try {
      const ok = await familyService.deleteTree(selectedTreeId);
      if (!ok) throw new Error("Failed to delete tree");
      await refreshTrees();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete family tree.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditPerson = (person: FamilyPerson) => {
    setEditingPersonId(person.id);
    setPersonForm({
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      displayName: person.displayName,
      gender: person.gender,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      isLiving: person.isLiving,
      photoUrl: person.photoUrl || "",
      notes: person.notes || "",
      metadata: person.metadata || {},
    });
    setMetadataInput(JSON.stringify(person.metadata || {}, null, 2));
  };

  const resetPersonForm = () => {
    setEditingPersonId(null);
    setPersonForm(emptyPersonForm);
    setMetadataInput("{}");
  };

  const handleSubmitPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreeId) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload: UpdateFamilyPersonPayload = {
        firstName: normalizeText(personForm.firstName),
        lastName: normalizeText(personForm.lastName),
        displayName: personForm.displayName?.trim() || "",
        gender: personForm.gender || "unknown",
        birthDate: normalizeText(personForm.birthDate),
        deathDate: normalizeText(personForm.deathDate),
        isLiving: Boolean(personForm.isLiving),
        photoUrl: normalizeText(personForm.photoUrl),
        notes: normalizeText(personForm.notes),
        metadata: parseMetadata(metadataInput),
      };

      if (editingPersonId) {
        await familyService.updatePerson(editingPersonId, payload);
      } else {
        await familyService.createPerson(
          selectedTreeId,
          payload as CreateFamilyPersonPayload,
        );
      }

      await loadDetail(selectedTreeId);
      resetPersonForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save person.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async (personId: number, displayName: string) => {
    if (!selectedTreeId) return;
    const shouldDelete = window.confirm(
      `Delete person "${displayName}"? Relationships involving this person will also be removed.`,
    );
    if (!shouldDelete) return;

    setIsSaving(true);
    setError(null);
    try {
      const ok = await familyService.deletePerson(personId);
      if (!ok) throw new Error("Failed to delete person");
      await loadDetail(selectedTreeId);
      if (editingPersonId === personId) {
        resetPersonForm();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete person.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditRelationship = (relationship: FamilyRelationship) => {
    setEditingRelationshipId(relationship.id);
    setRelationshipForm({
      personId: relationship.personId,
      relatedPersonId: relationship.relatedPersonId,
      relationshipType: relationship.relationshipType,
      isPrimary: relationship.isPrimary,
      startDate: relationship.startDate,
      endDate: relationship.endDate,
      notes: relationship.notes || "",
    });
  };

  const resetRelationshipForm = () => {
    setEditingRelationshipId(null);
    setRelationshipForm(emptyRelationshipForm);
  };

  const handleSubmitRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreeId || !canSubmitRelationship) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload: CreateFamilyRelationshipPayload = {
        personId: relationshipForm.personId,
        relatedPersonId: relationshipForm.relatedPersonId,
        relationshipType: relationshipForm.relationshipType,
        isPrimary: Boolean(relationshipForm.isPrimary),
        startDate: normalizeText(relationshipForm.startDate),
        endDate: normalizeText(relationshipForm.endDate),
        notes: normalizeText(relationshipForm.notes),
      };

      if (editingRelationshipId) {
        await familyService.updateRelationship(editingRelationshipId, payload);
      } else {
        await familyService.createRelationship(selectedTreeId, payload);
      }

      await loadDetail(selectedTreeId);
      resetRelationshipForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save relationship.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRelationship = async (
    relationshipId: number,
    summary: string,
  ) => {
    if (!selectedTreeId) return;
    const shouldDelete = window.confirm(`Delete relationship "${summary}"?`);
    if (!shouldDelete) return;

    setIsSaving(true);
    setError(null);
    try {
      const ok = await familyService.deleteRelationship(relationshipId);
      if (!ok) throw new Error("Failed to delete relationship");
      await loadDetail(selectedTreeId);
      if (editingRelationshipId === relationshipId) {
        resetRelationshipForm();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete relationship.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
          <h2 className="mb-4 text-lg font-bold text-white">Family Trees</h2>
          <div className="mb-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {isLoadingTrees ? (
              <p className="text-sm text-gray-400">Loading trees...</p>
            ) : trees.length === 0 ? (
              <p className="text-sm text-gray-400">No family trees yet.</p>
            ) : (
              trees.map((tree) => (
                <button
                  key={tree.id}
                  type="button"
                  onClick={() => setSelectedTreeId(tree.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${selectedTreeId === tree.id
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                    : "border-gray-700 bg-gray-900/40 text-gray-200 hover:border-gray-500"
                    }`}
                >
                  <div className="text-sm font-semibold">{tree.name}</div>
                  <div className="mt-1 text-xs font-mono text-gray-400">
                    /{tree.slug}
                  </div>
                </button>
              ))
            )}
          </div>

          <form onSubmit={handleCreateTree} className="space-y-3 border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300">
              Create New Tree
            </h3>
            <input
              type="text"
              placeholder="Name"
              value={treeCreateForm.name || ""}
              onChange={(e) =>
                setTreeCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Slug"
              value={treeCreateForm.slug || ""}
              onChange={(e) =>
                setTreeCreateForm((prev) => ({ ...prev, slug: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
            <textarea
              placeholder="Description"
              value={treeCreateForm.description || ""}
              onChange={(e) =>
                setTreeCreateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(treeCreateForm.isPublic)}
                onChange={(e) =>
                  setTreeCreateForm((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded-lg border-gray-600 bg-gray-900"
              />
              Public
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
            >
              Add Tree
            </button>
          </form>
        </section>

        <section className="space-y-6">
          {!selectedTreeId ? (
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-6 text-sm text-gray-400">
              Select a family tree to manage people and relationships.
            </div>
          ) : isLoadingDetail ? (
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-6 text-sm text-gray-400">
              Loading family details...
            </div>
          ) : !detail ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-300">
              Family tree detail not available.
            </div>
          ) : (
            <>
              <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Tree Builder Preview
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Live preview of the selected family tree. Use the forms below
                      to add people, connect relationships, and choose the main
                      person the chart centers on.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {treeStats.peopleCount}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        People
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {treeStats.relationshipCount}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Links
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {treeStats.livingCount}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Living
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                      Main person:{" "}
                      {selectedMainPerson?.displayName || "Not selected"}
                    </span>
                    <span className="text-gray-400">
                      Builder inspiration: editable node data, relationship links,
                      and a persistent main focus person.
                    </span>
                  </div>
                  <FamilyTreeChart
                    detail={detail}
                    currentSlug={detail.tree.slug}
                    sortChildrenBy="metadata.birth_order"
                    sortAscending={true}
                  />
                </div>
              </section>

              <form
                onSubmit={handleUpdateTree}
                className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/40 p-5"
              >
                <h2 className="text-lg font-bold text-white">Tree Settings</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={(treeEditForm.name as string) || ""}
                    onChange={(e) =>
                      setTreeEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={(treeEditForm.slug as string) || ""}
                    onChange={(e) =>
                      setTreeEditForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <textarea
                  value={(treeEditForm.description as string) || ""}
                  onChange={(e) =>
                    setTreeEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Default Main Person
                    </label>
                    <select
                      value={treeEditForm.defaultMainPersonId ?? ""}
                      onChange={(e) =>
                        setTreeEditForm((prev) => ({
                          ...prev,
                          defaultMainPersonId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    >
                      <option value="">Auto select first person</option>
                      {personOptions.map((person) => (
                        <option key={person.value} value={person.value}>
                          {person.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-3 text-sm text-gray-400">
                    Saves the person the tree preview and public page should focus
                    on first. This mirrors the builder-style "main person" flow.
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(treeEditForm.isPublic)}
                      onChange={(e) =>
                        setTreeEditForm((prev) => ({
                          ...prev,
                          isPublic: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded-lg border-gray-600 bg-gray-900"
                    />
                    Public tree
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteTree}
                      disabled={isSaving}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Delete Tree
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                    >
                      Save Tree
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                  <h2 className="text-lg font-bold text-white">People</h2>
                  <form onSubmit={handleSubmitPerson} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={personForm.displayName || ""}
                        onChange={(e) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            displayName: e.target.value,
                          }))
                        }
                        required
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                      <select
                        value={personForm.gender || "unknown"}
                        onChange={(e) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            gender: e.target.value as FamilyGender,
                          }))
                        }
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      >
                        {genderOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
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
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
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
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                      <input
                        type="date"
                        value={personForm.birthDate || ""}
                        onChange={(e) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            birthDate: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                      <input
                        type="date"
                        value={personForm.deathDate || ""}
                        onChange={(e) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            deathDate: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean(personForm.isLiving)}
                        onChange={(e) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            isLiving: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded-lg border-gray-600 bg-gray-900"
                      />
                      Is living
                    </label>
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
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                    <textarea
                      rows={3}
                      placeholder="Metadata JSON"
                      value={metadataInput}
                      onChange={(e) => setMetadataInput(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {editingPersonId ? "Update Person" : "Add Person"}
                      </button>
                      {editingPersonId && (
                        <button
                          type="button"
                          onClick={resetPersonForm}
                          className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700/60"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="max-h-72 overflow-auto rounded-lg border border-gray-700">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-900/60 text-gray-400">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Gender</th>
                          <th className="px-3 py-2">Birth</th>
                          <th className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.people.map((person) => (
                          <tr key={person.id} className="border-t border-gray-700">
                            <td className="px-3 py-2 text-white">
                              {person.displayName}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {person.gender}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {formatDate(person.birthDate)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTreeEditForm((prev) => ({
                                      ...prev,
                                      defaultMainPersonId: person.id,
                                    }))
                                  }
                                  className={`text-xs ${(treeEditForm.defaultMainPersonId ??
                                      detail.tree.defaultMainPersonId) === person.id
                                      ? "text-cyan-300"
                                      : "text-amber-300 hover:text-amber-200"
                                    }`}
                                >
                                  {(treeEditForm.defaultMainPersonId ??
                                    detail.tree.defaultMainPersonId) === person.id
                                    ? "Main"
                                    : "Set Main"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditPerson(person)}
                                  className="text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePerson(person.id, person.displayName)
                                  }
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                  <h2 className="text-lg font-bold text-white">Relationships</h2>
                  <form onSubmit={handleSubmitRelationship} className="space-y-3">
                    <select
                      value={relationshipForm.personId || 0}
                      onChange={(e) =>
                        setRelationshipForm((prev) => ({
                          ...prev,
                          personId: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    >
                      <option value={0}>Select person</option>
                      {detail.people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={relationshipForm.relatedPersonId || 0}
                      onChange={(e) =>
                        setRelationshipForm((prev) => ({
                          ...prev,
                          relatedPersonId: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    >
                      <option value={0}>Select related person</option>
                      {detail.people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={relationshipForm.relationshipType}
                      onChange={(e) =>
                        setRelationshipForm((prev) => ({
                          ...prev,
                          relationshipType: e.target.value as FamilyRelationshipType,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    >
                      {relationshipTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="date"
                        value={relationshipForm.startDate || ""}
                        onChange={(e) =>
                          setRelationshipForm((prev) => ({
                            ...prev,
                            startDate: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                      <input
                        type="date"
                        value={relationshipForm.endDate || ""}
                        onChange={(e) =>
                          setRelationshipForm((prev) => ({
                            ...prev,
                            endDate: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean(relationshipForm.isPrimary)}
                        onChange={(e) =>
                          setRelationshipForm((prev) => ({
                            ...prev,
                            isPrimary: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded-lg border-gray-600 bg-gray-900"
                      />
                      Primary relationship
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Notes"
                      value={relationshipForm.notes || ""}
                      onChange={(e) =>
                        setRelationshipForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSaving || !canSubmitRelationship}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {editingRelationshipId
                          ? "Update Relationship"
                          : "Add Relationship"}
                      </button>
                      {editingRelationshipId && (
                        <button
                          type="button"
                          onClick={resetRelationshipForm}
                          className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700/60"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="max-h-72 overflow-auto rounded-lg border border-gray-700">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-900/60 text-gray-400">
                        <tr>
                          <th className="px-3 py-2">Person</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Related</th>
                          <th className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.relationships.map((relationship) => {
                          const person =
                            peopleById.get(relationship.personId)?.displayName ||
                            String(relationship.personId);
                          const relatedPerson =
                            peopleById.get(relationship.relatedPersonId)
                              ?.displayName || String(relationship.relatedPersonId);
                          const summary = `${person} ${relationship.relationshipType} ${relatedPerson}`;
                          return (
                            <tr
                              key={relationship.id}
                              className="border-t border-gray-700"
                            >
                              <td className="px-3 py-2 text-white">{person}</td>
                              <td className="px-3 py-2 text-gray-300">
                                {relationship.relationshipType}
                              </td>
                              <td className="px-3 py-2 text-gray-300">
                                {relatedPerson}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditRelationship(relationship)
                                    }
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteRelationship(
                                        relationship.id,
                                        summary,
                                      )
                                    }
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
