import { useEffect, useState } from "react";
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
