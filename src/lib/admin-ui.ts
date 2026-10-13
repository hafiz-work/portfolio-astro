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
