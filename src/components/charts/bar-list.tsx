import { cn } from "@/lib/utils";

export type BarItem = {
  key: string;
  label: string;
  value: number | null;
  /** Teks nilai yang ditampilkan di ujung bar. */
  display: string;
  /** Catatan kecil di bawah label, mis. "12 post". */
  note?: string;
  /** Kelas warna mark (bg-chart-*). Default slot 1. */
  swatch?: string;
  /** Tandai baris yang datanya belum cukup: bar diredam dan diberi keterangan. */
  muted?: boolean;
};

/**
 * Bar horizontal (dataviz): tebal ≤ 24px, ujung data membulat 4px dan pangkal
 * persegi, nilai di luar ujung bar, label & angka memakai warna teks (bukan
 * warna seri). Satu seri = satu warna; warna per baris hanya bila baris itu
 * memang entitas berbeda (jenis konten).
 */
export function BarList({ items, className, emptyText = "Belum ada data" }: { items: BarItem[]; className?: string; emptyText?: string }) {
  const max = Math.max(0, ...items.map((i) => (i.value !== null && i.value > 0 ? i.value : 0)));
  if (items.length === 0) {
    return <p className="text-body-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const pct = item.value !== null && max > 0 ? Math.max(0, item.value / max) * 100 : 0;
        return (
          <li key={item.key} className="grid grid-cols-[minmax(6.5rem,32%)_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium break-words">{item.label}</p>
              {item.note ? <p className="text-caption text-muted-foreground">{item.note}</p> : null}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-4 min-w-0 flex-1">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-r-[4px]",
                    item.swatch ?? "bg-chart-1",
                    item.muted && "opacity-40"
                  )}
                  style={{ width: `${pct}%`, minWidth: item.value ? 2 : 0 }}
                />
              </div>
              <span className="w-[5.5rem] shrink-0 text-right text-body-sm tabular-nums">{item.display}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
