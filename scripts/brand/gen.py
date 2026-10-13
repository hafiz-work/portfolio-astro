"""Generate every brand asset from one source: the HB circuit monogram.

Source: scripts/brand/hb-monogram.png (the owner's artwork). Its glow is dropped
and the letters are traced to a vector path on every run, so every output stays
crisp at any size and there is still exactly one source.

Writes public/brand/{logo,wordmark,jata,icon,icon-maskable}.svg, all favicon
PNGs, favicon.ico, favicon.svg, apple-touch-icon.png and og-default.png.

    python3 -m venv .venv-brand && .venv-brand/bin/pip install fonttools pillow potracer
    .venv-brand/bin/python scripts/brand/gen.py

macOS only: uses the system DIN Alternate Bold font and a Chromium browser
(Google Chrome, else Brave) headless to rasterise. All text is outlined to
paths, so the SVGs need no fonts at runtime.
"""
import glob, os, subprocess, tempfile
import potrace
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(PUBLIC, "brand")
SRC = os.path.join(os.path.dirname(__file__), "hb-monogram.png")
BROWSERS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
]
BROWSER = next((b for b in BROWSERS if os.path.exists(b)), None)
DIN = TTFont("/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf")
INK = "#030712"  # tile / OG background = site dark canvas (gray-950)

# Sampled from the source artwork: bottom-left blue -> top-right teal.
BLUE, TEAL = "#1c7bf5", "#42cfc7"


def text(font, s, size, x, y, tracking=0.0, anchor="start"):
    """Single-line text as a path `d`; returns (d, width)."""
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    k = size / font["head"].unitsPerEm
    names = [cmap[ord(c)] for c in s]
    adv = [gs[n].width * k for n in names]
    width = sum(adv) + tracking * (len(s) - 1)
    cx = x - width / 2 if anchor == "middle" else x
    pen = SVGPathPen(gs)
    for n, a in zip(names, adv):
        gs[n].draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
        cx += a + tracking
    return pen.getCommands(), width


def trace_mark():
    """Source PNG -> (path d, width, height) of the letters alone.

    The artwork is letters (alpha >= ~220) over a soft glow (alpha <= ~140) on
    transparency. Ramp alpha across that gap, work at 2x for smooth curves,
    threshold, crop to the letters and trace.
    """
    alpha = Image.open(SRC).convert("RGBA").getchannel("A")
    m = alpha.point(lambda v: 0 if v < 120 else 255 if v > 230 else int((v - 120) * 255 / 110))
    m = m.resize((m.width * 2, m.height * 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    m = m.point(lambda v: 255 if v >= 128 else 0)
    m = m.crop(m.getbbox())
    # potrace fills dark pixels: letters must be black.
    bm = potrace.Bitmap(ImageOps.invert(m).convert("1"), blacklevel=0.5)
    curves = bm.trace(turdsize=20, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                      alphamax=1.0, opticurve=True, opttolerance=0.2)
    d = []
    for c in curves:
        d.append(f"M{c.start_point.x:.1f} {c.start_point.y:.1f}")
        for seg in c.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
            else:
                d.append(f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} "
                         f"{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        d.append("Z")
    return "".join(d), m.width, m.height


MARK_D, MARK_W, MARK_H = trace_mark()


def mark(cx, cy, w, gid):
    """The monogram centred on (cx, cy), `w` wide, blue -> teal diagonal gradient."""
    k = w / MARK_W
    x, y = cx - w / 2, cy - MARK_H * k / 2
    return (
        f'<defs><linearGradient id="{gid}" x1="0" y1="1" x2="1" y2="0">'
        f'<stop stop-color="{BLUE}"/><stop offset="1" stop-color="{TEAL}"/></linearGradient></defs>'
        f'<path transform="translate({x:.2f} {y:.2f}) scale({k:.5f})" fill="url(#{gid})" '
        f'fill-rule="evenodd" d="{MARK_D}"/>'
    )


def text_grad(gid):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
            f'<stop stop-color="{BLUE}"/><stop offset="1" stop-color="{TEAL}"/></linearGradient></defs>')


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none">{body}</svg>\n'


def build():
    for p in glob.glob(os.path.join(OUT, "*.svg")):
        os.remove(p)

    # Wordmark: mark left, lowercase name right, optically centred on the cube.
    name, name_w = text(DIN, "hafizbahtiar", 52, 112, 77, 0.5)
    wordmark = svg(round(112 + name_w + 8), 120,
                   mark(52, 60, 88, "gw") + text_grad("tw") + f'<path fill="url(#tw)" d="{name}"/>')

    # Jata: stacked emblem, no ring - mark, tracked name, hairline-flanked year.
    title, _ = text(DIN, "HAFIZ BAHTIAR", 22, 140, 206, 7, "middle")
    year, year_w = text(DIN, "SINCE 2020", 11, 140, 238, 5, "middle")
    gap, rule = 14, 44
    l, r = 140 - year_w / 2 - gap, 140 + year_w / 2 + gap
    jata = svg(280, 260,
               mark(140, 92, 150, "gj") + text_grad("tj")
               + f'<path fill="url(#tj)" d="{title}"/>'
               + f'<path fill="#3b82f6" d="{year}"/>'
               + f'<path d="M{l - rule:.1f} 234.5H{l:.1f}M{r:.1f} 234.5H{r + rule:.1f}" stroke="#3b82f6" stroke-width="1"/>')

    # App icons: rounded dark tile, and a full-bleed opaque one (maskable / Apple)
    # whose monogram stays inside the 80% safe circle (300 wide -> 378 diagonal < 410).
    icon = svg(512, 512, f'<rect width="512" height="512" rx="112" fill="{INK}"/>' + mark(256, 256, 340, "gi"))
    maskable = svg(512, 512, f'<rect width="512" height="512" fill="{INK}"/>' + mark(256, 256, 300, "gm"))

    files = {
        "logo.svg": svg(128, 128, mark(64, 64, 112, "gl")),
        "wordmark.svg": wordmark,
        "jata.svg": jata,
        "icon.svg": icon,
        "icon-maskable.svg": maskable,
    }
    for fname, content in files.items():
        with open(os.path.join(OUT, fname), "w") as fh:
            fh.write(content)
    with open(os.path.join(PUBLIC, "favicon.svg"), "w") as fh:
        fh.write(icon)
    print("wrote", ", ".join(files), "+ favicon.svg")
    return wordmark


def screenshot(html, w, h, out):
    """Render an HTML string to PNG with headless Chrome (transparent bg)."""
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "p.html")
        with open(page, "w") as fh:
            fh.write(html)
        subprocess.run([BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--default-background-color=00000000", f"--window-size={w},{h}",
                        f"--screenshot={out}", f"file://{page}"], check=True, capture_output=True)


def raster(wordmark):
    if not BROWSER:
        raise SystemExit("No Chromium browser found (Chrome or Brave) - needed to rasterise.")
    fav = os.path.join(PUBLIC, "favicons")
    with tempfile.TemporaryDirectory() as tmp:
        masters = {}
        for name in ("icon", "icon-maskable"):
            src = open(os.path.join(OUT, f"{name}.svg")).read().replace("<svg ", '<svg width="1024" height="1024" ', 1)
            masters[name] = os.path.join(tmp, f"{name}.png")
            screenshot(f'<body style="margin:0">{src}</body>', 1024, 1024, masters[name])
        icon, maskable = (Image.open(masters[n]).convert("RGBA") for n in ("icon", "icon-maskable"))

        sizes = [16, 32, 57, 60, 70, 72, 76, 96, 114, 120, 128, 144, 150, 152, 180, 192, 310, 384, 512]
        for n in sizes:
            icon.resize((n, n), Image.LANCZOS).save(os.path.join(fav, f"favicon-{n}x{n}.png"))
        for n in (192, 512):
            maskable.resize((n, n), Image.LANCZOS).save(os.path.join(fav, f"web-app-manifest-{n}x{n}.png"))
        # Apple wants an opaque full square (iOS rounds it; transparent corners turn
        # black). Root path: iOS and crawlers request /apple-touch-icon.png by default.
        maskable.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(PUBLIC, "apple-touch-icon.png"))
        icon.resize((512, 512), Image.LANCZOS).save(os.path.join(fav, "icon1.png"))
        icon.save(os.path.join(PUBLIC, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

    # OG card: site canvas, hatched gutters, full-bleed hairlines, wordmark.
    hatch = "repeating-linear-gradient(315deg,#ffffff1a 0 1px,transparent 0 50%) 0 0/10px 10px"
    og = f"""<body style="margin:0;width:1200px;height:630px;background:{INK};position:relative;overflow:hidden;font-family:-apple-system,system-ui,sans-serif">
<div style="position:absolute;inset:0 auto 0 0;width:64px;background:{hatch};border-right:1px solid #ffffff1a"></div>
<div style="position:absolute;inset:0 0 0 auto;width:64px;background:{hatch};border-left:1px solid #ffffff1a"></div>
<div style="position:absolute;left:0;right:0;top:170px;border-top:1px solid #ffffff1a"></div>
<div style="position:absolute;left:0;right:0;top:372px;border-top:1px solid #ffffff1a"></div>
<div style="position:absolute;left:100px;top:181px;height:180px">{wordmark.replace('<svg ', '<svg height="180" ', 1)}</div>
<p style="position:absolute;left:118px;top:404px;margin:0;color:#9ca3af;font-size:34px;letter-spacing:-.01em">Backend &amp; Flutter developer · Kuala Lumpur</p>
<p style="position:absolute;left:118px;top:540px;margin:0;color:#38bdf8;font:600 18px ui-monospace,Menlo,monospace;letter-spacing:.2em">HAFIZBAHTIAR.COM</p>
</body>"""
    out = os.path.join(PUBLIC, "og-default.png")
    screenshot(og, 1200, 630, out)
    Image.open(out).convert("RGB").save(out)  # OG must be opaque
    print("wrote favicons/*.png, favicon.ico, og-default.png")


if __name__ == "__main__":
    raster(build())
