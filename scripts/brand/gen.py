"""Generate every brand asset from one source: the circuit-cube mark.

Writes public/brand/{logo,wordmark,jata,icon,icon-maskable}.svg, all favicon
PNGs + favicon.ico + favicon.svg, and og-default.png.

    python3 -m venv .venv-brand && .venv-brand/bin/pip install fonttools pillow
    .venv-brand/bin/python scripts/brand/gen.py

macOS only: uses the system DIN Alternate Bold font and Google Chrome
(headless) to rasterise. All text is outlined to paths, so the SVGs need no
fonts at runtime.
"""
import glob, math, os, subprocess, tempfile
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(PUBLIC, "brand")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIN = TTFont("/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf")
INK = "#030712"  # tile / OG background = site dark canvas (gray-950)

BLUE, GREEN, TEAL = "#2563eb", "#34d399", "#22b8c4"


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


# Faces are drawn in a unit square and mapped onto the cube with an affine
# matrix, so every stroke skews with its face. Left = H, right = B, both built
# as circuit traces (straight runs, 45° chamfers, round pads); top = plain
# parallel traces.
FACES = {
    "left": {
        "paths": ["M.22 .14V.86", "M.78 .14V.86", "M.22 .5H.78"],
        "pads": [(.22, .14), (.78, .14)],
    },
    "right": {
        "paths": [
            "M.22 .86V.14H.6L.78 .32V.34L.62 .5H.22",
            "M.62 .5L.8 .68V.7L.64 .86H.22",
        ],
        "pads": [(.22, .86)],
    },
    "top": {
        "paths": ["M.14 .2H.86", "M.14 .5H.4L.54 .36H.86", "M.14 .8H.86"],
        "pads": [(.14, .2), (.14, .5), (.14, .8)],
    },
}


def cube(cx, cy, L, sw=0.13, pad=0.085):
    dx, dy = L * math.cos(math.pi / 6), L / 2
    mats = {
        "left": (dx, dy, 0, L, cx - dx, cy - dy),
        "right": (dx, -dy, 0, L, cx, cy),
        "top": (dx, -dy, dx, dy, cx - dx, cy - dy),
    }
    out = []
    for k, m in mats.items():
        f = FACES[k]
        body = "".join(f'<path d="{d}"/>' for d in f["paths"])
        body += "".join(f'<circle cx="{x}" cy="{y}" r="{pad}" fill="#fff" stroke="none"/>' for x, y in f["pads"])
        out.append(
            f'<g transform="matrix({" ".join(f"{v:.3f}" for v in m)})" stroke="#fff" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{body}</g>'
        )
    return "".join(out)


def mark(cx, cy, L, gid):
    return (
        f'<defs><linearGradient id="{gid}" x1="{cx - L}" y1="{cy + L}" x2="{cx + L}" y2="{cy - L}" gradientUnits="userSpaceOnUse">'
        f'<stop stop-color="{BLUE}"/><stop offset="1" stop-color="{GREEN}"/></linearGradient>'
        f'<mask id="{gid}m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">{cube(cx, cy, L)}</mask></defs>'
        f'<rect x="{cx - 2 * L}" y="{cy - 2 * L}" width="{4 * L}" height="{4 * L}" fill="url(#{gid})" mask="url(#{gid}m)"/>'
    )


def text_grad(gid):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
            f'<stop stop-color="#3b82f6"/><stop offset="1" stop-color="{TEAL}"/></linearGradient></defs>')


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none">{body}</svg>\n'


def build():
    for p in glob.glob(os.path.join(OUT, "*.svg")):
        os.remove(p)

    # Wordmark: mark left, lowercase name right, optically centred on the cube.
    name, name_w = text(DIN, "hafizbahtiar", 52, 112, 77, 0.5)
    wordmark = svg(round(112 + name_w + 8), 120,
                   mark(52, 60, 40, "gw") + text_grad("tw") + f'<path fill="url(#tw)" d="{name}"/>')

    # Jata: stacked emblem, no ring - mark, tracked name, hairline-flanked year.
    title, _ = text(DIN, "HAFIZ BAHTIAR", 22, 140, 206, 7, "middle")
    year, year_w = text(DIN, "SINCE 2020", 11, 140, 238, 5, "middle")
    gap, rule = 14, 44
    l, r = 140 - year_w / 2 - gap, 140 + year_w / 2 + gap
    jata = svg(280, 260,
               mark(140, 92, 58, "gj") + text_grad("tj")
               + f'<path fill="url(#tj)" d="{title}"/>'
               + f'<path fill="#3b82f6" d="{year}"/>'
               + f'<path d="M{l - rule:.1f} 234.5H{l:.1f}M{r:.1f} 234.5H{r + rule:.1f}" stroke="#3b82f6" stroke-width="1"/>')

    # App icons: rounded dark tile, and a full-bleed maskable one whose cube
    # stays inside the 80% safe zone.
    icon = svg(512, 512, f'<rect width="512" height="512" rx="112" fill="{INK}"/>' + mark(256, 256, 150, "gi"))
    maskable = svg(512, 512, f'<rect width="512" height="512" fill="{INK}"/>' + mark(256, 256, 120, "gm"))

    files = {
        "logo.svg": svg(128, 128, mark(64, 64, 50, "gl")),
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
    with open(os.path.join(PUBLIC, "icon0.svg"), "w") as fh:
        fh.write(icon)
    print("wrote", ", ".join(files), "+ favicon.svg, icon0.svg")
    return wordmark


def screenshot(html, w, h, out):
    """Render an HTML string to PNG with headless Chrome (transparent bg)."""
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "p.html")
        with open(page, "w") as fh:
            fh.write(html)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--default-background-color=00000000", f"--window-size={w},{h}",
                        f"--screenshot={out}", f"file://{page}"], check=True, capture_output=True)


def raster(wordmark):
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
        maskable.resize((180, 180), Image.LANCZOS).save(os.path.join(fav, "apple-icon.png"))
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
