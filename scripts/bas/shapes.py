"""Route lines for /bas: GTFS static shapes (data.gov.my) -> static JSON in public/.

  public/data/bas/<feed>/<route_id>.json  - [[ [lng, lat], ... ], ...] one line per shape
  public/data/rel.json                    - Rapid KL rail network: lines (colour, shapes,
                                            scheduled headway) + stations

Static files (served from the CDN, no Worker) fetched by the /bas island only when a
route or the rail view is picked. Shapes are simplified (Douglas-Peucker, ~3 m) and
rounded to 5 decimals (~1 m). Re-run with routes.py when operators change routes:

    python3 scripts/bas/shapes.py
"""

import csv
import io
import json
import pathlib
import shutil
import urllib.request
import zipfile
from collections import defaultdict

from feeds import FEEDS

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "public/data"
API = "https://api.data.gov.my/gtfs-static/"
TOLERANCE = 0.00003  # degrees, ~3 m


def load(path):
    with urllib.request.urlopen(API + path, timeout=180) as res:
        return zipfile.ZipFile(io.BytesIO(res.read()))


def rows(z, name):
    if name not in z.namelist():
        return []
    return list(csv.DictReader(io.TextIOWrapper(z.open(name), encoding="utf-8-sig")))


def simplify(pts, tol=TOLERANCE):
    """Douglas-Peucker, iterative."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def shapes_of(z):
    by = defaultdict(list)
    for r in rows(z, "shapes.txt"):
        by[r["shape_id"]].append((int(r["shape_pt_sequence"]), float(r["shape_pt_lon"]), float(r["shape_pt_lat"])))
    return {
        sid: [[round(x, 5), round(y, 5)] for x, y in simplify([(x, y) for _, x, y in sorted(p)])]
        for sid, p in by.items()
    }


def route_shapes(z):
    shapes = shapes_of(z)
    by_route = defaultdict(set)
    for t in rows(z, "trips.txt"):
        if t.get("shape_id") in shapes:
            by_route[t["route_id"]].add(t["shape_id"])
    return {r: [shapes[s] for s in sorted(ids)] for r, ids in by_route.items()}


# Bus (and any feed with shapes): one file per route.
shutil.rmtree(OUT / "bas", ignore_errors=True)
for feed in FEEDS:
    try:
        z = load(feed["static"])
    except (zipfile.BadZipFile, OSError) as e:
        print(f"{feed['id']}: skipped ({e})")
        continue
    lines = route_shapes(z)
    d = OUT / "bas" / feed["id"]
    d.mkdir(parents=True, exist_ok=True)
    for route_id, shapes in lines.items():
        (d / f"{route_id}.json").write_text(json.dumps(shapes, separators=(",", ":")))
    print(f"{feed['id']}: {len(lines)} routes with shapes")

# Rapid KL rail: no live positions on data.gov.my, so the network itself.
z = load("prasarana?category=rapid-rail-kl")
lines = route_shapes(z)
headway = defaultdict(list)
trip_route = {t["trip_id"]: t["route_id"] for t in rows(z, "trips.txt")}
for f in rows(z, "frequencies.txt"):
    if f["trip_id"] in trip_route:
        headway[trip_route[f["trip_id"]]].append(int(f["headway_secs"]) // 60)
rel = {
    "lines": [
        {
            "id": r["route_id"],
            "short": r["route_short_name"],
            "name": r["route_long_name"],
            "ends": r.get("route_desc", ""),
            "color": "#" + r["route_color"].lstrip("#"),
            "headway": [min(headway[r["route_id"]]), max(headway[r["route_id"]])] if headway[r["route_id"]] else None,
            "shapes": lines.get(r["route_id"], []),
        }
        for r in rows(z, "routes.txt")
        if r.get("status", "valid") == "valid"
    ],
    "stations": [
        {
            "id": s["stop_id"],
            "name": s["stop_name"].strip().title(),
            "lat": round(float(s["stop_lat"]), 6),
            "lng": round(float(s["stop_lon"]), 6),
            "line": s["route_id"],
            "oku": s.get("isOKU", "").lower() == "true",
        }
        for s in rows(z, "stops.txt")
        if s.get("status", "valid") == "valid"
    ],
}
(OUT / "rel.json").write_text(json.dumps(rel, separators=(",", ":"), ensure_ascii=False))
print(f"rel: {len(rel['lines'])} lines, {len(rel['stations'])} stations, {sum(len(l['shapes']) for l in rel['lines'])} shapes")
