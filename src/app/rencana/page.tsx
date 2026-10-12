import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, CheckCircleIcon, ClockIcon, FilesIcon, PencilSimpleIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { Notice } from "@/components/notice";
import { QueryPills, QuerySearch, QuerySelect } from "@/components/query-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import { PinForm } from "@/components/plan/pin-form";
import { TaxonomyCard } from "@/components/content-plan/taxonomy-card";
import { ContentTable, CreateContentButton } from "@/components/content-plan/content-table";
import { getContentPlan } from "@/lib/content-plan-data";
import {
  FORMATS,
  isFormat,
  isPillar,
  isRubrik,
  isStatusFilter,
  PILLARS,
  RUBRIKS,
  STATUSES,
  type CpList,
  type Pillar,
  type Rubrik,
} from "@/lib/content-plan";
import { editPinConfigured, isUnlocked } from "@/lib/plan-auth";
import { DataError } from "@/lib/supabase-server";
import { addDays, pickString, todayWib } from "@/lib/range";

export const metadata: Metadata = { title: "Content Plan" };

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_FMT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" });
const SHORT_Y = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

const monthLabel = (ym: string) => MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`));
const d = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/** Senin pada minggu tanggal tersebut (minggu mulai Senin, tanggal WIB). */
function mondayOf(ymd: string) {
  const shift = (d(ymd).getUTCDay() + 6) % 7;
  return addDays(ymd, -shift);
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastDayOf(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function validDate(ymd: string | undefined): ymd is string {
  return Boolean(ymd && YMD.test(ymd) && !Number.isNaN(d(ymd).getTime()) && d(ymd).toISOString().slice(0, 10) === ymd);
}

type View = "minggu" | "bulan" | "daftar";

const EMPTY_LIST = (from: string | null, to: string | null, today: string): CpList => ({
  from,
  to,
  today,
  kpi: { total: 0, published: 0, on_progress: 0, review: 0, overdue: 0 },
  by_pillar: {},
  by_rubrik: Object.fromEntries(RUBRIKS.map((r) => [r.slug, { plan: 0, posts: 0 }])) as CpList["by_rubrik"],
  items_total: 0,
  limit: 300,
  items: [],
  pics: [],
});

export default async function ContentPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const today = todayWib();

  // ---- periode -------------------------------------------------------------
  const viewParam = pickString(sp.tampilan);
  const view: View = viewParam === "minggu" || viewParam === "daftar" ? viewParam : "bulan";

  const monthParam = pickString(sp.bulan);
  const month = monthParam && YM.test(monthParam) ? monthParam : today.slice(0, 7);
  const weekParam = pickString(sp.minggu);
  const weekStart = mondayOf(validDate(weekParam) ? weekParam : today);
  const invalidParam = Boolean((monthParam && !YM.test(monthParam)) || (weekParam && !validDate(weekParam)));

  const from = view === "bulan" ? `${month}-01` : view === "minggu" ? weekStart : null;
  const to = view === "bulan" ? lastDayOf(month) : view === "minggu" ? addDays(weekStart, 6) : null;
  const periodLabel =
    view === "bulan"
      ? monthLabel(month)
      : view === "minggu"
        ? `${SHORT.format(d(from!))} s.d. ${SHORT_Y.format(d(to!))}`
        : "semua tanggal";

  // ---- filter tabel --------------------------------------------------------
  const pillarP = pickString(sp.pilar);
  const rubrikP = pickString(sp.rubrik);
  const formatP = pickString(sp.format);
  const statusP = pickString(sp.status);
  const q = (pickString(sp.q) ?? "").trim().slice(0, 80);
  const pillar = isPillar(pillarP) ? pillarP : null;
  const rubrik = isRubrik(rubrikP) ? rubrikP : null;
  const format = isFormat(formatP) ? formatP : null;
  const status = isStatusFilter(statusP) ? statusP : null;
  const filtered = Boolean(pillar || rubrik || format || status || q);

  const [unlocked, configured] = [await isUnlocked(), editPinConfigured()];

  let data: CpList;
  let migrationNeeded = false;
  try {
    data = await getContentPlan({ from, to, pillar, rubrik, format, status, q: q || null });
  } catch (e) {
    // Function belum ada = migrasi belum dijalankan. Dibedakan dari galat lain:
    // halaman menjelaskan penyebabnya, bukan diam-diam tampil kosong.
    const detail = e instanceof DataError ? (e.detail ?? "") : "";
    if (/ig_cp_list|schema cache|does not exist|PGRST202/i.test(detail)) {
      migrationNeeded = true;
      data = EMPTY_LIST(from, to, today);
    } else {
      throw e;
    }
  }

  // ---- URL -----------------------------------------------------------------
  const base = {
    tampilan: view === "bulan" ? undefined : view,
    bulan: view === "bulan" && month !== today.slice(0, 7) ? month : undefined,
    minggu: view === "minggu" && weekStart !== mondayOf(today) ? weekStart : undefined,
    pilar: pillar ?? undefined,
    rubrik: rubrik ?? undefined,
    format: format ?? undefined,
    status: status ?? undefined,
    q: q || undefined,
  };
  const href = (next: Partial<Record<keyof typeof base, string | null | undefined>>) => {
    const merged = { ...base, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/rencana?${s}` : "/rencana";
  };
  const resetHref = href({ pilar: null, rubrik: null, format: null, status: null, q: null });

  const prevHref =
    view === "bulan" ? href({ bulan: shiftMonth(month, -1) }) : view === "minggu" ? href({ minggu: addDays(weekStart, -7) }) : null;
  const nextHref =
    view === "bulan" ? href({ bulan: shiftMonth(month, 1) }) : view === "minggu" ? href({ minggu: addDays(weekStart, 7) }) : null;
  const nowHref = view === "bulan" ? href({ bulan: null }) : view === "minggu" ? href({ minggu: null }) : null;
  const atNow = view === "bulan" ? month === today.slice(0, 7) : view === "minggu" ? weekStart === mondayOf(today) : true;

  // Bulan untuk lompat cepat: 12 bulan ke belakang sampai 6 bulan ke depan.
  const monthOptions = Array.from({ length: 19 }, (_, i) => shiftMonth(today.slice(0, 7), i - 12))
    .reverse()
    .map((m) => ({ value: m === today.slice(0, 7) ? "" : m, label: monthLabel(m) }));
  if (!monthOptions.some((o) => (o.value || today.slice(0, 7)) === month)) {
    monthOptions.unshift({ value: month, label: monthLabel(month) });
  }

  // ---- KPI -----------------------------------------------------------------
  const k = data.kpi;
  const pct = (n: number) => (k.total ? `${Math.round((n / k.total) * 100)}% dari total` : "Belum ada konten");
  const defaultDate = from && today < from ? from : to && today > to ? from! : today;

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Content Plan"
          subtitle="Rencana, produksi, dan publikasi konten @lifeatptpn. Membaca bebas; menambah dan mengubah perlu PIN tim."
          actions={unlocked ? <CreateContentButton defaultDate={defaultDate} pics={data.pics} /> : undefined}
          stats={[
            { label: "Total konten", value: String(k.total), icon: FilesIcon, hint: view === "daftar" ? "Semua tanggal" : periodLabel },
            { label: "Published", value: String(k.published), icon: CheckCircleIcon, hint: pct(k.published) },
            {
              label: "On Progress",
              value: String(k.on_progress),
              icon: PencilSimpleIcon,
              hint: pct(k.on_progress),
              title: "Rencana, Produksi, dan Editing yang belum lewat tanggal tayang",
            },
            { label: "Review", value: String(k.review), icon: ClockIcon, hint: pct(k.review), title: "Menunggu review dan belum lewat tanggal tayang" },
            {
              label: "Overdue",
              value: String(k.overdue),
              icon: WarningIcon,
              hint: pct(k.overdue),
              title: "Lewat tanggal tayang tetapi belum Published",
            },
          ]}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                <QueryPills
                  name="tampilan"
                  label="Tampilan"
                  value={view === "bulan" ? "" : view}
                  options={[
                    { value: "minggu", label: "Mingguan" },
                    { value: "", label: "Bulanan" },
                    { value: "daftar", label: "Daftar" },
                  ]}
                />
                {view !== "daftar" ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-caption font-medium text-muted-foreground">{view === "bulan" ? "Bulan" : "Minggu"}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={prevHref!} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={view === "bulan" ? "Bulan sebelumnya" : "Minggu sebelumnya"}>
                        <CaretLeftIcon aria-hidden />
                      </Link>
                      {view === "bulan" ? (
                        <QuerySelect name="bulan" id="cp-bulan" label="Pilih bulan" value={month === today.slice(0, 7) ? "" : month} options={monthOptions} />
                      ) : (
                        <span className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-body-sm font-semibold tabular-nums">{periodLabel}</span>
                      )}
                      <Link href={nextHref!} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={view === "bulan" ? "Bulan berikutnya" : "Minggu berikutnya"}>
                        <CaretRightIcon aria-hidden />
                      </Link>
                      {!atNow ? (
                        <Link href={nowHref!} scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          {view === "bulan" ? "Bulan ini" : "Minggu ini"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <PinForm unlocked={unlocked} configured={configured} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.4fr)_repeat(4,minmax(9rem,1fr))_auto] lg:items-end">
              <QuerySearch key={q} name="q" id="cp-q" value={q} label="Cari" placeholder="Judul, keterangan, atau PIC" />
              <QuerySelect
                name="pilar"
                id="cp-pilar"
                label="Pillar"
                value={pillar ?? ""}
                options={[{ value: "", label: "Semua pilar" }, ...PILLARS.map((p) => ({ value: p.slug, label: p.label }))]}
              />
              <QuerySelect
                name="rubrik"
                id="cp-rubrik"
                label="Rubrik"
                value={rubrik ?? ""}
                options={[{ value: "", label: "Semua rubrik" }, ...RUBRIKS.map((r) => ({ value: r.slug, label: r.label }))]}
              />
              <QuerySelect
                name="format"
                id="cp-format"
                label="Format"
                value={format ?? ""}
                options={[{ value: "", label: "Semua format" }, ...FORMATS.map((f) => ({ value: f.slug, label: f.label }))]}
              />
              <QuerySelect
                name="status"
                id="cp-status"
                label="Status"
                value={status ?? ""}
                options={[
                  { value: "", label: "Semua status" },
                  ...STATUSES.map((s) => ({ value: s.slug, label: s.label })),
                  { value: "overdue", label: "Lewat tanggal" },
                ]}
              />
              {filtered ? (
                <Link href={resetHref} scroll={false} className={buttonVariants({ variant: "outline" })}>
                  Reset filter
                </Link>
              ) : (
                <span className="hidden lg:block" aria-hidden />
              )}
            </div>
          </div>
        </PageIntro>

        {invalidParam ? <Notice tone="warning">Periode di alamat halaman tidak valid, jadi tampilan kembali ke periode berjalan.</Notice> : null}

        {migrationNeeded ? (
          <Notice tone="warning">
            Tabel Content Plan belum ada di database. Jalankan <strong>supabase/migrations/20261012090000_ig_content_plan.sql</strong> di SQL
            editor Supabase, lalu muat ulang halaman ini. Sampai itu dijalankan, halaman tampil kosong dan konten belum bisa ditambahkan.
          </Notice>
        ) : null}

        <TaxonomyCard
          data={data}
          activePillar={pillar}
          activeRubrik={rubrik}
          periodLabel={view === "daftar" ? "di semua tanggal" : periodLabel}
          hrefFor={(next: { pilar?: Pillar | null; rubrik?: Rubrik | null }) => href(next)}
        />

        <section aria-label="Daftar konten" className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-4 shadow-card md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lead font-bold tracking-tight">Daftar konten</h2>
            <p className="text-caption text-muted-foreground tabular-nums">
              {filtered ? `${data.items_total} dari ${k.total} konten cocok dengan filter` : `${k.total} konten, ${periodLabel}`}
            </p>
          </div>

          {data.items_total > data.items.length ? (
            <Notice tone="warning">
              Menampilkan {data.items.length} dari {data.items_total} konten. Persempit periode atau filter untuk melihat sisanya.
            </Notice>
          ) : null}

          <ContentTable
            items={data.items}
            canEdit={unlocked && !migrationNeeded}
            pics={data.pics}
            today={defaultDate}
            empty={
              <div className="flex flex-col items-center gap-3 rounded-tile border border-dashed border-border px-6 py-12 text-center">
                <FilesIcon className="size-8 text-muted-foreground" aria-hidden />
                {filtered ? (
                  <>
                    <p className="text-body font-semibold">Tidak ada konten yang cocok dengan filter.</p>
                    <Link href={resetHref} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Reset filter
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-body font-semibold">Belum ada konten {view === "daftar" ? "sama sekali" : `untuk ${periodLabel}`}.</p>
                    <p className="max-w-[48ch] text-body-sm text-muted-foreground">
                      {unlocked
                        ? "Tambahkan rencana pertama lewat tombol Buat Konten di atas."
                        : "Masukkan PIN tim di kepala halaman untuk mulai menambah rencana konten."}
                    </p>
                  </>
                )}
              </div>
            }
          />
        </section>
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
