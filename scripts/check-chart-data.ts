import { expect } from "bun:test";
import { cardText, safeImageUrl } from "../src/lib/chart-data";

// family-chart puts these into innerHTML: names escaped, avatars https-only.
expect(cardText("label")({ data: { label: '<img src=x onerror="alert(1)">' } })).toBe('&lt;img src=x onerror="alert(1)"&gt;');
expect(cardText("first name", "last name")({ data: { "first name": "Ali", "last name": "" } })).toBe("Ali");
expect(cardText("birthday")({ data: {} })).toBe("");
expect(safeImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
expect(safeImageUrl('https://x.example/a.png" onerror="alert(1)')).not.toContain('"');
for (const url of ["javascript:alert(1)", "http://x.example/a.png", "data:image/png;base64,AA", "/a.png", "", null]) {
  expect(safeImageUrl(url), String(url)).toBeUndefined();
}

console.log("chart-data: ok");
