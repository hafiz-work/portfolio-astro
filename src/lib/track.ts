import { API_BASE_URL } from "./config";

/**
 * True for links that point at the downloadable resume PDF
 * (e.g. `/docs/hafizbahtiar-resume-4-3.pdf`).
 */
export const isResumePdfHref = (href: string | null | undefined): boolean =>
  !!href && /resume[^/]*\.pdf(?:[?#].*)?$/i.test(href);

/**
 * Fire-and-forget beacon for a resume download.
 *
 * `sendBeacon` keeps this a CORS-safelisted request (text/plain, so no
 * preflight) and survives the navigation that follows the click. The body only
 * carries an attribution hint - IP, country and user-agent are read
 * server-side from request headers. Tracking must never block or delay the
 * download itself, so every failure here is swallowed.
 */
export function trackResumeDownload(source = "site"): void {
  const url = `${API_BASE_URL}/public/resume-download`;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([source], { type: "text/plain" }));
    } else {
      void fetch(url, { method: "POST", body: source, keepalive: true }).catch(() => {});
    }
  } catch {
    /* tracking is best-effort */
  }
}
