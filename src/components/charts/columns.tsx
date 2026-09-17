import { cn } from "@/lib/utils";

export type ColumnItem = {
  key: string;
  /** Label sumbu (pendek), mis. "Sen" atau "08". */
  label: string;
  /** Label lengkap untuk tooltip, pembaca layar, dan tabel. */
  fullLabel: string;
  value: number | null;
  display: string;
  note?: string;
  /** Sampel kurang: kolom diredam dan tidak disorot. */
  muted?: boolean;
};

/**
 * Kolom vertikal satu seri (dataviz: bentuk "emphasis"). Semua kolom memakai
 * chart-1, satu kolom terbaik disorot oranye logo dan diberi label langsung.
 * Kolom dengan sampel kurang diredam, bukan dihapus, supaya "belum cukup data"
 * tidak terbaca sebagai "rendah". Ujung atas membulat 4px, pangkal rata, celah 2px.
 * Angka persis selalu ada di tabel alternatif (tooltip tidak jadi satu-satunya jalan).
 */
export function Columns({
  items,
  highlightKey,
  valueLabel,
  labelEvery = 1,
  className,
}: {
  items: ColumnItem[];
  highlightKey?: string | null;
  valueLabel: string;
  /** Tampilkan label sumbu tiap n kolom (24 jam: tiap 3). */
  labelEvery?: number;
  className?: string;
}) {
  const max = Math.max(0, ...items.map((i) => (i.value !== null && i.value > 0 ? i.value : 0)));
  const withValue = items.filter((i) => i.value !== null);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul className="flex h-52 items-end gap-[2px] pt-7" aria-label={valueLabel}>
        {items.map((item) => {
          const pct = item.value !== null && max > 0 ? Math.max(2, (item.value / max) * 100) : 0;
          const hi = item.key === highlightKey;
          return (
            <li key={item.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              {item.value !== null ? (
                <span
                  className={cn(
                    "block w-full max-w-10 rounded-t-[4px] transition-opacity group-hover:opacity-80",
                    hi ? "bg-brand-orange" : "bg-chart-1",
                    item.muted && !hi && "opacity-35"
                  )}
                  style={{ height: `${pct}%` }}
                  title={`${item.fullLabel}: ${item.display}${item.note ? `, ${item.note}` : ""}`}
                />
              ) : (
                <span className="mb-0.5 block size-1.5 rounded-full bg-muted-foreground/30" title={`${item.fullLabel}: tidak ada data`} />
              )}
              {hi && item.value !== null ? (
                <span
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-caption font-bold whitespace-nowrap text-background tabular-nums"
                  style={{ bottom: `calc(${pct}% + 0.375rem)` }}
                >
                  {item.display}
                </span>
              ) : null}
              <span className="sr-only">
                {item.fullLabel}: {item.value === null ? "tidak ada data" : item.display}
                {item.note ? `, ${item.note}` : ""}
                {item.muted ? ", sampel kurang" : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-[2px]" aria-hidden>
        {items.map((item, i) => (
          <span
            key={item.key}
            className={cn(
              "min-w-0 flex-1 text-center text-caption tabular-nums",
              item.key === highlightKey ? "font-bold text-foreground" : "text-muted-foreground"
            )}
          >
            {i % labelEvery === 0 || item.key === highlightKey ? item.label : ""}
          </span>
        ))}
      </div>
      {withValue.length ? (
        <details className="no-print text-body-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat sebagai tabel</summary>
          <div className="relative mt-2 max-h-72 overflow-auto rounded-tile border">
            <table className="w-full text-body-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-caption text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Slot</th>
                  <th className="px-3 py-2 text-right font-semibold">{valueLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {withValue.map((item) => (
                  <tr key={item.key} className="border-b last:border-0">
                    <td className="px-3 py-1.5">{item.fullLabel}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{item.display}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {[item.note, item.muted ? "sampel kurang" : null].filter(Boolean).join(", ")}
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
