interface Window {
  setupDropdowns?: () => void;
}

// Cloudflare runtime env (wrangler.jsonc). Only what the app uses.
declare module "cloudflare:workers" {
  export const env: {
    /** Service binding to the hono-workers API Worker (absent in some local setups). */
    API?: { fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> };
    /** Static assets (public/), bound by @astrojs/cloudflare; may be absent in `astro dev`. */
    ASSETS?: { fetch(input: string | Request | URL): Promise<Response> };
  };
}
