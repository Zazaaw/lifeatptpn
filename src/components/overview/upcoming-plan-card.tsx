import Link from "next/link";
import { CalendarCheckIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { CornerLink } from "./corner-link";
import { PillarChip } from "@/components/content-plan/bits";
import { FORMAT_LABEL, STATUS_LABEL, type CpUpcoming } from "@/lib/content-plan";
import { cn } from "@/lib/utils";

const DAY_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" });
const MONTH_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" });

function relativeDay(date: string, today: string) {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  return `${diff} hari lagi`;
}

/**
 * Rencana terdekat di halaman Ringkasan: konten Content Plan yang belum
 * Published, yang lewat tanggal tayang lebih dulu (perlu perhatian). Datanya
 * dari function yang sama dengan menu Rencana (ig_cp_upcoming), jadi dua
 * halaman tidak mungkin beda. Bila migrasi belum dijalankan, kartu
 * menjelaskan sebabnya, bukan tampil kosong.
 */
export function UpcomingPlanCard({ data, error }: { data: CpUpcoming | null; error?: string }) {
  return (
    <section aria-labelledby="rencana-title" className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="rencana-title" className="flex items-center gap-2 text-lead font-bold tracking-tight">
            <CalendarCheckIcon className="size-5 text-brand-green-strong" weight="fill" aria-hidden />
            Rencana terdekat
          </h2>
          {data ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground tabular-nums">
              <span>{data.open_total} konten belum published</span>
              {data.overdue_total > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <WarningIcon className="size-3.5 text-destructive" weight="fill" aria-hidden />
                  {data.overdue_total} lewat tanggal tayang
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <CornerLink href="/rencana" label="Buka Content Plan" />
      </div>

      {error ? (
        <p className="rounded-tile border border-brand-orange/40 bg-brand-orange-soft px-4 py-3 text-body-sm">{error}</p>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-tile border border-dashed border-border px-4 py-6">
          <p className="text-body font-bold">Tidak ada konten yang menunggu</p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Semua rencana sudah Published, atau belum ada rencana. Buka Content Plan untuk menambah.
          </p>
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {data.items.map((e) => {
            const day = new Date(`${e.planned_on}T00:00:00Z`);
            return (
              <li key={e.id}>
                <Link
                  href={`/rencana?bulan=${e.planned_on.slice(0, 7)}`}
                  className="flex h-full gap-3 rounded-tile border border-border/70 bg-card p-3 transition-colors outline-hidden hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 flex-col items-center justify-center rounded-tile text-center leading-none",
                      e.overdue ? "bg-destructive/10" : "bg-muted"
                    )}
                  >
                    <span className="text-caption text-muted-foreground">{DAY_FMT.format(day)}</span>
                    <span className={cn("text-body font-bold tabular-nums", e.overdue && "text-destructive")}>{Number(e.planned_on.slice(8, 10))}</span>
                    <span className="text-caption text-muted-foreground">{MONTH_FMT.format(day)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <PillarChip pillar={e.pillar} className="w-fit" />
                    <span className="line-clamp-2 text-body-sm font-semibold">{e.title}</span>
                    <span className={cn("text-caption tabular-nums", e.overdue ? "font-semibold text-destructive" : "text-muted-foreground")}>
                      {relativeDay(e.planned_on, data.today)}, {STATUS_LABEL[e.status]}, {FORMAT_LABEL[e.format]}
                      {e.pic ? `, ${e.pic}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
