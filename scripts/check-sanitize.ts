// Run: node scripts/check-sanitize.ts - throws if the blog allowlist leaks.
import assert from "node:assert/strict";
import { sanitizeRichHtml as s, toPlainText } from "../src/lib/sanitize.ts";

// Presets survive only with allowed values.
assert.equal(s('<p data-spacing="loose" data-align="center">a</p>'), '<p data-spacing="loose" data-align="center">a</p>');
assert.equal(s('<p data-spacing="9em" data-align="x" style="color:red">a</p>'), "<p>a</p>");
assert.equal(s('<aside data-callout="tip"><p>a</p></aside>'), '<aside data-callout="tip"><p>a</p></aside>');
assert.equal(s('<aside data-callout="evil" onclick="x()">a</aside>'), "<aside>a</aside>");
assert.equal(s("<mark>a</mark>"), "<mark>a</mark>");

// Embeds: youtube-nocookie only, hardened attrs.
const yt = s('<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/abc_1-2?start=0" width="640" height="480" onload="x()"></iframe></div>');
assert.match(yt, /^<div data-youtube-video><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/abc_1-2\?start=0" width="640" height="480" loading="lazy" allowfullscreen/);
assert.ok(!yt.includes("onload"));
for (const src of ["https://evil.com/embed/x", "javascript:alert(1)", "https://www.youtube-nocookie.com.evil.com/embed/x", "//www.youtube-nocookie.com/embed/x"]) {
    assert.equal(s(`<iframe src="${src}"></iframe>`), "", src);
}
assert.ok(!s('<iframe src="https://www.youtube-nocookie.com/embed/x"><script>x()</script></iframe>').includes("x()"));

// Task lists: checkbox only, always disabled.
assert.equal(
    s('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>a</p></div></li></ul>'),
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked" disabled><span></span></label><div><p>a</p></div></li></ul>',
);
assert.equal(s('<input type="text" value="x">'), "");

// Still blocked.
assert.equal(s('<script>alert(1)</script><img src=x onerror="x()"><a href="javascript:x()">a</a>'), '<a rel="noopener noreferrer">a</a>');

// Plain text for inline contexts: tags gone, entities decoded, blocks spaced.
assert.equal(toPlainText("<p>Built <strong>mobile</strong> apps.</p><p>Second &amp; last.</p>"), "Built mobile apps. Second & last.");
assert.equal(toPlainText("Plain text stays."), "Plain text stays.");
assert.equal(toPlainText("<ul><li>a</li><li>b</li></ul><script>x()</script>"), "a b");

console.log("sanitize: ok");
