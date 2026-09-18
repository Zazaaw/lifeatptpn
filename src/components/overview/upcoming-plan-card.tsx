import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarCheckIcon,
  ChatsCircleIcon,
  FlagIcon,
  InstagramLogoIcon,
  MagnifyingGlassIcon,
  ScissorsIcon,
  SunHorizonIcon,
  UsersThreeIcon,
  VideoCameraIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";

import { CornerLink } from "./corner-link";
import { cn } from "@/lib/utils";
import { PLAN_ON_FILL, PLAN_SWATCH, PLAN_TYPE_LABEL, type PlanType, type PlanUpcoming } from "@/lib/plan-types";

const ICON: Record<PlanType, Icon> = {
  shooting: VideoCameraIcon,
  posting: InstagramLogoIcon,
  event: UsersThreeIcon,
  deadline: FlagIcon,
  riset: MagnifyingGlassIcon,
  editing: ScissorsIcon,
  meeting: ChatsCircleIcon,
  libur: SunHorizonIcon,
};

const DAY_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" });
const MONTH_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" });

function hhmm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

function relativeDay(date: string, today: string) {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  return `${diff} hari lagi`;
}

/**
 * Rencana terdekat di halaman Ringkasan. Datanya sama persis dengan menu
 * Rencana (function ig_plan_upcoming), jadi dua halaman tidak mungkin beda.
 * Bila menu Rencana belum aktif (migrasi belum dijalankan), kartu menjelaskan
 * sebabnya, bukan tampil kosong.
 */
export function UpcomingPlanCard({ data, error }: { data: PlanUpcoming | null; error?: string }) {
  return (
    <section
      aria-labelledby="rencana-title"
      className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-5 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="rencana-title" className="flex items-center gap-2 text-lead font-bold tracking-tight">
            <CalendarCheckIcon className="size-5 text-brand-green-strong" weight="fill" aria-hidden />
            Rencana terdekat
          </h2>
          {data ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground tabular-nums">
              <span>{data.count_week} acara dalam 7 hari</span>
              <span>{data.count_month} acara bulan ini</span>
              {data.count_overdue > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <WarningIcon className="size-3.5 text-brand-orange" weight="fill" aria-hidden />
                  {data.count_overdue} lewat tanggal, belum ditandai selesai
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <CornerLink href="/rencana" label="Buka kalender rencana" />
      </div>

      {error ? (
        <p className="rounded-tile border border-brand-orange/40 bg-brand-orange-soft px-4 py-3 text-body-sm">{error}</p>
      ) : !data || data.events.length === 0 ? (
        <div className="rounded-tile border border-dashed border-border px-4 py-6">
          <p className="text-body font-bold">Belum ada rencana ke depan</p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Buka menu Rencana untuk menjadwalkan shooting, editing, posting, atau tenggat laporan.
          </p>
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {data.events.map((e) => {
            const IconCmp = ICON[e.event_type];
            const day = new Date(`${e.date}T00:00:00Z`);
            return (
              <li key={e.id}>
                <Link
                  href={`/rencana?bulan=${e.date.slice(0, 7)}&tanggal=${e.date}`}
                  className="flex h-full gap-3 rounded-tile border border-border/70 bg-card p-3 transition-colors hover:bg-accent/50 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-tile bg-muted text-center leading-none">
                    <span className="text-caption text-muted-foreground">{DAY_FMT.format(day)}</span>
                    <span className="text-body font-bold tabular-nums">{Number(e.date.slice(8, 10))}</span>
                    <span className="text-caption text-muted-foreground">{MONTH_FMT.format(day)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span
                      className={cn(
                        "inline-flex h-5 w-fit items-center gap-1 rounded-full px-2 text-caption font-semibold",
                        PLAN_SWATCH[e.event_type],
                        PLAN_ON_FILL[e.event_type]
                      )}
                    >
                      <IconCmp className="size-3" weight="bold" aria-hidden />
                      {PLAN_TYPE_LABEL[e.event_type]}
                    </span>
                    <span className="line-clamp-2 text-body-sm font-semibold">{e.title}</span>
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {relativeDay(e.date, data.today)}
                      {e.all_day ? ", seharian" : `, ${hhmm(e.hour, e.minute)} WIB`}
                      {e.owner ? `, ${e.owner}` : ""}
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
