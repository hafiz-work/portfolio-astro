// bun scripts/tailwind-canonical.ts [--write]
// Rewrites Tailwind classes to their canonical form - the same check as the Tailwind
// IntelliSense "suggestCanonicalClasses" warning (e.g. `min-w-[8rem]` -> `min-w-32`,
// `rounded-[calc(1*var(--u))]` -> `rounded-(--u)`), using Tailwind's own design system
// (src/styles/index.css) and scanner, so nothing is guessed. Dry run by default.
// The scanner also picks up look-alikes outside class lists (`if (!bg)` -> "!bg",
// CSS `flex-shrink: 0`, comments), so only tokens inside a string literal on their
// line are rewritten; anything else is listed as "skipped" for a human to check.
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { Glob } from "bun";

const root = `${import.meta.dir}/..`;
const write = Bun.argv.includes("--write");
const css = await Bun.file(`${root}/src/styles/index.css`).text();
const ds = (await __unstable__loadDesignSystem(css, { base: `${root}/src/styles` })) as unknown as {
  canonicalizeCandidates(c: string[], o: { rem: number }): string[];
};
const scanner = new Scanner({});
// Inside a "…", '…' or `…` that opens earlier on the same line?
const inString = (content: string, at: number) => {
  const line = content.slice(content.lastIndexOf("\n", at - 1) + 1, at);
  return ['"', "'", "`"].some((q) => (line.split(q).length - 1) % 2 === 1);
};
const cache = new Map<string, string>();
const canonical = (c: string) => {
  if (!cache.has(c)) cache.set(c, ds.canonicalizeCandidates([c], { rem: 16 })[0] ?? c);
  return cache.get(c)!;
};

let files = 0;
let changes = 0;
for await (const rel of new Glob("src/**/*.{astro,tsx,ts,jsx,mdx}").scan({ cwd: root })) {
  const path = `${root}/${rel}`;
  const content = await Bun.file(path).text();
  const ext = rel.split(".").pop()!;
  const edits = scanner
    .getCandidatesWithPositions({ content, extension: ext })
    .map(({ candidate, position }) => ({ candidate, position, next: canonical(candidate) }))
    .filter((e) => e.next !== e.candidate && content.startsWith(e.candidate, e.position));
  for (const e of edits.filter((e) => !inString(content, e.position))) {
    console.log(`${rel}: skipped (not in a string) ${e.candidate} -> ${e.next}`);
  }
  edits.splice(0, edits.length, ...edits.filter((e) => inString(content, e.position)));
  if (!edits.length) continue;
  files++;
  changes += edits.length;
  for (const e of edits) console.log(`${rel}: ${e.candidate} -> ${e.next}`);
  if (write) {
    let out = content;
    for (const e of edits.sort((a, b) => b.position - a.position)) {
      out = out.slice(0, e.position) + e.next + out.slice(e.position + e.candidate.length);
    }
    await Bun.write(path, out);
  }
}
console.log(`${changes} change(s) in ${files} file(s)${write ? " - written" : " - dry run, pass --write to apply"}`);
