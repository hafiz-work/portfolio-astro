import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Chart, Data } from "family-chart";
import "family-chart/styles/family-chart.css";
import type { FamilyGender, FamilyTreeDetail } from "../../../types/family";
import { buildChartData } from "../../../lib/chart-data";

/**
 * Initial view fits the whole family into the canvas so the full tree is visible
 * up front (small trees render at 1:1 because fit never zooms in past 1). Once the
 * user clicks a card, focus snaps to that person at a readable 1:1 scale.
 */
const READABLE_SCALE = 1;

const centerOnMain = (chart: Chart, transitionTime = 0) =>
  chart.updateTree({
    tree_position: "main_to_middle",
    scale: READABLE_SCALE,
    transition_time: transitionTime,
  });

interface FamilyTreeChartProps {
  detail: FamilyTreeDetail;
  currentSlug: string;
  useLabelOnly?: boolean;
  ancestryDepth?: number;
  progenyDepth?: number;
  showSiblings?: boolean;
  sortChildrenBy?: "label" | "metadata.birth_order";
  sortAscending?: boolean;
  /** Deprecated no-op kept so existing admin builder props remain compatible. */
  enableCrossTreeNavigation?: boolean;
  onSelectPerson?: (personId: number, label: string) => void;
  enableInlineAdd?: boolean;
  onInlineCreateRelative?: (payload: {
    relation: "father" | "mother" | "spouse" | "son" | "daughter";
    anchorPersonId: number;
    otherParentId?: number | null;
    displayName: string;
    firstName?: string | null;
    lastName?: string | null;
    gender: FamilyGender;
    birthDate?: string | null;
    photoUrl?: string | null;
  }) => Promise<void>;
}

export const FamilyTreeChart = ({
  detail,
  currentSlug,
  useLabelOnly,
  ancestryDepth,
  progenyDepth,
  showSiblings,
  sortChildrenBy,
  sortAscending = true,
  onSelectPerson,
  enableInlineAdd = false,
  onInlineCreateRelative,
}: FamilyTreeChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const editTreeRef = useRef<any>(null);
  const onSelectPersonRef = useRef<typeof onSelectPerson>(onSelectPerson);
  const onInlineCreateRelativeRef = useRef<typeof onInlineCreateRelative>(
    onInlineCreateRelative,
  );
  const chartHandlersRef = useRef<typeof import("family-chart").handlers | null>(
    null,
  );
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const selectedMainIdRef = useRef<string>("");
  const [selectedMainId, setSelectedMainId] = useState<string>("");
  const dataRef = useRef<Data>([]);
  const baselineRef = useRef<Data>([]);
  const showSpousesRef = useRef<boolean>(true);
  const applySpouseFilter = (base: Data) => {
    if (showSpousesRef.current) return base;
    return base.map((node) => ({
      ...node,
      rels: {
        ...node.rels,
        spouses: [],
      },
    }));
  };
  const getSpouseOptions = (mainId: string) => {
    const byId = new Map<string, any>();
    for (const x of dataRef.current) byId.set(x.id, x);
    const me = byId.get(mainId);
    if (!me) return [];
    const ids: string[] = Array.isArray(me.rels?.spouses) ? me.rels.spouses : [];
    const opts = ids
      .map((sid) => byId.get(sid))
      .filter(Boolean)
      .map((node) => {
        const dd = node.data?.data ?? node.data ?? {};
        const lbl = dd.label || `${(dd["first name"] || "").trim()} ${(dd["last name"] || "").trim()}`.trim() || dd.name || "";
        return { id: node.id, label: String(lbl) };
      });
    return opts;
  };

  useEffect(() => {
    onSelectPersonRef.current = onSelectPerson;
  }, [onSelectPerson]);

  useEffect(() => {
    onInlineCreateRelativeRef.current = onInlineCreateRelative;
  }, [onInlineCreateRelative]);

  useEffect(() => {
    selectedMainIdRef.current = selectedMainId;
  }, [selectedMainId]);

  const chartData = useMemo(() => buildChartData(detail), [detail]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || chartData.length === 0 || chartRef.current) return;

    let destroyed = false;

    const render = async () => {
      const familyChart = await import("family-chart");
      if (destroyed) return;
      const { createChart } = familyChart;
      chartHandlersRef.current = familyChart.handlers;

      container.innerHTML = "";

      const chart = createChart(container, chartData)
        .setTransitionTime(1000)
        .setCardXSpacing(250)
        .setCardYSpacing(150);

      chartRef.current = chart;
      baselineRef.current = chartData;
      dataRef.current = applySpouseFilter(chartData);
      (window as any).familyChartApi = {
        zoomIn: () => {
          chartHandlersRef.current?.manualZoom({
            amount: 1.25,
            svg: chart.svg,
            transition_time: 250,
          });
        },
        zoomOut: () => {
          chartHandlersRef.current?.manualZoom({
            amount: 0.8,
            svg: chart.svg,
            transition_time: 250,
          });
        },
        fit: () => {
          chart.updateTree({ tree_position: "fit", transition_time: 300 });
        },
        centerMain: () => {
          chart.updateTree({ tree_position: "main_to_middle", transition_time: 300 });
        },
        setOrientation: (vertical: boolean) => {
          if (vertical) chart.setOrientationVertical();
          else chart.setOrientationHorizontal();
          centerOnMain(chart, 300);
        },
        getSpousesOfMain: () => {
          return getSpouseOptions(selectedMainIdRef.current);
        },
        setShowSpouses: (show: boolean) => {
          showSpousesRef.current = !!show;
          const out = applySpouseFilter(baselineRef.current);
          dataRef.current = out;
          chart.updateData(out);
          chart.updateTree({ tree_position: "inherit", transition_time: 250 });
          const spouseOptions = getSpouseOptions(selectedMainIdRef.current);
          window.dispatchEvent(new CustomEvent("family:on-spouses", { detail: { options: spouseOptions } }));
        },
      };

      // Match the public /family ("Fable 5") person-card design: circular avatar
      // when a photo exists, rounded rect fallback when it does not, name + birth
      // year, and hover-path-to-main. Add-relative editing cards are kept.
      const card = chart.setCardHtml();
      card.setStyle("imageCircleRect");
      card.setCardImageField("avatar");
      card.setOnHoverPathToMain();
      if (useLabelOnly) {
        card.setCardDisplay([["label"]]);
        card.setCardDim({ w: 220, h: 80 });
      } else {
        card.setCardDisplay([["first name", "last name"], ["birthday"]]);
        card.setCardDim({ w: 220, h: 80 });
      }
      chart.setDuplicateBranchToggle(true);
      if (typeof ancestryDepth === "number") {
        chart.setAncestryDepth(ancestryDepth);
      }
      if (typeof progenyDepth === "number") {
        chart.setProgenyDepth(progenyDepth);
      }
      if (typeof showSiblings === "boolean") {
        chart.setShowSiblingsOfMain(showSiblings);
      }
      if (sortChildrenBy) {
        chart.setSortChildrenFunction((a: any, b: any) => {
          const grab = (d: any) => {
            const dd = d?.data?.data ?? d?.data ?? {};
            if (sortChildrenBy === "metadata.birth_order") {
              const meta = dd.metadata;
              let order: number | null = null;
              if (typeof meta === "string") {
                try {
                  const parsed = JSON.parse(meta);
                  order = typeof parsed?.birth_order === "number" ? parsed.birth_order : null;
                } catch {
                  order = null;
                }
              } else if (meta && typeof meta === "object") {
                order = typeof meta.birth_order === "number" ? meta.birth_order : null;
              }
              if (order !== null) return order;
            }
            const label = (dd.label || `${(dd["first name"] || "").trim()} ${(dd["last name"] || "").trim()}`.trim()) || "";
            return label.toLowerCase();
          };
          const va = grab(a);
          const vb = grab(b);
          if (typeof va === "number" && typeof vb === "number") {
            return sortAscending ? va - vb : vb - va;
          }
          return sortAscending ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }
      if (enableInlineAdd) {
        editTreeRef.current = chart
          .editTree()
          .setFields([
            { id: "first name", type: "text", label: "First Name" },
            { id: "last name", type: "text", label: "Last Name" },
            { id: "birthday", type: "text", label: "Birth Date" },
            { id: "avatar", type: "text", label: "Avatar URL" },
          ])
          .setEditFirst(true)
          .setAddRelLabels({
            father: "Add Father",
            mother: "Add Mother",
            spouse: "Add Spouse",
            son: "Add Son",
            daughter: "Add Daughter",
          })
          .setOnSubmit(async (e: Event, datum: any, applyChanges: () => void, postSubmit: () => void) => {
            if (!datum?._new_rel_data || !onInlineCreateRelativeRef.current) {
              applyChanges();
              postSubmit();
              return;
            }

            e.preventDefault();

            try {
              const form = e.target as HTMLFormElement | null;
              if (!form) {
                throw new Error("Family form not found");
              }

              const formData = new FormData(form);
              const firstName = String(formData.get("first name") ?? "").trim();
              const lastName = String(formData.get("last name") ?? "").trim();
              const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
              const rawGender = String(formData.get("gender") ?? datum?.data?.gender ?? "M").trim().toUpperCase();

              await onInlineCreateRelativeRef.current({
                relation: datum._new_rel_data.rel_type,
                anchorPersonId: Number(datum._new_rel_data.rel_id),
                otherParentId: datum._new_rel_data.other_parent_id
                  ? Number(datum._new_rel_data.other_parent_id)
                  : null,
                displayName: displayName || "New Person",
                firstName: firstName || null,
                lastName: lastName || null,
                gender: rawGender === "F" ? "female" : "male",
                birthDate: String(formData.get("birthday") ?? "").trim() || null,
                photoUrl: String(formData.get("avatar") ?? "").trim() || null,
              });

              applyChanges();
              postSubmit();
            } catch (error) {
              console.error("Failed to create inline family relative:", error);
            }
          });
      } else {
        editTreeRef.current = null;
      }
      card.setOnCardClick(async (_e: any, d: any) => {
        if (enableInlineAdd && editTreeRef.current && d?.data?._new_rel_data) {
          editTreeRef.current.open(d.data);
          return;
        }

        const id = String(d?.id ?? d?.data?.id ?? "");
        if (!id) return;
        const label = `${d.data["first name"] || ""} ${d.data["last name"] || ""}`.trim() || d.data.name || "";
        setSelectedMainId(id);
        selectedMainIdRef.current = id;
        chart.updateMainId(id);
        chart.updateTree({
          tree_position: "main_to_middle",
          transition_time: 350,
        });
        window.dispatchEvent(new CustomEvent("family:on-main-changed", { detail: { id, label } }));
        onSelectPersonRef.current?.(Number(id), label);
        const spouseOptions = getSpouseOptions(id);
        window.dispatchEvent(new CustomEvent("family:on-spouses", { detail: { options: spouseOptions } }));
        if (enableInlineAdd && editTreeRef.current) {
          const mainDatum = chart.getMainDatum();
          if (mainDatum) {
            editTreeRef.current.addRelative(mainDatum);
          }
        }
      });
      chart.setOrientationVertical();
      let initialMainId = chartData[0]?.id || "";
      const defaultId = detail.tree.defaultMainPersonId ?? null;
      if (defaultId) {
        const defNode = chartData.find((n) => n.id === String(defaultId));
        if (defNode) initialMainId = defNode.id;
      }
      setSelectedMainId(initialMainId);
      selectedMainIdRef.current = initialMainId;
      chart.updateMainId(initialMainId);
      // Render once and fit the whole family into view so the full tree is visible
      // up front (matches the public /family chart). Click any card to focus/re-center
      // that person at a readable 1:1 scale; the toolbar Fit still re-fits on demand.
      chart.updateTree({ initial: true, tree_position: "fit", transition_time: 0 });

      // family-chart does not auto-refit on container size changes. Fit the tree once
      // on the first real layout (covers init before the container has size), then
      // re-center the focused person on later resizes (window resize, sidebar toggle).
      if (typeof ResizeObserver !== "undefined") {
        let raf = 0;
        let lastW = 0;
        let lastH = 0;
        let firstLayout = true;
        const observer = new ResizeObserver(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            if (destroyed || chartRef.current !== chart) return;
            const rect = container.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;
            if (
              Math.abs(rect.width - lastW) < 2 &&
              Math.abs(rect.height - lastH) < 2
            )
              return;
            lastW = rect.width;
            lastH = rect.height;
            if (firstLayout) {
              firstLayout = false;
              chart.updateTree({ tree_position: "fit", transition_time: 0 });
            } else {
              centerOnMain(chart, 0);
            }
          });
        });
        observer.observe(container);
        resizeCleanupRef.current = () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
        };
      }
      const initNode = chartData.find((n) => n.id === initialMainId);
      const initLabel = initNode ? ((initNode.data as any).label || (initNode.data as any).name || "") : "";
      window.dispatchEvent(new CustomEvent("family:on-main-changed", { detail: { id: initialMainId, label: initLabel } }));
      if (initialMainId) {
        onSelectPersonRef.current?.(Number(initialMainId), initLabel);
      }
      const spouseOptions0 = getSpouseOptions(initialMainId);
      window.dispatchEvent(new CustomEvent("family:on-spouses", { detail: { options: spouseOptions0 } }));
      if (enableInlineAdd && editTreeRef.current) {
        const initialDatum = chart.getMainDatum();
        if (initialDatum) {
          editTreeRef.current.addRelative(initialDatum);
        }
      }
    };

    render().catch((error) => {
      console.error("Failed to render family chart:", error);
    });
  }, [chartData, detail]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartData.length === 0) return;

    baselineRef.current = chartData;
    const out = applySpouseFilter(chartData);
    dataRef.current = out;
    chart.updateData(out);

    const currentMainId = selectedMainIdRef.current;
    const hasCurrentMain = currentMainId
      ? out.some((node) => node.id === currentMainId)
      : false;
    const defaultId = detail.tree.defaultMainPersonId ?? null;
    const defaultMainId =
      defaultId && out.some((node) => node.id === String(defaultId))
        ? String(defaultId)
        : "";
    const nextMainId = currentMainId && hasCurrentMain
      ? currentMainId
      : defaultMainId || out[0]?.id || "";

    if (!nextMainId) return;

    if (nextMainId !== selectedMainIdRef.current) {
      setSelectedMainId(nextMainId);
      selectedMainIdRef.current = nextMainId;
    }

    chart.updateMainId(nextMainId);
    chart.updateTree({
      tree_position: currentMainId ? "main_to_middle" : "inherit",
      transition_time: 250,
    });
    if (enableInlineAdd && editTreeRef.current) {
      const mainDatum = chart.getMainDatum();
      if (mainDatum) {
        editTreeRef.current.addRelative(mainDatum);
      }
    }

    const selectedNode = out.find((node) => node.id === nextMainId);
    const nextLabel =
      (selectedNode?.data as any)?.label ||
      (selectedNode?.data as any)?.name ||
      "";

    onSelectPersonRef.current?.(Number(nextMainId), String(nextLabel));
    window.dispatchEvent(
      new CustomEvent("family:on-main-changed", {
        detail: { id: nextMainId, label: nextLabel },
      }),
    );
    const spouseOptions = getSpouseOptions(nextMainId);
    window.dispatchEvent(
      new CustomEvent("family:on-spouses", { detail: { options: spouseOptions } }),
    );
  }, [chartData, currentSlug, detail]);

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      if (editTreeRef.current?.destroy) {
        editTreeRef.current.destroy();
      }
      editTreeRef.current = null;
      chartRef.current = null;
      chartHandlersRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    const onSetMain = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      const id = ce.detail?.id ? String(ce.detail.id) : "";
      if (!id) return;
      const chart = chartRef.current;
      if (!chart) return;
      setSelectedMainId(id);
      selectedMainIdRef.current = id;
      chart.updateMainId(id);
      chart.updateTree({
        tree_position: "main_to_middle",
        transition_time: 350,
      });
      const label =
        dataRef.current.find((node) => node.id === id)?.data?.label ||
        dataRef.current.find((node) => node.id === id)?.data?.name ||
        "";
      onSelectPersonRef.current?.(Number(id), String(label));
      window.dispatchEvent(
        new CustomEvent("family:on-main-changed", { detail: { id, label } }),
      );
      const spouseOptions = getSpouseOptions(id);
      window.dispatchEvent(new CustomEvent("family:on-spouses", { detail: { options: spouseOptions } }));
      if (enableInlineAdd && editTreeRef.current) {
        const mainDatum = chart.getMainDatum();
        if (mainDatum) {
          editTreeRef.current.addRelative(mainDatum);
        }
      }
    };
    window.addEventListener("family:set-main", onSetMain as EventListener);
    return () => {
      window.removeEventListener("family:set-main", onSetMain as EventListener);
    };
  }, []);
  useEffect(() => {
    const onZoomIn = () => {
      const chart = chartRef.current;
      if (!chart) return;
      chartHandlersRef.current?.manualZoom({
        amount: 1.25,
        svg: chart.svg,
        transition_time: 250,
      });
    };
    const onZoomOut = () => {
      const chart = chartRef.current;
      if (!chart) return;
      chartHandlersRef.current?.manualZoom({
        amount: 0.8,
        svg: chart.svg,
        transition_time: 250,
      });
    };
    const onFit = () => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.updateTree({ tree_position: "fit", transition_time: 300 });
    };
    const onCenterMain = () => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.updateTree({ tree_position: "main_to_middle", transition_time: 300 });
    };
    const onOrientation = (e: Event) => {
      const ce = e as CustomEvent<{ vertical: boolean }>;
      const chart = chartRef.current;
      if (!chart) return;
      if (ce.detail?.vertical) {
        chart.setOrientationVertical();
      } else {
        chart.setOrientationHorizontal();
      }
      centerOnMain(chart, 300);
    };
    window.addEventListener("family:zoom-in", onZoomIn as EventListener);
    window.addEventListener("family:zoom-out", onZoomOut as EventListener);
    window.addEventListener("family:fit", onFit as EventListener);
    window.addEventListener("family:center-main", onCenterMain as EventListener);
    window.addEventListener("family:set-orientation", onOrientation as EventListener);
    return () => {
      window.removeEventListener("family:zoom-in", onZoomIn as EventListener);
      window.removeEventListener("family:zoom-out", onZoomOut as EventListener);
      window.removeEventListener("family:fit", onFit as EventListener);
      window.removeEventListener("family:center-main", onCenterMain as EventListener);
      window.removeEventListener("family:set-orientation", onOrientation as EventListener);
    };
  }, []);



  if (chartData.length === 0) {
    return (
      <div className="h-full w-full min-h-[320px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-5 text-sm text-slate-500 dark:text-slate-400">
        No people available to render chart.
      </div>
    );
  }

  return (
    <div className="family-chart--admin h-full w-full min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-family-canvas shadow-sm dark:border-slate-700 dark:shadow-none">
      <div ref={containerRef} className="f3 h-full w-full" />
    </div>
  );
};
