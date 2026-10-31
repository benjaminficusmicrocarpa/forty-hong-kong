import { useEffect, useRef } from "react";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import type { ChangeKey, FortyMeta } from "@/lib/forty";
import { changeCode } from "@/lib/forty";

type Frame = { west: number; south: number; east: number; north: number };
type Rgba = [number, number, number, number];

function snapFrame(bounds: { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number }): Frame {
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
}

export type Outline = {
  type: "FeatureCollection";
  features: {
    geometry: {
      type: string;
      coordinates: number[][][] | number[][][][];
    };
  }[];
};

type Props = {
  meta: FortyMeta;
  grid: Uint8Array | null;
  before: Uint8Array | null;
  lutKey: string;
  colorOf: (value: number, previous: number) => Rgba | null;
  opacity: number;
  basemap: "sat" | "street";
  outline: Outline | null;
  flyTo: { lng: number; lat: number; zoom: number; token: number } | null;
  onPick: (lng: number, lat: number) => void;
  onFreePan?: () => void;
};

const SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const STREET = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function MapStage({
  meta,
  grid,
  before,
  lutKey,
  colorOf,
  opacity,
  basemap,
  outline,
  flyTo,
  onPick,
  onFreePan,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ready = useRef(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const freeRef = useRef(onFreePan);
  freeRef.current = onFreePan;
  const flyRef = useRef(flyTo);
  flyRef.current = flyTo;
  const state = useRef({ meta, grid, before, colorOf, opacity, outline });
  state.current = { meta, grid, before, colorOf, opacity, outline };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let map: MlMap | null = null;
    let dead = false;

    const anchor = {
      nw: [meta.west, meta.north] as [number, number],
      se: [meta.east, meta.south] as [number, number],
    };

    const draw = () => {
      const current = mapRef.current;
      const cvs = canvasRef.current;
      const box = wrapRef.current;
      if (!current || !cvs || !box || !ready.current) {
        if (cvs) cvs.dataset.phase = `skip-${Boolean(current)}-${Boolean(box)}-${ready.current}`;
        return;
      }
      const { grid: cells, before: prior, colorOf: paint, opacity: alpha, meta: bounds } =
        state.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = box.clientWidth;
      const cssH = box.clientHeight;
      if (cssW < 2 || cssH < 2) {
        cvs.dataset.phase = `tiny-${cssW}x${cssH}`;
        return;
      }
      cvs.dataset.phase = `drawn-${cssW}x${cssH}`;
      cvs.style.width = `${cssW}px`;
      cvs.style.height = `${cssH}px`;
      cvs.width = Math.round(cssW * dpr);
      cvs.height = Math.round(cssH * dpr);
      cvs.style.transform = "none";
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.globalAlpha = alpha;
      if (cells) {
        const b = current.getBounds();
        const c0 = clampCol(bounds, b.getWest());
        const c1 = clampCol(bounds, b.getEast()) + 1;
        const r0 = clampRow(bounds, b.getNorth());
        const r1 = clampRow(bounds, b.getSouth()) + 1;
        const winW = Math.max(1, c1 - c0);
        const winH = Math.max(1, r1 - r0);
        const off = document.createElement("canvas");
        if (winW > 1600 || winH > 1600) {
          const scale = Math.min(1400 / bounds.width, 1400 / bounds.height, 1);
          const ow = Math.max(1, Math.round(bounds.width * scale));
          const oh = Math.max(1, Math.round(bounds.height * scale));
          paintCells(off, cells, prior, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height, ow, oh, paint);
          const tl = current.project([bounds.west, bounds.north]);
          const br = current.project([bounds.east, bounds.south]);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, tl.x * dpr, tl.y * dpr, (br.x - tl.x) * dpr, (br.y - tl.y) * dpr);
        } else {
          paintCells(off, cells, prior, bounds.width, bounds.height, c0, r0, c1, r1, winW, winH, paint);
          const lon0 = bounds.west + (c0 / bounds.width) * (bounds.east - bounds.west);
          const lon1 = bounds.west + (c1 / bounds.width) * (bounds.east - bounds.west);
          const lat0 = bounds.north - (r0 / bounds.height) * (bounds.north - bounds.south);
          const lat1 = bounds.north - (r1 / bounds.height) * (bounds.north - bounds.south);
          const tl = current.project([lon0, lat0]);
          const br = current.project([lon1, lat1]);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(off, tl.x * dpr, tl.y * dpr, (br.x - tl.x) * dpr, (br.y - tl.y) * dpr);
        }
      }
      ctx.globalAlpha = 1;
      const line = state.current.outline;
      if (line) {
        ctx.lineWidth = Math.max(1, dpr);
        ctx.strokeStyle = "rgba(255,250,243,0.9)";
        ctx.beginPath();
        for (const feature of line.features) {
          trace(ctx, current, feature.geometry, dpr);
        }
        ctx.stroke();
      }
      const nw = current.project(anchor.nw);
      const se = current.project(anchor.se);
      anchor.nw = [meta.west, meta.north];
      void nw;
      void se;
      const viewBounds = current.getBounds();
      (cvs as HTMLCanvasElement & { __frame?: Frame }).__frame = snapFrame(viewBounds);
    };

    const follow = () => {
      const current = mapRef.current;
      const cvs = canvasRef.current;
      const box = wrapRef.current;
      if (!current || !cvs || !box) return;
      const frame = (cvs as HTMLCanvasElement & { __frame?: Frame }).__frame;
      if (!frame) return;
      const fromNw = current.project([frame.west, frame.north]);
      const fromSe = current.project([frame.east, frame.south]);
      const sx = (fromSe.x - fromNw.x) / box.clientWidth;
      const sy = (fromSe.y - fromNw.y) / box.clientHeight;
      if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx === 0 || sy === 0) return;
      cvs.style.transformOrigin = "0 0";
      cvs.style.transform = `translate(${fromNw.x}px, ${fromNw.y}px) scale(${sx}, ${sy})`;
    };

    void (async () => {
      const maplibregl = await import("maplibre-gl");
      if (dead || !wrapRef.current || !canvasRef.current) return;
      canvasRef.current.dataset.phase = "imported";
      map = new maplibregl.Map({
        container: wrapRef.current,
        attributionControl: false,
        center: [114.16, 22.34],
        zoom: 10.15,
        minZoom: 1,
        maxZoom: 18,
        dragPan: true,
        scrollZoom: true,
        boxZoom: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
        keyboard: true,
        style: styleFor(basemap),
      });
      if (!map) return;
      const view = map;
      const boot = () => {
        if (!canvasRef.current) return;
        canvasRef.current.dataset.phase = "boot";
        ready.current = true;
        mapRef.current = view;
        unlock(view);
        view.resize();
        draw();
      };
      view.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      if (view.loaded() || view.isStyleLoaded()) boot();
      else view.once("style.load", boot);
      view.on("error", (event) => {
        console.error("maplibre", event.error?.message ?? event.error);
      });
      let dragging = false;
      view.on("dragstart", () => {
        dragging = true;
      });
      view.on("move", follow);
      view.on("moveend", () => {
        const b = view.getBounds();
        if (b && canvasRef.current) {
          (canvasRef.current as HTMLCanvasElement & { __frame?: Frame }).__frame = snapFrame(b);
        }
        draw();
        dragging = false;
      });
      view.on("click", (event) => {
        if (dragging) return;
        pickRef.current(event.lngLat.lng, event.lngLat.lat);
      });
    })();

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
      draw();
    });
    observer.observe(wrap);

    return () => {
      dead = true;
      observer.disconnect();
      map?.remove();
      mapRef.current = null;
      ready.current = false;
    };
    // Map instance is created once. Later prop updates redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const next = styleFor(basemap);
    map.setStyle(next);
    map.once("styledata", () => {
      const cvs = canvasRef.current;
      const b = map.getBounds();
      if (cvs) (cvs as HTMLCanvasElement & { __frame?: Frame }).__frame = snapFrame(b);
      map.fire("moveend");
    });
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const target = flyRef.current;
    if (!map || !target?.token) return;
    map.flyTo({ center: [target.lng, target.lat], zoom: target.zoom, essential: true });
  }, [flyTo?.token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    map.fire("moveend");
  }, [lutKey, grid, before, opacity, outline]);

  return (
    <div className="absolute inset-0 z-0" style={{ position: "absolute", inset: 0 }}>
      <div ref={wrapRef} className="h-full w-full" style={{ position: "absolute", inset: 0, touchAction: "none" }} />
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />
      <div className="absolute right-3 top-36 z-10 flex flex-col gap-1">
        <button
          type="button"
          aria-pressed="true"
          title="拖去任何地方，放大縮細不受地點限制"
          onClick={() => {
            unlock(mapRef.current);
            freeRef.current?.();
          }}
          className="rounded-card bg-moss px-3 py-2 text-sm text-paper-2 shadow-sm"
        >
          自由 pan
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
          className="rounded-card bg-paper-2/95 px-3 py-2 text-sm text-ink shadow-sm"
        >
          放大
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
          className="rounded-card bg-paper-2/95 px-3 py-2 text-sm text-ink shadow-sm"
        >
          縮細
        </button>
      </div>
    </div>
  );
}

function unlock(map: MlMap | null) {
  if (!map) return;
  map.setMinZoom(1);
  map.setMaxZoom(18);
  map.setMaxBounds(null);
  map.dragPan.enable();
  map.scrollZoom.enable();
  map.boxZoom.enable();
  map.doubleClickZoom.enable();
  map.touchZoomRotate.enable();
  map.keyboard.enable();
}

function styleFor(basemap: "sat" | "street"): StyleSpecification {
  const tiles = basemap === "sat" ? [SAT] : [STREET];
  const attribution =
    basemap === "sat"
      ? "底圖 Esri、Maxar、Earthstar Geographics"
      : "© OpenStreetMap 貢獻者";
  return {
    version: 8,
    sources: {
      base: { type: "raster", tiles, tileSize: 256, attribution },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

function clampCol(meta: FortyMeta, lon: number) {
  const t = (lon - meta.west) / (meta.east - meta.west);
  return Math.max(0, Math.min(meta.width - 1, Math.floor(t * meta.width)));
}

function clampRow(meta: FortyMeta, lat: number) {
  const t = (meta.north - lat) / (meta.north - meta.south);
  return Math.max(0, Math.min(meta.height - 1, Math.floor(t * meta.height)));
}

function paintCells(
  canvas: HTMLCanvasElement,
  grid: Uint8Array,
  before: Uint8Array | null,
  gw: number,
  gh: number,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  dw: number,
  dh: number,
  colorOf: (value: number, previous: number) => Rgba | null,
) {
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(dw, dh);
  const data = img.data;
  const scaleX = (c1 - c0) / dw;
  const scaleY = (r1 - r0) / dh;
  for (let y = 0; y < dh; y++) {
    const row = Math.min(gh - 1, r0 + Math.floor(y * scaleY));
    const rowOff = row * gw;
    const di = y * dw * 4;
    for (let x = 0; x < dw; x++) {
      const col = Math.min(gw - 1, c0 + Math.floor(x * scaleX));
      const idx = rowOff + col;
      const value = grid[idx] ?? 0;
      const previous = before ? (before[idx] ?? 0) : 0;
      const color = colorOf(value, previous);
      if (!color) continue;
      const i = di + x * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    }
  }
  ctx.putImageData(img, 0, 0);
}

function trace(
  ctx: CanvasRenderingContext2D,
  map: MlMap,
  geometry: { type: string; coordinates: number[][][] | number[][][][] },
  dpr: number,
) {
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates as number[][][]) strokeRing(ctx, map, ring, dpr);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates as number[][][][]) {
      for (const ring of poly) strokeRing(ctx, map, ring, dpr);
    }
  }
}

function strokeRing(
  ctx: CanvasRenderingContext2D,
  map: MlMap,
  ring: number[][],
  dpr: number,
) {
  if (ring.length < 2) return;
  const first = map.project([ring[0][0], ring[0][1]]);
  ctx.moveTo(first.x * dpr, first.y * dpr);
  for (let i = 1; i < ring.length; i++) {
    const p = map.project([ring[i][0], ring[i][1]]);
    ctx.lineTo(p.x * dpr, p.y * dpr);
  }
  ctx.closePath();
}

export function describePick(
  meta: FortyMeta,
  grid: Uint8Array,
  before: Uint8Array | null,
  lon: number,
  lat: number,
): { cls: number; change: ChangeKey | 0 } | null {
  if (lon < meta.west || lon > meta.east || lat < meta.south || lat > meta.north) return null;
  const col = clampCol(meta, lon);
  const row = clampRow(meta, lat);
  const idx = row * meta.width + col;
  const cls = grid[idx] ?? 0;
  if (!cls) return { cls: 0, change: 0 };
  const prev = before ? (before[idx] ?? 0) : 0;
  return { cls, change: before ? changeCode(prev, cls) : 0 };
}
