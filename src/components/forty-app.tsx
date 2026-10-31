import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Layers3, Satellite, Map as MapIcon } from "lucide-react";
import {
  CHANGE_COLORS,
  CLASSES,
  PLACES,
  changeCode,
  type ClassId,
  type FortyMeta,
  type LayerMeta,
  loadGrid,
  loadMeta,
} from "@/lib/forty";
import { MapStage, describePick, type Outline } from "@/components/map-stage";

type Mode = "v1" | "v2";
type Basemap = "sat" | "street";
type Rgba = [number, number, number, number];

const LOSS_SPLIT: { id: ClassId; label: string }[] = [
  { id: 3, label: "變成人工林" },
  { id: 4, label: "變成林場" },
  { id: 5, label: "變成樹木作物" },
  { id: 6, label: "變成其他土地" },
];

export function FortyApp() {
  const [meta, setMeta] = useState<FortyMeta | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("v1");
  const [year, setYear] = useState(2025);
  const [fromYear, setFromYear] = useState(2017);
  const [compare, setCompare] = useState(false);
  const [showStable, setShowStable] = useState(true);
  const [visible, setVisible] = useState<Record<ClassId, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });
  const [opacity, setOpacity] = useState(0.86);
  const [basemap, setBasemap] = useState<Basemap>("sat");
  const [placeToken, setPlaceToken] = useState(0);
  const [place, setPlace] = useState<(typeof PLACES)[number]>(PLACES[0]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [grid, setGrid] = useState<Uint8Array | null>(null);
  const [before, setBefore] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<{ lng: number; lat: number; cls: number } | null>(null);
  const [changeStats, setChangeStats] = useState<{
    loss: number;
    gain: number;
    stable: number;
    to: Record<number, number>;
  } | null>(null);

  useEffect(() => {
    let cancel = false;
    Promise.all([loadMeta(), fetch("/forty/hk-outline.json").then((r) => r.json())])
      .then(([nextMeta, nextOutline]) => {
        if (cancel) return;
        setMeta(nextMeta);
        setOutline(nextOutline as Outline);
      })
      .catch(() => {
        if (!cancel) setError("地圖資料尚未就緒");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const active = useMemo(() => {
    if (!meta) return null;
    if (mode === "v1") return meta.layers.find((layer) => layer.id === "v1-2020") ?? null;
    return meta.layers.find((layer) => layer.id === `v2-${year}`) ?? null;
  }, [meta, mode, year]);

  const fromLayer = useMemo(() => {
    if (!meta || mode !== "v2" || !compare) return null;
    return meta.layers.find((layer) => layer.id === `v2-${fromYear}`) ?? null;
  }, [meta, mode, compare, fromYear]);

  useEffect(() => {
    if (!meta || !active) return;
    let cancel = false;
    setLoading(true);
    const length = meta.width * meta.height;
    const jobs: Promise<Uint8Array | null>[] = [loadGrid(active.file, length)];
    if (fromLayer && fromLayer.id !== active.id) jobs.push(loadGrid(fromLayer.file, length));
    Promise.all(jobs)
      .then(([next, prev]) => {
        if (cancel) return;
        setGrid(next ?? null);
        setBefore(fromLayer && fromLayer.id !== active.id ? (prev ?? null) : null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancel) {
          setError("呢一年嘅圖載入失敗");
          setLoading(false);
        }
      });
    return () => {
      cancel = true;
    };
  }, [meta, active, fromLayer, active?.file]);

  useEffect(() => {
    if (!compare || !grid || !before || !meta) {
      setChangeStats(null);
      return;
    }
    const to: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
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
    setChangeStats({ loss, gain, stable, to });
  }, [compare, grid, before, meta]);

  const colorOf = useCallback(
    (value: number, previous: number): Rgba | null => {
      if (!value) return null;
      if (compare && before) {
        const code = changeCode(previous, value);
        if (code === "loss") return [CHANGE_COLORS.loss[0], CHANGE_COLORS.loss[1], CHANGE_COLORS.loss[2], 235];
        if (code === "gain") return [CHANGE_COLORS.gain[0], CHANGE_COLORS.gain[1], CHANGE_COLORS.gain[2], 235];
        if (code === "stable" && showStable)
          return [CHANGE_COLORS.stable[0], CHANGE_COLORS.stable[1], CHANGE_COLORS.stable[2], 150];
        return null;
      }
      if (value < 1 || value > 6 || !visible[value as ClassId]) return null;
      const rgb = CLASSES[value - 1].rgb;
      return [rgb[0], rgb[1], rgb[2], 255];
    },
    [compare, before, showStable, visible],
  );

  const lutKey = `${active?.id ?? ""}-${fromLayer?.id ?? ""}-${compare}-${showStable}-${CLASSES.map((item) => visible[item.id]).join("")}`;

  const onPick = useCallback(
    (lng: number, lat: number) => {
      if (!meta || !grid) return;
      const found = describePick(meta, grid, compare ? before : null, lng, lat);
      if (!found || !found.cls) {
        setPick(null);
        return;
      }
      setPick({ lng, lat, cls: found.cls });
    },
    [meta, grid, before, compare],
  );

  if (error && !meta) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper px-6 text-ink">
        <p>{error}</p>
      </main>
    );
  }

  if (!meta || !active) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper px-6 text-ink">
        <p className="text-lg font-medium">ForTy 香港</p>
        <p className="text-sm text-muted">正在打開十公尺森林類型地圖</p>
      </main>
    );
  }

  const forestHa = sumHa(active, [1, 2, 3, 4, 5]);
  const naturalHa = sumHa(active, [1, 2]);
  const landHa = sumHa(active, [1, 2, 3, 4, 5, 6]);
  const maxHa = Math.max(...active.hectares.slice(1), 1);

  return (
    <main className="flex h-dvh flex-col bg-paper text-ink md:flex-row">
      <section className="relative min-h-[46dvh] flex-1 md:order-2 md:min-h-0">
        <MapStage
          meta={meta}
          grid={grid}
          before={compare ? before : null}
          lutKey={lutKey}
          colorOf={colorOf}
          opacity={opacity}
          basemap={basemap}
          outline={outline}
          flyTo={{ lng: place.lng, lat: place.lat, zoom: place.zoom, token: placeToken }}
          onPick={onPick}
          onFreePan={() => setPinned(null)}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto max-w-[70%] rounded-card bg-paper-2/95 px-3 py-2 shadow-sm">
              <p className="text-xs tracking-wide text-muted">DeepMind ForTy · 10 公尺</p>
              <h1 className="text-base font-medium leading-tight">香港森林類型</h1>
            </div>
            <div className="pointer-events-auto flex shrink-0 gap-1 rounded-card bg-paper-2/95 p-1 shadow-sm">
              <button
                type="button"
                aria-pressed={basemap === "sat"}
                onClick={() => setBasemap("sat")}
                className={`flex size-11 items-center justify-center rounded-lg ${basemap === "sat" ? "bg-moss text-paper-2" : "text-ink"}`}
              >
                <Satellite className="size-5" aria-hidden="true" />
                <span className="sr-only">衛星</span>
              </button>
              <button
                type="button"
                aria-pressed={basemap === "street"}
                onClick={() => setBasemap("street")}
                className={`flex size-11 items-center justify-center rounded-lg ${basemap === "street" ? "bg-moss text-paper-2" : "text-ink"}`}
              >
                <MapIcon className="size-5" aria-hidden="true" />
                <span className="sr-only">街道</span>
              </button>
            </div>
          </div>
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
            {PLACES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPlace(item);
                  setPinned(item.id);
                  setPlaceToken((n) => n + 1);
                }}
                className={`shrink-0 rounded-full px-3 py-2 text-sm ${pinned === item.id ? "bg-moss text-paper-2" : "bg-paper-2/95 text-ink"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {pick ? (
          <div className="pointer-events-none absolute bottom-14 left-3 z-30 max-w-xs rounded-card bg-paper-2 px-3 py-2 text-sm leading-relaxed shadow-sm">
            <p className="font-medium">{CLASSES[pick.cls - 1]?.name}</p>
            <p className="text-muted">{CLASSES[pick.cls - 1]?.hint}</p>
            <p className="num text-xs text-muted">
              {pick.lat.toFixed(4)}°N {pick.lng.toFixed(4)}°E
            </p>
          </div>
        ) : null}
        {error ? (
          <p className="absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs text-paper">{error}</p>
        ) : loading ? (
          <p className="absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs text-paper">
            載入圖層
          </p>
        ) : null}
      </section>

      <aside className="min-h-0 max-h-[48dvh] overflow-y-auto border-t border-line bg-paper-2 md:order-1 md:h-dvh md:max-h-none md:w-96 md:shrink-0 md:border-t-0 md:border-r">
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={mode === "v1"}
              onClick={() => {
                setMode("v1");
                setCompare(false);
              }}
              className={`rounded-card px-3 py-3 text-left ${mode === "v1" ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`}
            >
              <span className="block text-sm font-medium">2020 正式地圖</span>
              <span className={`block text-xs ${mode === "v1" ? "text-paper" : "text-muted"}`}>
                歐盟毀林法規基準
              </span>
            </button>
            <button
              type="button"
              aria-pressed={mode === "v2"}
              onClick={() => setMode("v2")}
              className={`rounded-card px-3 py-3 text-left ${mode === "v2" ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`}
            >
              <span className="block text-sm font-medium">逐年 2017–2025</span>
              <span className={`block text-xs ${mode === "v2" ? "text-paper" : "text-muted"}`}>
                早期模型，可對比變化
              </span>
            </button>
          </div>

          {mode === "v2" ? (
            <label className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between text-sm">
                <span>年份</span>
                <span className="num font-medium">{year}</span>
              </span>
              <input
                type="range"
                min={2017}
                max={2025}
                step={1}
                value={year}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setYear(next);
                  if (fromYear === next) setFromYear(next === 2017 ? 2018 : next - 1);
                }}
              />
            </label>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {mode === "v1" ? "正式分類 v1" : `早期時間序列 v2 · ${year}`}
            </p>
            <button
              type="button"
              onClick={() => {
                const forestOn = visible[6];
                setVisible({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: !forestOn });
              }}
              className="rounded-full bg-canopy px-3 py-2 text-sm text-moss"
            >
              {visible[6] ? "只看林地" : "顯示全部"}
            </button>
          </div>

          <ul className="flex flex-col gap-1">
            {CLASSES.map((item) => {
              const ha = active.hectares[item.id] ?? 0;
              const on = visible[item.id];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setVisible((curr) => ({ ...curr, [item.id]: !curr[item.id] }))}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${on ? "bg-paper" : "bg-paper/40"}`}
                  >
                    <span
                      className="size-4 shrink-0 rounded-sm border border-line"
                      style={{ background: on ? item.color : "transparent" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="num text-xs text-muted">{formatHa(ha)}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
                        <span
                          className="block h-full"
                          style={{
                            width: `${(ha / maxHa) * 100}%`,
                            background: item.color,
                            opacity: on ? 1 : 0.25,
                          }}
                        />
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-center gap-0.5">
                      <Switch on={on} />
                      <span className="text-xs text-muted">{on ? "開" : "關"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="有林" value={formatHa(forestHa)} />
            <Stat label="天然林" value={formatHa(naturalHa)} />
            <Stat label="陸地" value={formatHa(landHa)} />
          </dl>

          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-sm">
              <span>透明度</span>
              <span className="num text-muted">{Math.round(opacity * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.25}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>

          {mode === "v2" ? (
            <div className="flex flex-col gap-3 rounded-card bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Layers3 className="size-4 text-moss" aria-hidden="true" />
                  天然林點變
                </p>
                <button
                  type="button"
                  aria-pressed={compare}
                  onClick={() => setCompare((v) => !v)}
                  className={`rounded-full px-3 py-2 text-sm ${compare ? "bg-moss text-paper-2" : "bg-canopy text-ink"}`}
                >
                  {compare ? "開" : "關"}
                </button>
              </div>
              {compare ? (
                <>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>由</span>
                    <select
                      value={fromYear}
                      onChange={(event) => setFromYear(Number(event.target.value))}
                      className="rounded-lg border border-line bg-paper-2 px-2 py-2"
                    >
                      {Array.from({ length: 9 }, (_, i) => 2017 + i)
                        .filter((value) => value !== year)
                        .map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                    </select>
                    <span>到 {year}</span>
                  </label>
                  <button
                    type="button"
                    aria-pressed={showStable}
                    onClick={() => setShowStable((v) => !v)}
                    className="text-left text-sm text-moss"
                  >
                    {showStable ? "隱藏仍然係天然林" : "顯示仍然係天然林"}
                  </button>
                  <div className="flex flex-col gap-1 text-sm">
                    <LegendDot color="#B03A2E" label="天然林流失" value={pixelsToHa(changeStats?.loss, meta)} />
                    <LegendDot color="#0E7490" label="天然林增加" value={pixelsToHa(changeStats?.gain, meta)} />
                    {LOSS_SPLIT.map((item) => (
                      <p key={item.id} className="flex justify-between pl-5 text-xs text-muted">
                        <span>{item.label}</span>
                        <span className="num">{pixelsToHa(changeStats?.to[item.id], meta)}</span>
                      </p>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-muted">
                    天然林指原始林同自然再生林。年份之間用同一個早期模型，先至好比較。唔好直接同 2020 正式地圖相減。
                  </p>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  打開之後，地圖會標出天然林變成林場、農地或其他土地，以及新長返嚟嘅天然林。
                </p>
              )}
            </div>
          ) : null}

          <details className="rounded-card bg-paper p-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
              <Info className="size-4 text-moss" aria-hidden="true" />
              點讀呢張圖
            </summary>
            <div className="mt-3 flex flex-col gap-3 leading-relaxed text-muted">
              <p>
                Google DeepMind、Google Research、WRI 同 IIASA 嘅 ForTy，將每塊 10×10
                公尺土地分成六類。訓練大約 170 萬個標註點，再用 9,000
                多個隨機點驗證：森林類型約 90%，分森林同非森林約 95%。
              </p>
              <p>
                2020 正式地圖係歐盟毀林法規嘅基準年。逐年圖係提早公開嘅 v2
                模型，用嚟睇天然林有冇被林場或農地取代；佢同正式地圖唔係同一條模型。
              </p>
              <p>
                香港山坡多數會落入自然再生林，而唔係原始林。市區樹木、細樹林同低過森林門檻嘅綠地，模型會放入「其他土地」。呢個係全球模型，未係香港實地審核。
              </p>
              <p>
                範圍用香港區議會陸地界線裁走深圳。面積係 10 公尺像素大約數，單位公頃。
              </p>
              <p>
                資料來自公開 Cloud Optimized GeoTIFF（Nature Trace / Google Cloud），唔使 Earth Engine
                帳戶。全球互動圖可以去{" "}
                <a className="text-moss underline" href="https://nature-trace.projects.earthengine.app/view/forest-typology-2020">
                  2020 檢視器
                </a>
                {" "}同{" "}
                <a className="text-moss underline" href="https://nature-trace.projects.earthengine.app/view/forest-typology">
                  逐年檢視器
                </a>
                。
              </p>
            </div>
          </details>
        </div>
      </aside>
    </main>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full ${on ? "bg-moss" : "bg-line"}`}
      aria-hidden="true"
    >
      <span
        className={`inline-block size-5 rounded-full bg-paper-2 shadow-sm ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper px-2 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num text-sm font-medium">{value}</dd>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="num">{value}</span>
    </p>
  );
}

function sumHa(layer: LayerMeta, ids: number[]) {
  return ids.reduce((sum, id) => sum + (layer.hectares[id] ?? 0), 0);
}

function formatHa(value: number) {
  return `${Math.round(value).toLocaleString("zh-HK")} 公頃`;
}

function pixelsToHa(count: number | undefined, meta: FortyMeta) {
  if (count == null) return "計算中";
  return formatHa(count * meta.pixelHectares);
}
