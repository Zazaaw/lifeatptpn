import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheckIcon, CameraIcon, CaretLeftIcon, CaretRightIcon, ListChecksIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { Notice } from "@/components/notice";
import { QueryPills } from "@/components/query-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import { MonthCalendar } from "@/components/plan/month-calendar";
import { DayPanel } from "@/components/plan/day-panel";
import { PinForm } from "@/components/plan/pin-form";
import { SampleCleaner } from "@/components/plan/sample-cleaner";
import { getPlanRange } from "@/lib/plan";
import { editPinConfigured, isUnlocked } from "@/lib/plan-auth";
import { PLAN_TYPE_LABEL, PLAN_TYPES, type PlanRange, type PlanType } from "@/lib/plan-types";
import { isPlanType } from "@/lib/plan-types";
import { DataError } from "@/lib/supabase-server";
import { addDays, pickString, todayWib } from "@/lib/range";
import { cn } from "@/lib/utils";
import { PLAN_SWATCH } from "@/lib/plan-types";

export const metadata: Metadata = { title: "Rencana" };

const MONTH_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });
const DAY_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const monthLabel = (ym: string) => MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`));
const dayLabel = (ymd: string) => DAY_FMT.format(new Date(`${ymd}T00:00:00Z`));

/** Senin pada minggu tanggal tersebut (WIB, minggu mulai Senin). */
function mondayOf(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  return addDays(ymd, -shift);
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const EMPTY_RANGE = (from: string, to: string): PlanRange => ({ from, to, events: [], by_type: {}, sample_count: 0, posts: [] });

export default async function RencanaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const today = todayWib();

  const monthParam = pickString(sp.bulan);
  const month = monthParam && YM.test(monthParam) ? monthParam : today.slice(0, 7);
  const monthInvalid = Boolean(monthParam && !YM.test(monthParam));

  const firstOfMonth = `${month}-01`;
  const gridFrom = mondayOf(firstOfMonth);
  const gridTo = addDays(gridFrom, 41);

  const dateParam = pickString(sp.tanggal);
  const dateValid = dateParam && YMD.test(dateParam) && dateParam >= gridFrom && dateParam <= gridTo;
  const selected = dateValid ? dateParam! : today.startsWith(month) ? today : firstOfMonth;

  const typeParam = pickString(sp.jenis);
  const type: PlanType | null = isPlanType(typeParam) ? typeParam : null;

  const [unlocked, configured] = [await isUnlocked(), editPinConfigured()];

  let data: PlanRange;
  let migrationNeeded = false;
  try {
    data = await getPlanRange(gridFrom, gridTo, type);
  } catch (e) {
    // Fungsi belum ada = migrasi belum dijalankan. Bedakan dari galat lain:
    // halaman tetap menjelaskan penyebabnya, bukan diam-diam tampil kosong.
    const detail = e instanceof DataError ? (e.detail ?? "") : "";
    if (/ig_plan_list|schema cache|does not exist|PGRST202/i.test(detail)) {
      migrationNeeded = true;
      data = EMPTY_RANGE(gridFrom, gridTo);
    } else {
      throw e;
    }
  }

  const monthEvents = data.events.filter((e) => e.date.startsWith(month));
  const monthPosts = data.posts.filter((p) => p.date.startsWith(month));
  const openCount = monthEvents.filter((e) => e.status === "rencana").length;

  const dayEvents = data.events
    .filter((e) => e.date <= selected && e.end_date >= selected)
    .sort((a, b) => (a.all_day === b.all_day ? a.starts_at.localeCompare(b.starts_at) : a.all_day ? -1 : 1));
  const dayPosts = data.posts.filter((p) => p.date === selected);

  const href = (next: { bulan?: string; tanggal?: string }) => {
    const q = new URLSearchParams();
    q.set("bulan", next.bulan ?? month);
    if (next.tanggal) q.set("tanggal", next.tanggal);
    if (type) q.set("jenis", type);
    return `/rencana?${q.toString()}`;
  };

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Rencana konten"
          subtitle="Jadwal produksi dan posting tim. Klik tanggal untuk melihat rincian acara hari itu, lengkap dengan deskripsi, lokasi, dan penanggung jawab."
          stats={[
            { label: `Acara ${monthLabel(month)}`, value: String(monthEvents.length), icon: CalendarCheckIcon },
            { label: "Belum selesai", value: String(openCount), icon: ListChecksIcon },
            { label: "Terbit bulan ini", value: String(monthPosts.length), icon: CameraIcon },
          ]}
        >
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <QueryPills
              name="jenis"
              label="Jenis acara"
              value={type ?? ""}
              options={[{ value: "", label: "Semua" }, ...PLAN_TYPES.map((t) => ({ value: t, label: PLAN_TYPE_LABEL[t] }))]}
            />
            <PinForm unlocked={unlocked} configured={configured} />
          </div>
        </PageIntro>

        {monthInvalid ? <Notice tone="warning">Bulan di alamat halaman tidak valid, jadi kalender kembali ke bulan berjalan.</Notice> : null}

        {migrationNeeded ? (
          <Notice tone="warning">
            Tabel rencana belum ada di database. Jalankan{" "}
            <strong>supabase/migrations/20260918090000_ig_plan.sql</strong> di SQL editor Supabase, lalu muat ulang halaman ini.
            Sampai itu dijalankan, kalender tetap tampil tetapi kosong.
          </Notice>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]">
          <section aria-label="Kalender" className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-4 shadow-card md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lead font-bold tracking-tight">{monthLabel(month)}</h2>
              <div className="no-print flex items-center gap-2">
                <Link
                  href={href({ bulan: shiftMonth(month, -1) })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  aria-label={`Bulan sebelumnya, ${monthLabel(shiftMonth(month, -1))}`}
                >
                  <CaretLeftIcon aria-hidden />
                </Link>
                <Link href={href({ bulan: today.slice(0, 7), tanggal: today })} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Hari ini
                </Link>
                <Link
                  href={href({ bulan: shiftMonth(month, 1) })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  aria-label={`Bulan berikutnya, ${monthLabel(shiftMonth(month, 1))}`}
                >
                  <CaretRightIcon aria-hidden />
                </Link>
              </div>
            </div>

            <MonthCalendar
              gridFrom={gridFrom}
              month={month}
              today={today}
              selected={selected}
              events={data.events}
              posts={data.posts}
              hrefFor={(d) => href({ tanggal: d })}
            />

            <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
              <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Keterangan warna jenis acara">
                {PLAN_TYPES.map((t) => (
                  <li key={t} className="flex items-center gap-1.5 text-caption text-muted-foreground">
                    <span className={cn("size-3 rounded-[3px]", PLAN_SWATCH[t])} aria-hidden />
                    {PLAN_TYPE_LABEL[t]}
                    <span className="tabular-nums">({data.by_type[t] ?? 0})</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <CameraIcon className="size-3.5 text-brand-green-strong" weight="bold" aria-hidden />
                  Jumlah postingan yang benar-benar terbit
                </li>
              </ul>
              {data.sample_count > 0 ? (
                <SampleCleaner count={data.sample_count} canEdit={unlocked} />
              ) : null}
            </div>
          </section>

          <div className="xl:sticky xl:top-6">
            <DayPanel
              key={selected}
              date={selected}
              dateLabel={dayLabel(selected)}
              events={dayEvents}
              posts={dayPosts}
              canEdit={unlocked}
              detailQuery=""
            />
          </div>
        </div>
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
