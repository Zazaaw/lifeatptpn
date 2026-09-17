import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/format";
import { KIND_LABEL, KIND_ON_FILL, KIND_SWATCH } from "@/lib/kinds";
import type { KindSummary } from "@/lib/data";

/**
 * Median engagement rate (arah desain "Onboarding 18%" referensi): angka besar
 * + blok per jenis konten yang lebarnya sebanding dengan ER masing-masing.
 */
export function ErCard({ medianEr, kinds }: { medianEr: number | null; kinds: KindSummary[] }) {
  const rows = kinds.filter((k) => k.median_er !== null);
  const max = Math.max(0.0001, ...rows.map((k) => k.median_er as number));

  return (
    <div className="flex min-h-72 flex-col rounded-card border border-border/70 bg-card/85 p-5 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h2 className="text-lead font-bold tracking-tight">Engagement rate</h2>
        <p className="text-h4 font-bold tabular-nums">{fmtPct(medianEr, 2, "Belum ada")}</p>
      </div>
      <p className="mt-1 text-caption text-muted-foreground">
        Median per post. (Suka + komentar + simpan + share) dibagi jangkauan.
      </p>
      {rows.length ? (
        <ul className="mt-auto flex flex-col gap-3 pt-5">
          {rows.map((k) => (
            <li key={k.kind} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 min-w-[4.5rem] items-center rounded-full px-3 text-caption font-semibold",
                  KIND_SWATCH[k.kind],
                  KIND_ON_FILL[k.kind]
                )}
                style={{ width: `${Math.max(30, ((k.median_er as number) / max) * 100)}%` }}
              >
                {KIND_LABEL[k.kind]}
              </span>
              <span className="text-body-sm font-medium tabular-nums">{fmtPct(k.median_er, 1)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-auto text-body-sm text-muted-foreground">Belum ada post pada rentang ini.</p>
      )}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
