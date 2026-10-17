import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import TechText from "../react-bits/tech-text";

// Section title as React Bits TechText (canvas, one line). Canvas needs hex colours,
// so follow the `.dark` class on <html> (the theme switch) instead of CSS.
const isDark = () => document.documentElement.classList.contains("dark");

export default function TechTitle({ text, fontSize, fontWeight }: { text: string; fontSize: number; fontWeight: number }) {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    const mo = new MutationObserver(() => setDark(isDark()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return (
    <TechText
      text={text}
      align="left"
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={dark ? "#ffffff" : "#030712"}
      accentColor={dark ? "#38bdf8" : "#0284c7"}
      reach={160}
    />
  );
}

// Mounted by TechHeading's script (lg+ only). The fallback text inside each box is
// replaced on first render; roots whose box left the page (ClientRouter swap) unmount.
const roots = new Map<HTMLElement, Root>();

export function mountTechTitles() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-tech-title]:not([data-mounted])")) {
    el.dataset.mounted = "";
    const root = createRoot(el);
    root.render(<TechTitle {...JSON.parse(el.dataset.techTitle!)} />);
    roots.set(el, root);
  }
}

document.addEventListener("astro:after-swap", () => {
  for (const [el, root] of roots) {
    if (el.isConnected) continue;
    root.unmount();
    roots.delete(el);
  }
});
