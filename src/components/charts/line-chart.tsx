"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtYmd, fmtYmdShort } from "@/lib/format";

export type LinePoint = { x: string; y: number | null };

/*
 * Format dikirim sebagai nama preset, bukan fungsi: komponen ini client
 * component, dan fungsi tidak bisa diserialisasi dari server component.
 */
export type YFormat = "int" | "pct";
export type XFormat = "ymd" | "datetime";

const Y_FULL: Record<YFormat, (v: number) => string> = { int: (v) => fmtInt(v), pct: (v) => fmtPct(v) };
const Y_TICK: Record<YFormat, (v: number) => string> = { int: (v) => fmtCompact(v), pct: (v) => fmtPct(v, 1) };
const X_SHORT: Record<XFormat, (x: string) => string> = {
  ymd: fmtYmdShort,
  datetime: (x) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(x)),
};
const X_LONG: Record<XFormat, (x: string) => string> = { ymd: fmtYmd, datetime: fmtDateTime };

type Props = {
  points: LinePoint[];
  /** Nama seri untuk tooltip & tabel, mis. "Views". */
  seriesLabel: string;
  yFormat?: YFormat;
  xFormat?: XFormat;
  height?: number;
  className?: string;
  /** Kolom header x di tabel alternatif. */
  xLabel?: string;
};

const PAD = { top: 12, right: 16, bottom: 28, left: 56 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/**
 * Line chart satu seri (dataviz): garis 2px, area wash 10%, grid hairline,
 * crosshair + tooltip saat hover/fokus keyboard, titik akhir ≥ 8px dengan
 * cincin 2px warna permukaan. Nilai null memutus garis (tidak diisi nol).
 * Setiap chart punya tabel alternatif sehingga tooltip tidak jadi satu-satunya
 * jalan membaca angka.
 */
export function LineChart({
  points,
  seriesLabel,
  yFormat = "int",
  xFormat = "ymd",
  height = 240,
  className,
  xLabel = "Tanggal",
}: Props) {
  const formatY = Y_FULL[yFormat];
  const formatYTick = Y_TICK[yFormat];
  const formatX = X_SHORT[xFormat];
  const formatXLong = X_LONG[xFormat];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = points.map((p) => p.y).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const minRaw = hasData ? Math.min(0, ...values) : 0;
  const maxRaw = hasData ? Math.max(...values) : 1;
  const yMax = niceMax(maxRaw);
  const yMin = minRaw < 0 ? -niceMax(-minRaw) : 0;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const n = points.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const { linePath, areaPath } = useMemo(() => {
    let line = "";
    let area = "";
    let segment: [number, number][] = [];
    const flush = () => {
      if (segment.length === 0) return;
      line += segment.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("");
      const base = yAt(Math.max(0, yMin));
      area +=
        `M${segment[0][0]},${base}` +
        segment.map(([x, y]) => `L${x},${y}`).join("") +
        `L${segment[segment.length - 1][0]},${base}Z`;
      segment = [];
    };
    points.forEach((p, i) => {
      if (p.y === null) flush();
      else segment.push([xAt(i), yAt(p.y)]);
    });
    flush();
    return { linePath: line, areaPath: area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, yMax, yMin, height]);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + (yMax - yMin) * t);
  // Jarak minimum antar label sumbu x. Label pertama rata kiri (melebar ke kanan),
  // jadi butuh ±1,5 kali lebar label supaya tidak bertumpuk dengan label berikutnya.
  const labelPx = xFormat === "datetime" ? 104 : 56;
  const xTickEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / (labelPx * 1.5 + 12)))));
  const lastIdx = [...points].reverse().findIndex((p) => p.y !== null);
  const endIdx = lastIdx === -1 ? -1 : n - 1 - lastIdx;
  const loneIdx = points
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.y !== null && (points[i - 1]?.y ?? null) === null && (points[i + 1]?.y ?? null) === null)
    .map(({ i }) => i);

  function indexFromClientX(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const x = clientX - rect.left - PAD.left;
    return Math.min(n - 1, Math.max(0, Math.round((x / (innerW || 1)) * (n - 1))));
  }

  function onKey(e: React.KeyboardEvent) {
    if (n === 0) return;
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const activePoint = active !== null ? points[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(xAt(active), 80), Math.max(80, width - 80)) : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={wrapRef}
        className="relative w-full outline-hidden focus-visible:ring-1 focus-visible:ring-ring rounded-md"
        style={{ height }}
        tabIndex={hasData ? 0 : -1}
        role="group"
        aria-label={`Grafik ${seriesLabel}. Gunakan panah kiri dan kanan untuk membaca nilai per titik.`}
        onKeyDown={onKey}
        onPointerMove={(e) => setActive(indexFromClientX(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.12} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={yAt(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-caption tabular-nums"
                >
                  {formatYTick(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              i === n - 1 || (i % xTickEvery === 0 && n - 1 - i >= xTickEvery * 0.9) ? (
                <text
                  key={p.x}
                  x={xAt(i)}
                  y={height - 8}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  className="fill-muted-foreground text-caption tabular-nums"
                >
                  {formatX(p.x)}
                </text>
              ) : null
            )}
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {loneIdx.map((i) => (
              <circle key={`lone-${i}`} cx={xAt(i)} cy={yAt(points[i].y as number)} r={3} fill="hsl(var(--chart-1))" />
            ))}
            {endIdx >= 0 && active === null ? (
              <circle
                cx={xAt(endIdx)}
                cy={yAt(points[endIdx].y as number)}
                r={4}
                fill="hsl(var(--chart-1))"
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ) : null}
            {active !== null ? (
              <g>
                <line
                  x1={xAt(active)}
                  x2={xAt(active)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                />
                {activePoint?.y !== null && activePoint ? (
                  <circle
                    cx={xAt(active)}
                    cy={yAt(activePoint.y)}
                    r={5}
                    fill="hsl(var(--chart-1))"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            ) : null}
          </svg>
        ) : null}

        {!hasData ? (
          <div className="absolute inset-0 flex items-center justify-center text-body-sm text-muted-foreground">
            Belum ada data pada rentang ini
          </div>
        ) : null}

        {activePoint ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-caption shadow-md"
            style={{ left: tooltipLeft }}
            role="status"
          >
            <p className="text-muted-foreground">{formatXLong(activePoint.x)}</p>
            <p className="font-semibold tabular-nums text-foreground">
              {seriesLabel}: {activePoint.y === null ? "Tidak ada data" : formatY(activePoint.y)}
            </p>
          </div>
        ) : null}
      </div>

      {hasData ? (
        <details className="no-print group text-body-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat sebagai tabel</summary>
          <div className="relative mt-2 max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-body-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-caption text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">{xLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">{seriesLabel}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.x} className="border-b last:border-0">
                    <td className="px-3 py-1.5">{formatXLong(p.x)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {p.y === null ? "Tidak ada data" : formatY(p.y)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
