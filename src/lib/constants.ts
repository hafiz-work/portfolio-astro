// Precise centroid of Kuala Lumpur used as the map display fallback
export const KL_CENTER: [number, number] = [101.68879746977579, 3.1789972504885134];

// Default pin location for the experience map picker (city center approximation)
export const KL_DEFAULT_LATITUDE = 3.139;
export const KL_DEFAULT_LONGITUDE = 101.6869;

// Latest resume PDF in public/docs. Bump here (and drop the old file) on a new version.
export const RESUME_URL = "/docs/hafizbahtiar-resume-4-4.pdf";

// Cloudflare Turnstile site key (public, browser-safe). `||` on purpose: an unset or
// empty build env falls back to the production key, so prod never ships without the
// captcha. Locally, use Cloudflare's test key instead (see .env.example).
export const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFD-PSk_u7NHAF-5";

// Public contact address (Hero, Contact section, Footer, ⌘K, JSON-LD).
export const CONTACT_EMAIL = "hafiz@hafizbahtiar.com";
