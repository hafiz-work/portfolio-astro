// Shared input state for the in-browser calculators (kalkulator-*): the inputs live in the
// query string (so a shared link opens the same sum) and the last ones in localStorage.
// Values are untrusted - each page validates them before filling its form.

export type CalcState = Record<string, string>;

const storageKey = (key: string) => `kalkulator-${key}`;

/** The page's params from the URL if any is present, else the last stored inputs, else null. */
export function loadState(key: string, names: string[]): CalcState | null {
  const q = new URLSearchParams(location.search);
  if (names.some((n) => q.has(n)))
    return Object.fromEntries(names.filter((n) => q.has(n)).map((n) => [n, q.get(n)!]));
  try {
    const v: unknown = JSON.parse(localStorage.getItem(storageKey(key)) ?? "null");
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return Object.fromEntries(
      Object.entries(v).filter((e): e is [string, string] => names.includes(e[0]) && typeof e[1] === "string"),
    );
  } catch {
    return null;
  }
}

/** Put the state in the URL (other params and the hash kept) and in localStorage; empty values are left out. */
export function saveState(key: string, names: string[], state: CalcState | null) {
  const q = new URLSearchParams(location.search);
  names.forEach((n) => q.delete(n));
  const kept = Object.entries(state ?? {}).filter(([n, v]) => names.includes(n) && v !== "");
  kept.forEach(([n, v]) => q.set(n, v));
  const qs = q.toString();
  history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  try {
    if (state) localStorage.setItem(storageKey(key), JSON.stringify(Object.fromEntries(kept)));
    else localStorage.removeItem(storageKey(key));
  } catch {
    /* storage blocked - the URL still carries the inputs */
  }
}

/** Select `value` in a Combobox (or plain select) if it is one of its options; false otherwise. */
export function pickOption(select: HTMLSelectElement, value: string | undefined): boolean {
  if (value === undefined || ![...select.options].some((o) => o.value === value)) return false;
  // Clicking the list option lets Combobox update its trigger label too.
  select
    .closest("[data-combobox]")
    ?.querySelector<HTMLElement>(`[role="option"][data-value="${CSS.escape(value)}"]`)
    ?.click();
  select.value = value;
  return true;
}
