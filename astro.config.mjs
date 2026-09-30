// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// Project and blog pages render on request, so the sitemap plugin never sees
// them - list them from the production API at build time. Unreachable API
// (e.g. offline local build) just means a shorter sitemap, never a failed build.
const SITE = 'https://hafizbahtiar.com';
const API = 'https://api.hafizbahtiar.com/api/v1';
/** @param {string} path @param {string} prefix @returns {Promise<string[]>} */
const slugsFrom = async (path, prefix) => {
  try {
    const res = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(8000) });
    const { data } = await res.json();
    return (Array.isArray(data) ? data : []).map((item) => `${SITE}${prefix}${item.slug}`);
  } catch {
    return [];
  }
};
const dynamicPages = [
  ...(await slugsFrom('projects', '/projects/')),
  ...(await slugsFrom('blog', '/blog/')),
];

// Kept out of the sitemap: private/utility pages, /family (unlisted by design -
// see CLAUDE.md), and per-project legal pages (thin; empty ones are noindex).
const SITEMAP_EXCLUDE = [/\/admin/, /\/login/, /\/family(\/|$)/, /\/verify-email/, /\/(privacy|terms)\/?$/];

// https://astro.build/config
export default defineConfig({
  // Canonical origin - powers Astro.site for <link rel="canonical"> and OG URLs.
  site: SITE,
  output: 'server',
  // Image passthrough - MUST be set explicitly. @astrojs/cloudflare v13's
  // default (when `imageService` is unset) is 'cloudflare-binding', which sends
  // every runtime /_image request through the Cloudflare Images binding
  // (env.IMAGES). That binding is not configured here, AND remote <Image> URLs
  // omit the `f` (format) param, so the transform endpoint returns 400
  // "Unsupported format" on every remote image. 'passthrough' streams the
  // original bytes and needs no binding/Transformations.
  // `imageService: 'cloudflare'` (edge AVIF/WebP via /cdn-cgi/image/...) caused
  // production 404s because Transformations is NOT enabled on the zone. Re-enable
  // ONLY after turning it on (Cloudflare dash → Images → Transformations →
  // hafizbahtiar.com) and verifying /cdn-cgi/image/ URLs return 200.
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [
    react(),
    sitemap({
      customPages: dynamicPages,
      filter: (page) => !SITEMAP_EXCLUDE.some((re) => re.test(page)),
    }),
  ],
  image: {
    domains: [
      "www.qiubbx.com",
      "qiubbx.com",
      "cit.securiforce.net",
      "eperolehan.dbkl.gov.my",
      "github.com",
      "avatars.githubusercontent.com",
      "media.licdn.com"
      // ghchart.rshah.org is deliberately NOT listed: it serves SVG, and the
      // passthrough /_image endpoint returns it as "image/undefined", which
      // browsers refuse to render. Unlisted remotes keep their original URL.
    ]
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["@tanstack/react-table"],
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/maplibre-gl")) {
              return "maplibre";
            }
            if (id.includes("node_modules/@tiptap")) {
              return "tiptap";
            }
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/scheduler")
            ) {
              return "react-vendor";
            }
            if (id.includes("node_modules/@tanstack")) {
              return "tanstack";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
          },
        },
      },
    },
  },
});
