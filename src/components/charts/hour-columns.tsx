import { fmtCompact, fmtHourSlot, fmtInt } from "@/lib/format";
import type { OnlineHour } from "@/lib/data";

/**
 * Kolom per jam (00 s.d. 23 WIB). Satu seri, satu warna. Kolom ≤ 24px,
 * ujung atas membulat 4px. Nilai tiap jam tersedia lewat tooltip native +
 * tabel alternatif, dan jam puncak diberi label langsung.
 */
export function HourColumns({ data, valueLabel }: { data: OnlineHour[]; valueLabel: string }) {
  if (data.length === 0) return null;
  const byHour = new Map(data.map((d) => [d.hour, d]));
  const max = Math.max(...data.map((d) => d.avg));
  const peak = data.reduce((a, b) => (b.avg > a.avg ? b : a));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-44 items-end gap-[2px]" role="list" aria-label={`${valueLabel} per jam WIB`}>
        {Array.from({ length: 24 }, (_, h) => {
          const d = byHour.get(h);
          const pct = d && max > 0 ? (d.avg / max) * 100 : 0;
          return (
            <div key={h} role="listitem" className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
                style={{ height: `${pct}%` }}
                title={`${fmtHourSlot(h)} WIB: ${d ? fmtInt(d.avg) : "tidak ada data"}`}
              />
              <span className="sr-only">
                {fmtHourSlot(h)} WIB: {d ? fmtInt(d.avg) : "tidak ada data"}
              </span>
              {d && d.hour === peak.hour ? (
                <span className="absolute -top-5 whitespace-nowrap text-caption font-medium tabular-nums">
                  {fmtCompact(d.avg)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center text-caption text-muted-foreground tabular-nums">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}
      </div>
      <details className="no-print text-body-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat sebagai tabel</summary>
        <div className="relative mt-2 max-h-72 overflow-auto rounded-md border">
          <table className="w-full text-body-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-caption text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Jam (WIB)</th>
                <th className="px-3 py-2 text-right font-semibold">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.hour} className="border-b last:border-0">
                  <td className="px-3 py-1.5 tabular-nums">{fmtHourSlot(d.hour)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(d.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
