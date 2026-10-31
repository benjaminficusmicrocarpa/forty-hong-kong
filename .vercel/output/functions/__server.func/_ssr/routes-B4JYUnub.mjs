import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Info, i as Layers, n as Satellite, r as Map } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B4JYUnub.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CLASSES = [
	{
		id: 1,
		name: "原始林",
		en: "Primary",
		hint: "原生樹種，睇唔到明顯人為干擾",
		color: "#1B7837",
		rgb: [
			27,
			120,
			55
		]
	},
	{
		id: 2,
		name: "自然再生林",
		en: "Naturally regenerating",
		hint: "自己生返嘅次生林，香港山坡最常見",
		color: "#7FBF7B",
		rgb: [
			127,
			191,
			123
		]
	},
	{
		id: 3,
		name: "人工林",
		en: "Planted",
		hint: "人種植或播種，長周期管理",
		color: "#1D91C0",
		rgb: [
			29,
			145,
			192
		]
	},
	{
		id: 4,
		name: "單一作物林場",
		en: "Plantation",
		hint: "速生、集約、往往單一樹種",
		color: "#E65FA9",
		rgb: [
			230,
			95,
			169
		]
	},
	{
		id: 5,
		name: "樹木作物／農林",
		en: "Tree crops",
		hint: "油棕、橡膠、可可、果樹等",
		color: "#E6AB02",
		rgb: [
			230,
			171,
			2
		]
	},
	{
		id: 6,
		name: "其他土地",
		en: "Other land",
		hint: "草地、農田、城市、水面；市區樹木多數歸呢類",
		color: "#FDE278",
		rgb: [
			253,
			226,
			120
		]
	}
];
var PLACES = [
	{
		id: "all",
		label: "全港",
		lng: 114.16,
		lat: 22.34,
		zoom: 10.15
	},
	{
		id: "island",
		label: "香港島",
		lng: 114.175,
		lat: 22.255,
		zoom: 12.15
	},
	{
		id: "taitam",
		label: "大潭",
		lng: 114.22,
		lat: 22.248,
		zoom: 13.5
	},
	{
		id: "peak",
		label: "太平山",
		lng: 114.149,
		lat: 22.271,
		zoom: 13.7
	},
	{
		id: "kowloon",
		label: "九龍",
		lng: 114.175,
		lat: 22.328,
		zoom: 12.5
	},
	{
		id: "lion",
		label: "獅子山",
		lng: 114.185,
		lat: 22.355,
		zoom: 13.4
	},
	{
		id: "taimo",
		label: "大帽山",
		lng: 114.124,
		lat: 22.411,
		zoom: 13.15
	},
	{
		id: "taipo",
		label: "大埔滘",
		lng: 114.178,
		lat: 22.43,
		zoom: 13.35
	},
	{
		id: "plover",
		label: "船灣",
		lng: 114.265,
		lat: 22.478,
		zoom: 12.35
	},
	{
		id: "saikung",
		label: "西貢",
		lng: 114.36,
		lat: 22.4,
		zoom: 11.7
	},
	{
		id: "longvalley",
		label: "塱原",
		lng: 114.113,
		lat: 22.507,
		zoom: 14.15
	},
	{
		id: "maipo",
		label: "米埔",
		lng: 114.038,
		lat: 22.492,
		zoom: 13.2
	},
	{
		id: "lantau",
		label: "大嶼山",
		lng: 113.95,
		lat: 22.26,
		zoom: 11.35
	},
	{
		id: "taiO",
		label: "大澳",
		lng: 113.862,
		lat: 22.248,
		zoom: 13.4
	}
];
async function loadMeta() {
	const res = await fetch("/forty/meta.json", { cache: "no-store" });
	if (!res.ok) throw new Error("讀唔到地圖資料");
	return res.json();
}
async function loadGrid(file, length) {
	const res = await fetch(`/forty/${file}`, { cache: "no-store" });
	if (!res.ok) throw new Error("地圖載入失敗");
	const buf = new Uint8Array(await res.arrayBuffer());
	const grid = buf.length >= 2 && buf[0] === 31 && buf[1] === 139 ? new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()) : buf;
	if (grid.length !== length) throw new Error("地圖大小唔吻合");
	return grid;
}
var CHANGE_COLORS = {
	loss: [
		176,
		58,
		46
	],
	gain: [
		14,
		116,
		144
	],
	stable: [
		27,
		120,
		55
	]
};
/** Natural forest (1–2) that became something else, or the reverse. 0 = hide. */
function changeCode(before, after) {
	if (!before || !after) return 0;
	const wasNatural = before === 1 || before === 2;
	const isNatural = after === 1 || after === 2;
	if (wasNatural && !isNatural) return "loss";
	if (!wasNatural && isNatural) return "gain";
	if (wasNatural && isNatural) return "stable";
	return 0;
}
var SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
var STREET = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
function MapStage({ meta, grid, before, lutKey, colorOf, opacity, basemap, outline, flyTo, onPick, onFreePan }) {
	const wrapRef = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const ready = (0, import_react.useRef)(false);
	const pickRef = (0, import_react.useRef)(onPick);
	pickRef.current = onPick;
	const freeRef = (0, import_react.useRef)(onFreePan);
	freeRef.current = onFreePan;
	const flyRef = (0, import_react.useRef)(flyTo);
	flyRef.current = flyTo;
	const state = (0, import_react.useRef)({
		meta,
		grid,
		before,
		colorOf,
		opacity,
		outline
	});
	state.current = {
		meta,
		grid,
		before,
		colorOf,
		opacity,
		outline
	};
	(0, import_react.useEffect)(() => {
		const wrap = wrapRef.current;
		const canvas = canvasRef.current;
		if (!wrap || !canvas) return;
		let map = null;
		let dead = false;
		const anchor = {
			nw: [meta.west, meta.north],
			se: [meta.east, meta.south]
		};
		const draw = () => {
			const current = mapRef.current;
			const cvs = canvasRef.current;
			const box = wrapRef.current;
			if (!current || !cvs || !box || !ready.current) {
				if (cvs) cvs.dataset.phase = `skip-${Boolean(current)}-${Boolean(box)}-${ready.current}`;
				return;
			}
			const { grid: cells, before: prior, colorOf: paint, opacity: alpha, meta: bounds } = state.current;
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
					const lon0 = bounds.west + c0 / bounds.width * (bounds.east - bounds.west);
					const lon1 = bounds.west + c1 / bounds.width * (bounds.east - bounds.west);
					const lat0 = bounds.north - r0 / bounds.height * (bounds.north - bounds.south);
					const lat1 = bounds.north - r1 / bounds.height * (bounds.north - bounds.south);
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
				for (const feature of line.features) trace(ctx, current, feature.geometry, dpr);
				ctx.stroke();
			}
			current.project(anchor.nw);
			current.project(anchor.se);
			anchor.nw = [meta.west, meta.north];
		};
		const follow = () => {
			const current = mapRef.current;
			const cvs = canvasRef.current;
			const box = wrapRef.current;
			if (!current || !cvs || !box) return;
			current.project([meta.west, meta.north]);
			current.project([meta.east, meta.south]);
			current.getBounds();
			const drawn = cvs.__b;
			if (!drawn) return;
			const fromNw = current.project([drawn.getWest(), drawn.getNorth()]);
			const fromSe = current.project([drawn.getEast(), drawn.getSouth()]);
			const sx = (fromSe.x - fromNw.x) / box.clientWidth;
			const sy = (fromSe.y - fromNw.y) / box.clientHeight;
			cvs.style.transformOrigin = "0 0";
			cvs.style.transform = `translate(${fromNw.x}px, ${fromNw.y}px) scale(${sx}, ${sy})`;
		};
		(async () => {
			const maplibregl = await import("../_libs/maplibre-gl.mjs").then((n) => n.t);
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
				style: styleFor(basemap)
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
				const b = view.getBounds();
				if (b && canvasRef.current) canvasRef.current.__b = b;
			};
			view.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
			if (view.loaded() || view.isStyleLoaded()) boot();
			else view.once("style.load", boot);
			view.on("error", (event) => {
				console.error("maplibre", event.error?.message ?? event.error);
			});
			view.on("move", follow);
			view.on("moveend", () => {
				const b = view.getBounds();
				if (b && canvasRef.current) canvasRef.current.__b = b;
				draw();
			});
			view.on("click", (event) => {
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
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		if (!map || !ready.current) return;
		const next = styleFor(basemap);
		map.setStyle(next);
		map.once("styledata", () => {
			const cvs = canvasRef.current;
			const b = map.getBounds();
			if (cvs) cvs.__b = b;
			map.fire("moveend");
		});
	}, [basemap]);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		const target = flyRef.current;
		if (!map || !target?.token) return;
		map.flyTo({
			center: [target.lng, target.lat],
			zoom: target.zoom,
			essential: true
		});
	}, [flyTo?.token]);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		if (!map || !ready.current) return;
		map.fire("moveend");
	}, [
		lutKey,
		grid,
		before,
		opacity,
		outline
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0",
		style: {
			position: "absolute",
			inset: 0
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: wrapRef,
				className: "h-full w-full",
				style: {
					position: "absolute",
					inset: 0
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "pointer-events-none",
				style: {
					position: "absolute",
					inset: 0,
					zIndex: 1
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute right-3 top-36 z-10 flex flex-col gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-pressed": "true",
						title: "拖去任何地方，放大縮細不受地點限制",
						onClick: () => {
							unlock(mapRef.current);
							freeRef.current?.();
						},
						className: "rounded-card bg-moss px-3 py-2 text-sm text-paper-2 shadow-sm",
						children: "自由 pan"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => mapRef.current?.zoomIn({ duration: 250 }),
						className: "rounded-card bg-paper-2/95 px-3 py-2 text-sm text-ink shadow-sm",
						children: "放大"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => mapRef.current?.zoomOut({ duration: 250 }),
						className: "rounded-card bg-paper-2/95 px-3 py-2 text-sm text-ink shadow-sm",
						children: "縮細"
					})
				]
			})
		]
	});
}
function unlock(map) {
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
function styleFor(basemap) {
	return {
		version: 8,
		sources: { base: {
			type: "raster",
			tiles: basemap === "sat" ? [SAT] : [STREET],
			tileSize: 256,
			attribution: basemap === "sat" ? "底圖 Esri、Maxar、Earthstar Geographics" : "© OpenStreetMap 貢獻者"
		} },
		layers: [{
			id: "base",
			type: "raster",
			source: "base"
		}]
	};
}
function clampCol(meta, lon) {
	const t = (lon - meta.west) / (meta.east - meta.west);
	return Math.max(0, Math.min(meta.width - 1, Math.floor(t * meta.width)));
}
function clampRow(meta, lat) {
	const t = (meta.north - lat) / (meta.north - meta.south);
	return Math.max(0, Math.min(meta.height - 1, Math.floor(t * meta.height)));
}
function paintCells(canvas, grid, before, gw, gh, c0, r0, c1, r1, dw, dh, colorOf) {
	canvas.width = dw;
	canvas.height = dh;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const img = ctx.createImageData(dw, dh);
	const data = img.data;
	const scaleX = (c1 - c0) / dw;
	const scaleY = (r1 - r0) / dh;
	for (let y = 0; y < dh; y++) {
		const rowOff = Math.min(gh - 1, r0 + Math.floor(y * scaleY)) * gw;
		const di = y * dw * 4;
		for (let x = 0; x < dw; x++) {
			const idx = rowOff + Math.min(gw - 1, c0 + Math.floor(x * scaleX));
			const color = colorOf(grid[idx] ?? 0, before ? before[idx] ?? 0 : 0);
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
function trace(ctx, map, geometry, dpr) {
	if (geometry.type === "Polygon") for (const ring of geometry.coordinates) strokeRing(ctx, map, ring, dpr);
	else if (geometry.type === "MultiPolygon") for (const poly of geometry.coordinates) for (const ring of poly) strokeRing(ctx, map, ring, dpr);
}
function strokeRing(ctx, map, ring, dpr) {
	if (ring.length < 2) return;
	const first = map.project([ring[0][0], ring[0][1]]);
	ctx.moveTo(first.x * dpr, first.y * dpr);
	for (let i = 1; i < ring.length; i++) {
		const p = map.project([ring[i][0], ring[i][1]]);
		ctx.lineTo(p.x * dpr, p.y * dpr);
	}
	ctx.closePath();
}
function describePick(meta, grid, before, lon, lat) {
	if (lon < meta.west || lon > meta.east || lat < meta.south || lat > meta.north) return null;
	const col = clampCol(meta, lon);
	const idx = clampRow(meta, lat) * meta.width + col;
	const cls = grid[idx] ?? 0;
	if (!cls) return {
		cls: 0,
		change: 0
	};
	const prev = before ? before[idx] ?? 0 : 0;
	return {
		cls,
		change: before ? changeCode(prev, cls) : 0
	};
}
var LOSS_SPLIT = [
	{
		id: 3,
		label: "變成人工林"
	},
	{
		id: 4,
		label: "變成林場"
	},
	{
		id: 5,
		label: "變成樹木作物"
	},
	{
		id: 6,
		label: "變成其他土地"
	}
];
function FortyApp() {
	const [meta, setMeta] = (0, import_react.useState)(null);
	const [outline, setOutline] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [mode, setMode] = (0, import_react.useState)("v1");
	const [year, setYear] = (0, import_react.useState)(2025);
	const [fromYear, setFromYear] = (0, import_react.useState)(2017);
	const [compare, setCompare] = (0, import_react.useState)(false);
	const [showStable, setShowStable] = (0, import_react.useState)(true);
	const [visible, setVisible] = (0, import_react.useState)({
		1: true,
		2: true,
		3: true,
		4: true,
		5: true,
		6: true
	});
	const [opacity, setOpacity] = (0, import_react.useState)(.86);
	const [basemap, setBasemap] = (0, import_react.useState)("sat");
	const [placeToken, setPlaceToken] = (0, import_react.useState)(0);
	const [place, setPlace] = (0, import_react.useState)(PLACES[0]);
	const [pinned, setPinned] = (0, import_react.useState)(null);
	const [grid, setGrid] = (0, import_react.useState)(null);
	const [before, setBefore] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [pick, setPick] = (0, import_react.useState)(null);
	const [changeStats, setChangeStats] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		Promise.all([loadMeta(), fetch("/forty/hk-outline.json").then((r) => r.json())]).then(([nextMeta, nextOutline]) => {
			if (cancel) return;
			setMeta(nextMeta);
			setOutline(nextOutline);
		}).catch(() => {
			if (!cancel) setError("地圖資料尚未就緒");
		});
		return () => {
			cancel = true;
		};
	}, []);
	const active = (0, import_react.useMemo)(() => {
		if (!meta) return null;
		if (mode === "v1") return meta.layers.find((layer) => layer.id === "v1-2020") ?? null;
		return meta.layers.find((layer) => layer.id === `v2-${year}`) ?? null;
	}, [
		meta,
		mode,
		year
	]);
	const fromLayer = (0, import_react.useMemo)(() => {
		if (!meta || mode !== "v2" || !compare) return null;
		return meta.layers.find((layer) => layer.id === `v2-${fromYear}`) ?? null;
	}, [
		meta,
		mode,
		compare,
		fromYear
	]);
	(0, import_react.useEffect)(() => {
		if (!meta || !active) return;
		let cancel = false;
		setLoading(true);
		const length = meta.width * meta.height;
		const jobs = [loadGrid(active.file, length)];
		if (fromLayer && fromLayer.id !== active.id) jobs.push(loadGrid(fromLayer.file, length));
		Promise.all(jobs).then(([next, prev]) => {
			if (cancel) return;
			setGrid(next ?? null);
			setBefore(fromLayer && fromLayer.id !== active.id ? prev ?? null : null);
			setLoading(false);
		}).catch(() => {
			if (!cancel) {
				setError("呢一年嘅圖載入失敗");
				setLoading(false);
			}
		});
		return () => {
			cancel = true;
		};
	}, [
		meta,
		active,
		fromLayer,
		active?.file
	]);
	(0, import_react.useEffect)(() => {
		if (!compare || !grid || !before || !meta) {
			setChangeStats(null);
			return;
		}
		const to = {
			3: 0,
			4: 0,
			5: 0,
			6: 0
		};
		let loss = 0;
		let gain = 0;
		let stable = 0;
		for (let i = 0; i < grid.length; i++) {
			const a = before[i] ?? 0;
			const b = grid[i] ?? 0;
			const code = changeCode(a, b);
			if (code === "loss") {
				loss += 1;
				if (b >= 3 && b <= 6) to[b] = (to[b] ?? 0) + 1;
			} else if (code === "gain") gain += 1;
			else if (code === "stable") stable += 1;
		}
		setChangeStats({
			loss,
			gain,
			stable,
			to
		});
	}, [
		compare,
		grid,
		before,
		meta
	]);
	const colorOf = (0, import_react.useCallback)((value, previous) => {
		if (!value) return null;
		if (compare && before) {
			const code = changeCode(previous, value);
			if (code === "loss") return [
				CHANGE_COLORS.loss[0],
				CHANGE_COLORS.loss[1],
				CHANGE_COLORS.loss[2],
				235
			];
			if (code === "gain") return [
				CHANGE_COLORS.gain[0],
				CHANGE_COLORS.gain[1],
				CHANGE_COLORS.gain[2],
				235
			];
			if (code === "stable" && showStable) return [
				CHANGE_COLORS.stable[0],
				CHANGE_COLORS.stable[1],
				CHANGE_COLORS.stable[2],
				150
			];
			return null;
		}
		if (value < 1 || value > 6 || !visible[value]) return null;
		const rgb = CLASSES[value - 1].rgb;
		return [
			rgb[0],
			rgb[1],
			rgb[2],
			255
		];
	}, [
		compare,
		before,
		showStable,
		visible
	]);
	const lutKey = `${active?.id ?? ""}-${fromLayer?.id ?? ""}-${compare}-${showStable}-${CLASSES.map((item) => visible[item.id]).join("")}`;
	const onPick = (0, import_react.useCallback)((lng, lat) => {
		if (!meta || !grid) return;
		const found = describePick(meta, grid, compare ? before : null, lng, lat);
		if (!found || !found.cls) {
			setPick(null);
			return;
		}
		setPick({
			lng,
			lat,
			cls: found.cls
		});
	}, [
		meta,
		grid,
		before,
		compare
	]);
	if (error && !meta) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "flex min-h-dvh items-center justify-center bg-paper px-6 text-ink",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error })
	});
	if (!meta || !active) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper px-6 text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-lg font-medium",
			children: "ForTy 香港"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "正在打開十公尺森林類型地圖"
		})]
	});
	const forestHa = sumHa(active, [
		1,
		2,
		3,
		4,
		5
	]);
	const naturalHa = sumHa(active, [1, 2]);
	const landHa = sumHa(active, [
		1,
		2,
		3,
		4,
		5,
		6
	]);
	const maxHa = Math.max(...active.hectares.slice(1), 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col bg-paper text-ink md:flex-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative min-h-[46dvh] flex-1 md:order-2 md:min-h-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapStage, {
					meta,
					grid,
					before: compare ? before : null,
					lutKey,
					colorOf,
					opacity,
					basemap,
					outline,
					flyTo: {
						lng: place.lng,
						lat: place.lat,
						zoom: place.zoom,
						token: placeToken
					},
					onPick,
					onFreePan: () => setPinned(null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto max-w-[70%] rounded-card bg-paper-2/95 px-3 py-2 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs tracking-wide text-muted",
								children: "DeepMind ForTy · 10 公尺"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-base font-medium leading-tight",
								children: "香港森林類型"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto flex shrink-0 gap-1 rounded-card bg-paper-2/95 p-1 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": basemap === "sat",
								onClick: () => setBasemap("sat"),
								className: `flex size-11 items-center justify-center rounded-lg ${basemap === "sat" ? "bg-moss text-paper-2" : "text-ink"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Satellite, {
									className: "size-5",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: "衛星"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": basemap === "street",
								onClick: () => setBasemap("street"),
								className: `flex size-11 items-center justify-center rounded-lg ${basemap === "street" ? "bg-moss text-paper-2" : "text-ink"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map, {
									className: "size-5",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: "街道"
								})]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-auto flex gap-2 overflow-x-auto pb-1",
						children: PLACES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setPlace(item);
								setPinned(item.id);
								setPlaceToken((n) => n + 1);
							},
							className: `shrink-0 rounded-full px-3 py-2 text-sm ${pinned === item.id ? "bg-moss text-paper-2" : "bg-paper-2/95 text-ink"}`,
							children: item.label
						}, item.id))
					})]
				}),
				pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute bottom-3 left-3 max-w-[16rem] rounded-card bg-paper-2/95 px-3 py-2 text-sm shadow-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: CLASSES[pick.cls - 1]?.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted",
							children: CLASSES[pick.cls - 1]?.hint
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "num text-xs text-muted",
							children: [
								pick.lat.toFixed(4),
								"°N ",
								pick.lng.toFixed(4),
								"°E"
							]
						})
					]
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs text-paper",
					children: error
				}) : loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs text-paper",
					children: "載入圖層"
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
			className: "min-h-0 max-h-[48dvh] overflow-y-auto border-t border-line bg-paper-2 md:order-1 md:h-dvh md:max-h-none md:w-96 md:shrink-0 md:border-t-0 md:border-r",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": mode === "v1",
							onClick: () => {
								setMode("v1");
								setCompare(false);
							},
							className: `rounded-card px-3 py-3 text-left ${mode === "v1" ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm font-medium",
								children: "2020 正式地圖"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `block text-xs ${mode === "v1" ? "text-paper" : "text-muted"}`,
								children: "歐盟毀林法規基準"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": mode === "v2",
							onClick: () => setMode("v2"),
							className: `rounded-card px-3 py-3 text-left ${mode === "v2" ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm font-medium",
								children: "逐年 2017–2025"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `block text-xs ${mode === "v2" ? "text-paper" : "text-muted"}`,
								children: "早期模型，可對比變化"
							})]
						})]
					}),
					mode === "v2" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-baseline justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "年份" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "num font-medium",
								children: year
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 2017,
							max: 2025,
							step: 1,
							value: year,
							onChange: (event) => {
								const next = Number(event.target.value);
								setYear(next);
								if (fromYear === next) setFromYear(next === 2017 ? 2018 : next - 1);
							}
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: mode === "v1" ? "正式分類 v1" : `早期時間序列 v2 · ${year}`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								const forestOn = visible[6];
								setVisible({
									1: true,
									2: true,
									3: true,
									4: true,
									5: true,
									6: !forestOn
								});
							},
							className: "rounded-full bg-canopy px-3 py-2 text-sm text-moss",
							children: visible[6] ? "只看林地" : "顯示全部"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-1",
						children: CLASSES.map((item) => {
							const ha = active.hectares[item.id] ?? 0;
							const on = visible[item.id];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": on,
								onClick: () => setVisible((curr) => ({
									...curr,
									[item.id]: !curr[item.id]
								})),
								className: `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${on ? "bg-paper" : "bg-paper/40"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "size-4 shrink-0 rounded-sm border border-line",
										style: { background: on ? item.color : "transparent" }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-baseline justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-medium",
												children: item.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "num text-xs text-muted",
												children: formatHa(ha)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-1 block h-1.5 overflow-hidden rounded-full bg-line",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block h-full",
												style: {
													width: `${ha / maxHa * 100}%`,
													background: item.color,
													opacity: on ? 1 : .25
												}
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex shrink-0 flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, { on }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted",
											children: on ? "開" : "關"
										})]
									})
								]
							}) }, item.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "grid grid-cols-3 gap-2 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "有林",
								value: formatHa(forestHa)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "天然林",
								value: formatHa(naturalHa)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "陸地",
								value: formatHa(landHa)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "透明度" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "num text-muted",
								children: [Math.round(opacity * 100), "%"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: .25,
							max: 1,
							step: .01,
							value: opacity,
							onChange: (event) => setOpacity(Number(event.target.value))
						})]
					}),
					mode === "v2" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-3 rounded-card bg-paper p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "flex items-center gap-2 text-sm font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
									className: "size-4 text-moss",
									"aria-hidden": "true"
								}), "天然林點變"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": compare,
								onClick: () => setCompare((v) => !v),
								className: `rounded-full px-3 py-2 text-sm ${compare ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`,
								children: compare ? "開" : "關"
							})]
						}), compare ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center justify-between gap-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "由" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: fromYear,
										onChange: (event) => setFromYear(Number(event.target.value)),
										className: "rounded-lg border border-line bg-paper-2 px-2 py-2",
										children: Array.from({ length: 9 }, (_, i) => 2017 + i).filter((value) => value !== year).map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value,
											children: value
										}, value))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["到 ", year] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": showStable,
								onClick: () => setShowStable((v) => !v),
								className: "text-left text-sm text-moss",
								children: showStable ? "隱藏仍然係天然林" : "顯示仍然係天然林"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-1 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendDot, {
										color: "#B03A2E",
										label: "天然林流失",
										value: pixelsToHa(changeStats?.loss, meta)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendDot, {
										color: "#0E7490",
										label: "天然林增加",
										value: pixelsToHa(changeStats?.gain, meta)
									}),
									LOSS_SPLIT.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "flex justify-between pl-5 text-xs text-muted",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "num",
											children: pixelsToHa(changeStats?.to[item.id], meta)
										})]
									}, item.id))
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs leading-relaxed text-muted",
								children: "天然林指原始林同自然再生林。年份之間用同一個早期模型，先至好比較。唔好直接同 2020 正式地圖相減。"
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs leading-relaxed text-muted",
							children: "打開之後，地圖會標出天然林變成林場、農地或其他土地，以及新長返嚟嘅天然林。"
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "rounded-card bg-paper p-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
							className: "flex cursor-pointer list-none items-center gap-2 font-medium",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {
								className: "size-4 text-moss",
								"aria-hidden": "true"
							}), "點讀呢張圖"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-col gap-3 leading-relaxed text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Google DeepMind、Google Research、WRI 同 IIASA 嘅 ForTy，將每塊 10×10 公尺土地分成六類。訓練大約 170 萬個標註點，再用 9,000 多個隨機點驗證：森林類型約 90%，分森林同非森林約 95%。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "2020 正式地圖係歐盟毀林法規嘅基準年。逐年圖係提早公開嘅 v2 模型，用嚟睇天然林有冇被林場或農地取代；佢同正式地圖唔係同一條模型。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "香港山坡多數會落入自然再生林，而唔係原始林。市區樹木、細樹林同低過森林門檻嘅綠地，模型會放入「其他土地」。呢個係全球模型，未係香港實地審核。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "範圍用香港區議會陸地界線裁走深圳。面積係 10 公尺像素大約數，單位公頃。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"資料來自公開 Cloud Optimized GeoTIFF（Nature Trace / Google Cloud），唔使 Earth Engine 帳戶。全球互動圖可以去",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										className: "text-moss underline",
										href: "https://nature-trace.projects.earthengine.app/view/forest-typology-2020",
										children: "2020 檢視器"
									}),
									" ",
									"同",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										className: "text-moss underline",
										href: "https://nature-trace.projects.earthengine.app/view/forest-typology",
										children: "逐年檢視器"
									}),
									"。"
								] })
							]
						})]
					})
				]
			})
		})]
	});
}
function Switch({ on }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `relative inline-flex h-7 w-12 shrink-0 items-center rounded-full ${on ? "bg-moss" : "bg-line"}`,
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-block size-5 rounded-full bg-paper-2 shadow-sm ${on ? "translate-x-6" : "translate-x-1"}` })
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-paper px-2 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "num text-sm font-medium",
			children: value
		})]
	});
}
function LegendDot({ color, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "flex items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "size-3 rounded-sm",
				style: { background: color }
			}), label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "num",
			children: value
		})]
	});
}
function sumHa(layer, ids) {
	return ids.reduce((sum, id) => sum + (layer.hectares[id] ?? 0), 0);
}
function formatHa(value) {
	return `${Math.round(value).toLocaleString("zh-HK")} 公頃`;
}
function pixelsToHa(count, meta) {
	if (count == null) return "計算中";
	return formatHa(count * meta.pixelHectares);
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FortyApp, {});
}
//#endregion
export { Home as component };
