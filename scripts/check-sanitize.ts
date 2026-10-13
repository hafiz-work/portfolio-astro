// Run: bun scripts/check-sanitize.ts - throws if the blog allowlist leaks.
import { expect } from "bun:test";
import { renderUserMarkdown, sanitizeRichHtml as s, toPlainText } from "../src/lib/sanitize.ts";

// Presets survive only with allowed values.
expect(s('<p data-spacing="loose" data-align="center">a</p>')).toBe('<p data-spacing="loose" data-align="center">a</p>');
expect(s('<p data-spacing="9em" data-align="x" style="color:red">a</p>')).toBe("<p>a</p>");
expect(s('<aside data-callout="tip"><p>a</p></aside>')).toBe('<aside data-callout="tip"><p>a</p></aside>');
expect(s('<aside data-callout="evil" onclick="x()">a</aside>')).toBe("<aside>a</aside>");
expect(s("<mark>a</mark>")).toBe("<mark>a</mark>");

// Embeds: youtube-nocookie only, hardened attrs.
const yt = s('<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/abc_1-2?start=0" width="640" height="480" onload="x()"></iframe></div>');
expect(yt).toMatch(/^<div data-youtube-video><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/abc_1-2\?start=0" width="640" height="480" loading="lazy" allowfullscreen/);
expect(!yt.includes("onload")).toBeTruthy();
for (const src of ["https://evil.com/embed/x", "javascript:alert(1)", "https://www.youtube-nocookie.com.evil.com/embed/x", "//www.youtube-nocookie.com/embed/x"]) {
  expect(s(`<iframe src="${src}"></iframe>`), src).toBe("");
}
expect(!s('<iframe src="https://www.youtube-nocookie.com/embed/x"><script>x()</script></iframe>').includes("x()")).toBeTruthy();

// Task lists: checkbox only, always disabled.
expect(s('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>a</p></div></li></ul>')).toBe('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked" disabled><span></span></label><div><p>a</p></div></li></ul>');
expect(s('<input type="text" value="x">')).toBe("");

// Still blocked.
expect(s('<script>alert(1)</script><img src=x onerror="x()"><a href="javascript:x()">a</a>')).toBe('<a rel="noopener noreferrer">a</a>');

// Plain text for inline contexts: tags gone, entities decoded, blocks spaced.
expect(toPlainText("<p>Built <strong>mobile</strong> apps.</p><p>Second &amp; last.</p>")).toBe("Built mobile apps. Second & last.");
expect(toPlainText("Plain text stays.")).toBe("Plain text stays.");
expect(toPlainText("<ul><li>a</li><li>b</li></ul><script>x()</script>")).toBe("a b");

// User posts (registered users' markdown): strict UGC mode.
const ugc = renderUserMarkdown;

expect(!ugc("<script>alert(1)</script>").includes("script"), "script dropped").toBeTruthy();
expect(!ugc("[x](javascript:alert(1))").includes("javascript"), "javascript: href dropped").toBeTruthy();
expect(!ugc('<img src=x onerror="alert(1)">').includes("onerror"), "event handlers dropped").toBeTruthy();
expect(ugc('<iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>'), "no embeds for users").toBe("");
expect(!ugc('<p class="fixed inset-0 z-50">x</p>').includes("class"), "no classes for users").toBeTruthy();
expect(!ugc('<input type="checkbox">').includes("<input"), "no inputs for users").toBeTruthy();
expect(ugc("[ok](https://a.b)"), "links are nofollow ugc").toMatch(/rel="nofollow ugc noopener noreferrer" target="_blank"/);
expect(ugc("**bold**"), "markdown still renders").toMatch(/<strong>bold<\/strong>/);
expect(s('<iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>').includes("<iframe"), "owner mode unchanged").toBeTruthy();

// Images: linked by https URL only (no base64), lazy + no referrer.
expect(s('<img src="https://cdn.example.com/a.png" alt="A" width="640" onerror="x()">')).toBe(
  '<img src="https://cdn.example.com/a.png" alt="A" width="640" loading="lazy" decoding="async" referrerpolicy="no-referrer">',
);
for (const src of ["data:image/png;base64,AAAA", "http://insecure.example/a.png", "javascript:alert(1)", "//cdn.example.com/a.png", "/media/a.png", ""]) {
  expect(s(`<p><img src="${src}"></p>`), src || "(empty)").toBe("<p></p>");
}
expect(s('<img src="https://x.example/a.png" width="100%">')).toBe('<img src="https://x.example/a.png" loading="lazy" decoding="async" referrerpolicy="no-referrer">');
expect(renderUserMarkdown("![cat](https://x.example/cat.jpg)"), "users: no third-party images (tracking pixels)").not.toContain("<img");
expect(renderUserMarkdown("![cat](https://api.hafizbahtiar.com/api/v1/media/images/a1-b2.png)")).toContain('<img src="https://api.hafizbahtiar.com/api/v1/media/images/a1-b2.png" alt="cat"');
expect(renderUserMarkdown("![b64](data:image/png;base64,AAAA)")).not.toContain("<img");

console.log("sanitize: ok");
