import { CornerLink } from "./corner-link";
import { fmtCompact, fmtInt, fmtYmd } from "@/lib/format";
import type { SeriesPoint } from "@/lib/data";
import { cn } from "@/lib/utils";

// Urutan getUTCDay(): 0 = Minggu. Tiga huruf supaya Senin/Selasa/Sabtu tidak tertukar.
const DAY_ABBR = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Views akun 7 hari terakhir rentang (arah desain "Progress" referensi).
 * Batang ramping membulat; hari puncak disorot oranye logo dengan label nilai.
 * Hari tanpa data tampil sebagai titik, bukan batang nol.
 */
export function ViewsWeekCard({ series, href }: { series: SeriesPoint[]; href: string }) {
  const week = series.slice(-7);
  const values = week.map((d) => d.views).filter((v): v is number => v !== null);
  const total = values.reduce((s, v) => s + v, 0);
  const max = Math.max(1, ...values);
  const peak = values.length ? week.findIndex((d) => d.views === Math.max(...values)) : -1;

  return (
    <div className="flex min-h-72 flex-col rounded-card border border-border/70 bg-card/85 p-5 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lead font-bold tracking-tight">Views 7 hari</h2>
        <CornerLink href={href} label="Lihat tren harian lengkap" />
      </div>
      <p className="mt-2 text-h4 font-bold tabular-nums">{values.length ? fmtCompact(total) : "Belum ada"}</p>
      <p className="text-caption text-muted-foreground">
        views akun{week.length ? `, ${fmtYmd(week[0].date)} s.d. ${fmtYmd(week[week.length - 1].date)}` : ""}
      </p>
      <ol className="mt-auto flex h-36 items-end justify-between gap-2 pt-6" aria-label="Views per hari">
        {week.map((d, i) => {
          const pct = d.views !== null ? Math.max(6, (d.views / max) * 100) : 0;
          const day = new Date(`${d.date}T00:00:00Z`).getUTCDay();
          const isPeak = i === peak;
          return (
            <li key={d.date} className="relative flex h-full flex-1 flex-col items-center justify-end gap-2">
              {isPeak && d.views !== null ? (
                <span className="absolute -top-2 z-10 whitespace-nowrap rounded-full bg-brand-orange px-2 py-0.5 text-caption font-semibold text-[#0f1a12] tabular-nums">
                  {fmtCompact(d.views)}
                </span>
              ) : null}
              {d.views !== null ? (
                <span
                  className={cn("w-2.5 rounded-full", isPeak ? "bg-brand-orange" : "bg-foreground/85")}
                  style={{ height: `${pct}%` }}
                  title={`${fmtYmd(d.date)}: ${fmtInt(d.views)} views`}
                />
              ) : (
                <span className="size-2 rounded-full bg-muted-foreground/40" title={`${fmtYmd(d.date)}: belum ada data`} />
              )}
              <span className="text-caption text-muted-foreground">{DAY_ABBR[day]}</span>
              <span className="sr-only">
                {fmtYmd(d.date)}: {d.views === null ? "belum ada data" : `${fmtInt(d.views)} views`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
