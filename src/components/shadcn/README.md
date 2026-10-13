# shadcn/ui components

Copy-in components from [ui.shadcn.com](https://ui.shadcn.com) (MIT). They live here, isolated from our own `src/components/ui/`.

## Add a component

```bash
npx shadcn@latest add <name> --dry-run   # always preview first
npx shadcn@latest add <name>
```

`components.json` sends files to `src/components/shadcn/{ui,lib,hooks}` and CSS variables to `src/styles/shadcn.css`. Never pass `--overwrite`/`--path` pointing at `src/components/ui/`, and never run `shadcn init` (it rewrites `components.json` and the global CSS).

After each add:

1. Review `git diff src/styles/shadcn.css`. Keep new `--*` vars and `@theme inline` entries. **Delete** any base layer the CLI inserts (`@layer base { * { @apply border-border … } body { … } }`) and any `--radius-*` overrides, because they restyle the whole site.
2. Overlay components (dialog, popover, dropdown-menu, select, tooltip …) use `animate-in`/`fade-in-0` classes from `tw-animate-css`. Without it they work but don't animate. If wanted: `npm i tw-animate-css` + `@import "tw-animate-css";` in `src/styles/shadcn.css`.
3. `npm run build`.

## Rules

- **Token classes are shadcn-only.** `bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-primary`, … are defined in `src/styles/shadcn.css` (mapped to our gray/sky palette) and may only appear in files under this folder.
- **Use as React islands.** Mount from `.astro` with a `client:*` directive, or import inside an existing React island. They render in light/dark automatically (`.dark` on `<html>`).
- **Icons:** lucide only (already configured).
- **Don't fork our primitives.** If `src/components/ui/` already has the thing (Select, DataTable, AlertToast, ConfirmModal), use ours unless you are deliberately replacing it. A replacement is a separate, explicit task that migrates every call site.
- Edit copied files freely; they are ours now. Re-running `add` on an existing file needs `--overwrite` and will discard local edits.
