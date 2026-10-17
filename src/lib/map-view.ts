// Peta / Senarai pages (/ipu, /gempa): the tab switch, and the event that selects a
// point on PointsMap from outside (kept here so page scripts don't import the island).

export const POINTS_MAP_FOCUS = "points-map:focus";

/** Bind the [role=tab] buttons in #`listId` (panel = aria-controls, "panel-<view>").
 *  Peta is the default; #senarai opens the list. The query string (?stesen=) is kept. */
export function bindViewTabs(listId: string) {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(`#${listId} [role=tab]`)];
  if (!tabs.length || tabs[0].dataset.bound === "1") return;
  const view = (t: HTMLElement) => t.getAttribute("aria-controls")!.replace("panel-", "");
  const show = (id: string) => {
    for (const t of tabs) {
      const on = view(t) === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(`panel-${view(t)}`)!.hidden = !on;
    }
  };
  for (const t of tabs) {
    t.dataset.bound = "1";
    t.addEventListener("click", () => {
      show(view(t));
      history.replaceState(history.state, "", location.pathname + location.search + (view(t) === "peta" ? "" : `#${view(t)}`));
    });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = tabs[(tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      next.click();
    });
  }
  show(location.hash === "#senarai" ? "senarai" : "peta");
}
