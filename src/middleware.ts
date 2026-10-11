import type { MiddlewareHandler } from "astro";

/**
 * Security headers for SSR-generated HTML documents.
 *
 * `public/_headers` covers static + prerendered responses, but with
 * `output: "server"` the on-demand HTML documents (login, admin, etc.) are
 * produced by the Worker and do not pass through the static-asset header layer.
 * This middleware guarantees the same headers land on those responses.
 *
 * KEEP THE Content-Security-Policy VALUE IN SYNC WITH public/_headers.
 */
/** Routes other sites may put in an <iframe> (see the end of onRequest). */
const EMBEDDABLE = new Set(["/waktu-solat/embed"]);

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  // Dev only: ClientRouter loads the next page in a same-origin iframe to collect
  // client:only styles (prepareForClientOnlyComponents); DENY would hang navigation.
  "X-Frame-Options": import.meta.env.DEV ? "SAMEORIGIN" : "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // geolocation=(self): /waktu-solat "Guna lokasi saya" (still asks the user first).
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    import.meta.env.DEV ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // static.cloudflareinsights.com (script) + cloudflareinsights.com
    // (beacon POST): Cloudflare Web Analytics is auto-injected by Cloudflare,
    // so the CSP must allow it or analytics silently fails.
    // challenges.cloudflare.com: Cloudflare Turnstile on /login and the contact
    // form - it serves the script and renders the widget inside an iframe.
    "script-src 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com https://challenges.cloudflare.com",
    // youtube-nocookie.com: blog video embeds - the only host sanitizeRichHtml
    // lets an <iframe> point at.
    "frame-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    // api.waktusolat.app: /waktu-solat "Guna lokasi saya" (GPS -> JAKIM zone).
    // github-contributions-api.jogruber.de: contact-section GitHub card,
    // fetched only when a visitor opens the card.
    // In dev the API runs on localhost:8787 - without this, the CSP silently
    // blocks every admin fetch during local development.
    `connect-src 'self' https://api.hafizbahtiar.com https://api.waktusolat.app https://cloudflareinsights.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://github-contributions-api.jogruber.de${import.meta.env.DEV ? " http://localhost:8787" : ""
    }`,
  ].join("; "),
};

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Canonicalize www → apex with a 301. Both hostnames currently serve 200,
  // producing duplicate URLs; the canonical <link> already points to the apex,
  // this removes the duplicate at the source for SSR HTML. The authoritative
  // fix is a Cloudflare Redirect Rule (www.hafizbahtiar.com/* → apex), which
  // also covers static assets - see docs/reports/public-portfolio-audit.md.
  const url = context.url;
  if (url.hostname === "www.hafizbahtiar.com") {
    url.hostname = "hafizbahtiar.com";
    return context.redirect(url.toString(), 301);
  }

  // Admin shell gate - defense-in-depth + UX, NOT a security boundary.
  //
  // The real auth tokens (access_token/refresh_token) are httpOnly cookies on
  // the API domain, so this frontend Worker cannot verify auth server-side.
  // `session_active` is a non-httpOnly flag the client sets at login
  // (src/lib/auth.ts) with the SAME ~7-day lifetime as the backend session -
  // and the backend session is NOT sliding-extended on refresh (hono-workers
  // /auth/refresh inherits the original absolute expiry), so the flag and the
  // session expire in lockstep. Gating on it therefore never forces a
  // premature re-login: once it is gone the silent-refresh path would fail
  // anyway, so this only removes the brief flash of the empty admin shell
  // before PrivateLayout's client-side guardAuth redirects.
  //
  // The flag is client-settable, so this is not access control: every admin
  // page still fetches its data client-side behind the backend's real auth.
  const path = url.pathname;
  // /admin/login is the admin sign-in page itself - never gate it.
  const isAdminRoute =
    (path === "/admin" || path.startsWith("/admin/")) && path !== "/admin/login";
  // /account/verify is the email-link landing page - reachable signed out.
  const isAccountRoute =
    (path === "/account" || path.startsWith("/account/")) && !path.startsWith("/account/verify");
  if ((isAdminRoute || isAccountRoute) && context.cookies.get("session_active")?.value !== "1") {
    return context.redirect(isAdminRoute ? "/admin/login" : "/login", 302);
  }

  const response = await next();

  // Only decorate HTML documents - never JSON/asset responses the Worker emits.
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }
    // The prayer-times widget is made to be iframed by other sites (mosques,
    // companies). Only this route may be framed; everything else stays DENY.
    if (EMBEDDABLE.has(path)) {
      response.headers.delete("X-Frame-Options");
      response.headers.set(
        "Content-Security-Policy",
        SECURITY_HEADERS["Content-Security-Policy"].replace(/frame-ancestors [^;]+/, "frame-ancestors *"),
      );
    }
  }

  return response;
};
