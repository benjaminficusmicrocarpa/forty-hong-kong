#!/usr/bin/env python3
"""Clip public ForTy COGs to Hong Kong and write gzipped class grids.

Sources (public, no API key):
  gs://nature-trace/export_rasters/forest_typology_2020_v1_0_classification/
  gs://nature-trace/export_rasters/forest_typology/v2_beta/{year}/
"""

from __future__ import annotations

import gzip
import json
import math
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
from tifffile import TiffFile

ROOT = Path("/workspace/public/forty")
CACHE = Path("/tmp/forty-cache")
BASE = "https://storage.googleapis.com/nature-trace/"

# Hong Kong land + outlying islands, with a thin margin.
WEST, SOUTH, EAST, NORTH = 113.825, 22.138, 114.452, 22.568
RES_M = 10.0

V1_PREFIX = "export_rasters/forest_typology_2020_v1_0_classification/"
V2_PREFIX = "export_rasters/forest_typology/v2_beta/{year}/"

# Tiles whose UTM footprints meet the SAR (from the public 2020 classification index).
TILES = [
    "raster_49Q_20_15_17.tif",
    "raster_49Q_20_15_18.tif",
    "raster_49Q_20_15_19.tif",
    "raster_49Q_20_16_17.tif",
    "raster_49Q_20_16_18.tif",
    "raster_49Q_20_16_19.tif",
    "raster_50Q_20_15_0.tif",
    "raster_50Q_20_15_1.tif",
    "raster_50Q_20_16_0.tif",
    "raster_50Q_20_16_1.tif",
    "raster_50Q_20_16_2.tif",
    "raster_50Q_20_16_3.tif",
]

OUTLINE_URLS = [
    "https://raw.githubusercontent.com/hupili/geohk/master/census2001/dc_land.lowres.geo.json",
]


def grid_shape() -> tuple[int, int, float, float]:
    lat_c = math.radians((SOUTH + NORTH) / 2)
    m_lon = 111412.84 * math.cos(lat_c) - 93.5 * math.cos(3 * lat_c)
    m_lat = 111132.92 - 559.82 * math.cos(2 * lat_c) + 1.175 * math.cos(4 * lat_c)
    width = int(round((EAST - WEST) * m_lon / RES_M))
    height = int(round((NORTH - SOUTH) * m_lat / RES_M))
    return width, height, m_lon, m_lat


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "forty-hk/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, tmp.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    tmp.replace(dest)


def fetch_outline() -> dict:
    last = None
    for url in OUTLINE_URLS:
        try:
            print("outline", url, flush=True)
            req = urllib.request.Request(url, headers={"User-Agent": "forty-hk/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if data.get("type") == "FeatureCollection" or data.get("type") == "Feature":
                return data
        except Exception as exc:  # noqa: BLE001
            last = exc
            print(" outline failed", exc, flush=True)
    raise RuntimeError(f"no HK outline: {last}")


def iter_rings(geom: dict):
    gtype = geom["type"]
    coords = geom["coordinates"]
    if gtype == "Polygon":
        yield coords
    elif gtype == "MultiPolygon":
        yield from coords
    else:
        raise ValueError(gtype)


def features_of(geo: dict):
    if geo["type"] == "FeatureCollection":
        return geo["features"]
    if geo["type"] == "Feature":
        return [geo]
    return [{"type": "Feature", "properties": {}, "geometry": geo}]


def simplify_ring(ring: list, step: int) -> list:
    if len(ring) <= 80:
        return ring
    slim = ring[::step]
    if slim[-1] != ring[-1]:
        slim.append(ring[-1])
    return slim


def build_mask(width: int, height: int, geo: dict) -> tuple[np.ndarray, dict]:
    mask_img = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask_img)
    simple_features = []
    for feat in features_of(geo):
        geom = feat["geometry"]
        polys = []
        for poly in iter_rings(geom):
            pix_rings = []
            out_rings = []
            for ring in poly:
                pts = []
                out = []
                step = 1 if len(ring) < 500 else max(1, len(ring) // 280)
                slim = ring if step == 1 else simplify_ring(ring, step)
                for lon, lat in ring:
                    c = (lon - WEST) / (EAST - WEST) * width
                    r = (NORTH - lat) / (NORTH - SOUTH) * height
                    pts.append((c, r))
                for lon, lat in slim:
                    out.append([round(float(lon), 5), round(float(lat), 5)])
                if len(pts) >= 3:
                    pix_rings.append(pts)
                    if out[0] != out[-1]:
                        out.append(out[0])
                    out_rings.append(out)
            if not pix_rings:
                continue
            draw.polygon(pix_rings[0], fill=1)
            for hole in pix_rings[1:]:
                draw.polygon(hole, fill=0)
            polys.append(out_rings)
        if polys:
            simple_features.append(
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {"type": "MultiPolygon", "coordinates": polys},
                }
            )
    mask = np.asarray(mask_img, dtype=np.uint8)
    # Close hairline gaps between adjacent district polygons (~10 m).
    pad = np.pad(mask, 1)
    mask = (
        (pad[1:-1, 1:-1] | pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    ).astype(np.uint8)
    outline = {"type": "FeatureCollection", "features": simple_features}
    print(f"mask land pixels {int(mask.sum())} of {mask.size}", flush=True)
    return mask, outline


def read_class(path: Path, kind: str) -> tuple[np.ndarray, dict]:
    with TiffFile(path) as tif:
        page = tif.pages[0]
        arr = page.asarray()
        # ModelTransformationTag 34264, row-major 4x4.
        M = None
        for tag in page.tags.values():
            if tag.code == 34264:
                M = [float(v) for v in tag.value]
                break
        if M is None:
            raise RuntimeError(f"no transform {path}")
    if kind == "v1":
        klass = arr.astype(np.uint8)
        klass[klass == 255] = 0
        klass[(klass < 1) | (klass > 6)] = 0
    else:
        if arr.ndim != 3:
            raise RuntimeError(f"expected bands {path} {arr.shape}")
        bands = arr[:6].astype(np.uint16)
        nodata = bands.sum(axis=0) > 1000
        klass = bands.argmax(axis=0).astype(np.uint8) + 1
        klass[nodata] = 0
    return klass, {"M0": M[0], "M1": M[1], "M3": M[3], "M4": M[4], "M5": M[5], "M7": M[7]}


def paint_tile(
    grid: np.ndarray,
    klass: np.ndarray,
    geo: dict,
    epsg: int,
    to_ll: Transformer,
    to_utm: Transformer,
) -> None:
    h, w = klass.shape
    M0, M1, M3 = geo["M0"], geo["M1"], geo["M3"]
    M4, M5, M7 = geo["M4"], geo["M5"], geo["M7"]
    if abs(M1) > 1e-6 or abs(M4) > 1e-6 or abs(M0 - 10) > 1e-3 or abs(M5 - 10) > 1e-3:
        raise RuntimeError(f"unexpected affine {geo}")

    def xy_to_ll(col: float, row: float) -> tuple[float, float]:
        x = M3 + M0 * col
        y = M7 + M5 * row
        lon, lat = to_ll.transform(x, y)
        return float(lon), float(lat)

    corners = [xy_to_ll(c, r) for c, r in ((0, 0), (w, 0), (0, h), (w, h))]
    lons = [p[0] for p in corners]
    lats = [p[1] for p in corners]
    gh, gw = grid.shape
    c0 = max(0, int(math.floor((min(lons) - WEST) / (EAST - WEST) * gw)) - 2)
    c1 = min(gw, int(math.ceil((max(lons) - WEST) / (EAST - WEST) * gw)) + 2)
    r0 = max(0, int(math.floor((NORTH - max(lats)) / (NORTH - SOUTH) * gh)) - 2)
    r1 = min(gh, int(math.ceil((NORTH - min(lats)) / (NORTH - SOUTH) * gh)) + 2)
    if c0 >= c1 or r0 >= r1:
        return
    cols = np.arange(c0, c1)
    rows = np.arange(r0, r1)
    lon = WEST + (cols + 0.5) / gw * (EAST - WEST)
    lat = NORTH - (rows + 0.5) / gh * (NORTH - SOUTH)
    lon2, lat2 = np.meshgrid(lon, lat)
    x, y = to_utm.transform(lon2, lat2)
    scol = np.rint((x - M3) / M0 - 0.5).astype(np.int32)
    srow = np.rint((y - M7) / M5 - 0.5).astype(np.int32)
    ok = (scol >= 0) & (scol < w) & (srow >= 0) & (srow < h)
    sampled = np.zeros(scol.shape, np.uint8)
    sampled[ok] = klass[srow[ok], scol[ok]]
    sub = grid[r0:r1, c0:c1]
    write = sampled > 0
    sub[write] = sampled[write]
    grid[r0:r1, c0:c1] = sub


def zone_of(name: str) -> int:
    return 32649 if name.startswith("raster_49") else 32650


def mosaic(paths: list[tuple[str, Path]], kind: str, width: int, height: int) -> np.ndarray:
    grid = np.zeros((height, width), np.uint8)
    transformers: dict[int, tuple[Transformer, Transformer]] = {}
    for name, path in paths:
        epsg = zone_of(name)
        if epsg not in transformers:
            transformers[epsg] = (
                Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True),
                Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True),
            )
        to_ll, to_utm = transformers[epsg]
        print(f"  paint {name} {path.stat().st_size/1e6:.1f}MB", flush=True)
        klass, geo = read_class(path, kind)
        paint_tile(grid, klass, geo, epsg, to_ll, to_utm)
        del klass
    return grid


def save_grid(path: Path, grid: np.ndarray) -> None:
    raw = np.ascontiguousarray(grid).tobytes()
    with gzip.open(path, "wb", compresslevel=9) as fh:
        fh.write(raw)


def counts_of(grid: np.ndarray, mask: np.ndarray) -> list[int]:
    clipped = grid.copy()
    clipped[mask == 0] = 0
    return [int((clipped == i).sum()) for i in range(7)]


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    width, height, m_lon, m_lat = grid_shape()
    pix_w = (EAST - WEST) / width * m_lon
    pix_h = (NORTH - SOUTH) / height * m_lat
    pix_ha = pix_w * pix_h / 10000.0
    print(f"grid {width}x{height} pixel {pix_w:.2f}x{pix_h:.2f}m {pix_ha:.5f} ha", flush=True)

    outline = fetch_outline()
    mask, simple = build_mask(width, height, outline)
    (ROOT / "hk-outline.json").write_text(json.dumps(simple, separators=(",", ":")))

    jobs: list[tuple[str, str, str, list[str]]] = []
    jobs.append(("v1-2020", "v1", V1_PREFIX, TILES))
    for year in range(2017, 2026):
        jobs.append((f"v2-{year}", "v2", V2_PREFIX.format(year=year), TILES))

    # Download everything first so a slow year does not block the rest of the network.
    pending = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = []
        for _id, _kind, prefix, names in jobs:
            for name in names:
                url = BASE + prefix + name
                dest = CACHE / prefix.replace("/", "_") / name
                futs.append(pool.submit(download, url, dest))
                pending.append((dest, name))
        done = 0
        for fut in as_completed(futs):
            fut.result()
            done += 1
            if done % 10 == 0 or done == len(futs):
                print(f"downloaded {done}/{len(futs)}", flush=True)

    layers = []
    for layer_id, kind, prefix, names in jobs:
        print(f"mosaic {layer_id}", flush=True)
        paths = [(name, CACHE / prefix.replace("/", "_") / name) for name in names]
        grid = mosaic(paths, kind, width, height)
        grid[mask == 0] = 0
        counts = counts_of(grid, mask)
        out = ROOT / f"{layer_id}.bin"
        save_grid(out, grid)
        ha = [round(c * pix_ha, 1) for c in counts]
        print(f"  {layer_id} ha {ha[1:]} file {out.stat().st_size/1e6:.2f}MB", flush=True)
        layers.append(
            {
                "id": layer_id,
                "kind": kind,
                "year": 2020 if layer_id == "v1-2020" else int(layer_id.split("-")[1]),
                "file": out.name,
                "counts": counts,
                "hectares": ha,
            }
        )
        # Keep a quicklook of the official map.
        if layer_id == "v1-2020":
            pal = np.array(
                [
                    [0, 0, 0],
                    [0x1B, 0x78, 0x37],
                    [0x7F, 0xBF, 0x7B],
                    [0x1D, 0x91, 0xC0],
                    [0xE6, 0x5F, 0xA9],
                    [0xE6, 0xAB, 0x02],
                    [0xFD, 0xE2, 0x78],
                ],
                dtype=np.uint8,
            )
            rgb = pal[grid]
            rgb[grid == 0] = 255
            Image.fromarray(rgb, "RGB").resize((900, int(900 * height / width)), Image.Resampling.NEAREST).save(
                "/tmp/forty-preview.png"
            )

    meta = {
        "west": WEST,
        "south": SOUTH,
        "east": EAST,
        "north": NORTH,
        "width": width,
        "height": height,
        "pixelMetres": [round(pix_w, 3), round(pix_h, 3)],
        "pixelHectares": pix_ha,
        "layers": layers,
        "source": {
            "v1": "projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_collection",
            "v2": "gs://nature-trace/export_rasters/forest_typology/v2_beta/",
            "cog": "gs://nature-trace/export_rasters/forest_typology_2020_v1_0/",
        },
    }
    (ROOT / "meta.json").write_text(json.dumps(meta))
    print("done", flush=True)


if __name__ == "__main__":
    main()
