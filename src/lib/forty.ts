export type LayerMeta = {
  id: string;
  kind: "v1" | "v2";
  year: number;
  file: string;
  counts: number[];
  hectares: number[];
};

export type FortyMeta = {
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
  pixelMetres: [number, number];
  pixelHectares: number;
  layers: LayerMeta[];
};

export type ClassId = 1 | 2 | 3 | 4 | 5 | 6;

export const CLASSES: {
  id: ClassId;
  name: string;
  en: string;
  hint: string;
  color: string;
  rgb: [number, number, number];
}[] = [
  {
    id: 1,
    name: "原始林",
    en: "Primary",
    hint: "原生樹種，睇唔到明顯人為干擾",
    color: "#1B7837",
    rgb: [27, 120, 55],
  },
  {
    id: 2,
    name: "自然再生林",
    en: "Naturally regenerating",
    hint: "自己生返嘅次生林，香港山坡最常見",
    color: "#7FBF7B",
    rgb: [127, 191, 123],
  },
  {
    id: 3,
    name: "人工林",
    en: "Planted",
    hint: "人種植或播種，長周期管理",
    color: "#1D91C0",
    rgb: [29, 145, 192],
  },
  {
    id: 4,
    name: "單一作物林場",
    en: "Plantation",
    hint: "速生、集約、往往單一樹種",
    color: "#E65FA9",
    rgb: [230, 95, 169],
  },
  {
    id: 5,
    name: "樹木作物／農林",
    en: "Tree crops",
    hint: "油棕、橡膠、可可、果樹等",
    color: "#E6AB02",
    rgb: [230, 171, 2],
  },
  {
    id: 6,
    name: "其他土地",
    en: "Other land",
    hint: "草地、農田、城市、水面；市區樹木多數歸呢類",
    color: "#FDE278",
    rgb: [253, 226, 120],
  },
];

export const PLACES = [
  { id: "all", label: "全港", lng: 114.16, lat: 22.34, zoom: 10.15 },
  { id: "island", label: "香港島", lng: 114.175, lat: 22.255, zoom: 12.15 },
  { id: "taitam", label: "大潭", lng: 114.22, lat: 22.248, zoom: 13.5 },
  { id: "peak", label: "太平山", lng: 114.149, lat: 22.271, zoom: 13.7 },
  { id: "kowloon", label: "九龍", lng: 114.175, lat: 22.328, zoom: 12.5 },
  { id: "lion", label: "獅子山", lng: 114.185, lat: 22.355, zoom: 13.4 },
  { id: "taimo", label: "大帽山", lng: 114.124, lat: 22.411, zoom: 13.15 },
  { id: "taipo", label: "大埔滘", lng: 114.178, lat: 22.43, zoom: 13.35 },
  { id: "plover", label: "船灣", lng: 114.265, lat: 22.478, zoom: 12.35 },
  { id: "saikung", label: "西貢", lng: 114.36, lat: 22.4, zoom: 11.7 },
  { id: "longvalley", label: "塱原", lng: 114.113, lat: 22.507, zoom: 14.15 },
  { id: "maipo", label: "米埔", lng: 114.038, lat: 22.492, zoom: 13.2 },
  { id: "lantau", label: "大嶼山", lng: 113.95, lat: 22.26, zoom: 11.35 },
  { id: "taiO", label: "大澳", lng: 113.862, lat: 22.248, zoom: 13.4 },
] as const;

export async function loadMeta(): Promise<FortyMeta> {
  const res = await fetch("/forty/meta.json", { cache: "no-store" });
  if (!res.ok) throw new Error("讀唔到地圖資料");
  return res.json() as Promise<FortyMeta>;
}

export async function loadGrid(file: string, length: number): Promise<Uint8Array> {
  const res = await fetch(`/forty/${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error("地圖載入失敗");
  const buf = new Uint8Array(await res.arrayBuffer());
  // .gz used to be served with Content-Encoding: gzip, so the browser unzipped
  // it before we could. Accept either the raw grid or a still-gzipped payload.
  const zipped = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const grid = zipped
    ? new Uint8Array(
        await new Response(
          new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")),
        ).arrayBuffer(),
      )
    : buf;
  if (grid.length !== length) throw new Error("地圖大小唔吻合");
  return grid;
}

export function layerById(meta: FortyMeta, id: string): LayerMeta {
  const layer = meta.layers.find((item) => item.id === id);
  if (!layer) throw new Error(`找不到圖層 ${id}`);
  return layer;
}

export type ChangeKey = "loss" | "gain" | "stable";

export const CHANGE_COLORS: Record<ChangeKey, [number, number, number]> = {
  loss: [176, 58, 46],
  gain: [14, 116, 144],
  stable: [27, 120, 55],
};

/** Natural forest (1–2) that became something else, or the reverse. 0 = hide. */
export function changeCode(before: number, after: number): ChangeKey | 0 {
  if (!before || !after) return 0;
  const wasNatural = before === 1 || before === 2;
  const isNatural = after === 1 || after === 2;
  if (wasNatural && !isNatural) return "loss";
  if (!wasNatural && isNatural) return "gain";
  if (wasNatural && isNatural) return "stable";
  return 0;
}
