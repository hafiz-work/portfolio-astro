// Thin wrappers over the global admin toast (AlertToast) + confirm modal so
// React islands don't repeat the window casting. <AlertToast id="admin-alert" /> is
// mounted once in PrivateLayout, next to ConfirmModal.

type ToastType = "success" | "error" | "warning" | "info";

export const ADMIN_TOAST_ID = "admin-alert";

export function showToast(opts: {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  id?: string;
}): void {
  if (typeof window === "undefined") return;
  const registry = (window as unknown as { __uiAlerts?: Record<string, { show: (o: unknown) => void }> }).__uiAlerts;
  registry?.[opts.id ?? ADMIN_TOAST_ID]?.show({
    type: opts.type,
    title: opts.title,
    message: opts.message,
    duration: opts.duration ?? (opts.type === "error" ? 5000 : 2600),
  });
}

export function confirmDialog(opts: {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const modal = (window as unknown as { confirmModal?: { show: (o: unknown) => Promise<boolean> } }).confirmModal;
  if (modal?.show) return modal.show(opts);
  return Promise.resolve(window.confirm(opts.message ?? "Are you sure?"));
}

// Form helpers shared by the admin new/edit pages (blog, experiences, quotes).

/** API error -> toast text, with the field's label appended when the API names one. */
export function formatErrorMessage(
  error: unknown,
  fallback: string,
  labels: Record<string, string>,
): { message: string; field?: string } {
  const e = error as { message?: string; data?: { error?: string; field?: string } };
  const message = e?.data?.error || e?.message || fallback;
  const field = e?.data?.field;
  return field ? { message: `${message} (Field: ${labels[field] || field})`, field } : { message, field };
}

/** "" or not a number -> undefined. */
export function normalizeNumber(value: FormDataEntryValue): number | undefined {
  const raw = String(value).trim();
  if (raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Trimmed text, "" -> null. */
export function normalizeOptionalText(value: FormDataEntryValue): string | null {
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

/** MultiDropdown's JSON array value; falls back to a comma list. */
export function parseJsonArray(value: FormDataEntryValue): unknown[] {
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
