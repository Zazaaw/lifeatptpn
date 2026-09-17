"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { DAY_NAMES, DAY_SHORT, fmtHourSlot, fmtInt, fmtPct } from "@/lib/format";

export type HeatCell = { dow: number; hour: number; n: number; median: number; valid: boolean };

const HEAT = ["bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4", "bg-heat-5", "bg-heat-6"];

/**
 * Heatmap hari × jam WIB (dataviz: sekuensial satu hue, terang → gelap).
 * Kelas warna dibagi per kuantil dari sel yang valid saja, supaya satu post
 * viral tidak membuat semua sel lain tampak sama pucat.
 * Sel dengan sampel < minimum diberi arsir (bukan warna) dan tidak ikut skala:
 * "data belum cukup" tidak boleh terlihat seperti "performa rendah".
 */
export function Heatmap({
  cells,
  metric,
  minSamples,
}: {
  cells: HeatCell[];
  metric: "views" | "rate";
  minSamples: number;
}) {
  const [active, setActive] = useState<HeatCell | null>(null);
  const fmt = (v: number) => (metric === "rate" ? fmtPct(v) : `${fmtInt(v)} views`);

  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  const validSorted = cells.filter((c) => c.valid).map((c) => c.median).sort((a, b) => a - b);
  const bin = (v: number) => {
    if (validSorted.length <= 1) return HEAT.length - 1;
    let idx = 0;
    while (idx < validSorted.length && validSorted[idx] <= v) idx++;
    return Math.min(HEAT.length - 1, Math.floor(((idx - 1) / (validSorted.length - 1)) * (HEAT.length - 1)));
  };

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto pb-1">
        <div className="grid min-w-[42rem] grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-[2px]">
          <div />
          {hours.map((h) => (
            <div key={h} className="pb-1 text-center text-caption text-muted-foreground tabular-nums">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </div>
          ))}
          {DAY_SHORT.map((day, di) => (
            <div key={day} className="contents">
              <div className="flex items-center text-caption text-muted-foreground">{day}</div>
              {hours.map((h) => {
                const cell = byKey.get(`${di + 1}-${h}`);
                const label = cell
                  ? `${DAY_NAMES[di]} ${fmtHourSlot(h)}, median ${fmt(cell.median)} dari ${cell.n} post${cell.valid ? "" : ", data belum cukup"}`
                  : `${DAY_NAMES[di]} ${fmtHourSlot(h)}, tidak ada post`;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={label}
                    onMouseEnter={() => cell && setActive(cell)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => cell && setActive(cell)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      "aspect-square min-h-6 rounded-[3px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      !cell && "bg-muted/60",
                      cell && !cell.valid && "bg-muted bg-[repeating-linear-gradient(45deg,transparent_0_3px,hsl(var(--muted-foreground)/0.35)_3px_4px)]",
                      cell && cell.valid && HEAT[bin(cell.median)]
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm tabular-nums" role="status" aria-live="polite">
          {active ? (
            <>
              <span className="font-semibold">
                {DAY_NAMES[active.dow - 1]}, {fmtHourSlot(active.hour)} WIB
              </span>
              <span className="text-muted-foreground">
                {": "}median {fmt(active.median)}, {active.n} post
                {active.valid ? "" : ` (kurang dari ${minSamples}, belum bisa disimpulkan)`}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Arahkan kursor atau tab ke kotak untuk melihat angkanya.</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            Rendah
            <span className="flex gap-[2px]">
              {HEAT.map((c) => (
                <span key={c} className={cn("size-3 rounded-[2px]", c)} />
              ))}
            </span>
            Tinggi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-muted bg-[repeating-linear-gradient(45deg,transparent_0_3px,hsl(var(--muted-foreground)/0.35)_3px_4px)]" />
            Sampel kurang dari {minSamples}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-muted/60" />
            Tidak ada post
          </span>
        </div>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
