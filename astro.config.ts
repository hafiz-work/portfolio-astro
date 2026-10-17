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
const slugsFrom = async (path: string, prefix: string): Promise<string[]> => {
  try {
    const res = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(8000) });
    const { data } = await res.json();
    return (Array.isArray(data) ? data : []).map((item: { slug: string }) => `${SITE}${prefix}${item.slug}`);
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
const SITEMAP_EXCLUDE = [/\/admin/, /\/login/, /\/account(\/|$)/, /\/register/, /\/family(\/|$)/, /\/verify-email/, /\/(privacy|terms)\/?$/];

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
    // `astro check` / `astro sync` / `astro build` start a type-gen Vite server that
    // re-bundles node_modules/.vite/deps_ssr with a different include list, deleting
    // files the running dev server's workerd still imports -> 500 "The file does not
    // exist at .../deps_ssr/<x>.js which is in the optimize deps directory". The dev
    // server gets its own cache dir so those commands can run alongside it.
    {
      name: 'dev-vite-cache',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          if (command === 'dev') updateConfig({ vite: { cacheDir: 'node_modules/.vite-dev' } });
        },
      },
    },
    sitemap({
      customPages: dynamicPages,
      filter: (page) => !SITEMAP_EXCLUDE.some((re) => re.test(page)),
      // Same URL form as the canonical tag (CoreLayout): no trailing slash except "/".
      serialize: (item) => {
        const url = new URL(item.url);
        if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
        return { ...item, url: url.href };
      },
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
      include: [
        "@tanstack/react-table",
        "motion/react",
        "lucide-react",
        // ClientRouter's modules: otherwise found on the first page load, which
        // re-optimizes and reloads the page.
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-swap-functions.js",
        "astro/virtual-modules/transitions-types.js",
      ],
    },
    // Pre-bundle SSR-side React deps at startup. Discovered lazily, Vite re-optimizes
    // mid-request ("optimized dependencies changed. reloading") and the SSR runner
    // ends up with two React copies -> "Invalid hook call" in islands (dev only).
    ssr: {
      optimizeDeps: {
        include: ["motion/react", "lucide-react", "clsx", "tailwind-merge", "htmlparser2", "domhandler", "entities"],
      },
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
