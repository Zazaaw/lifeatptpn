import type { Metadata } from "next";
import Link from "next/link";
import { HourglassIcon, ListChecksIcon, PlayIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { EmptyState, Notice, Section } from "@/components/notice";
import { QueryPills } from "@/components/query-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import { PinForm } from "@/components/plan/pin-form";
import { Gantt } from "@/components/being-the-best/gantt";
import { DueLadder } from "@/components/being-the-best/due-ladder";
import { AddProgramButton } from "@/components/being-the-best/edit-dialogs";
import { sectionFill } from "@/components/being-the-best/bits";
import { cn } from "@/lib/utils";
import { fmtDateTime, fmtYmd } from "@/lib/format";
import { pickString, todayWib } from "@/lib/range";
import { editPinConfigured, isUnlocked } from "@/lib/plan-auth";
import { DataError } from "@/lib/supabase-server";
import { getBtb } from "@/lib/being-the-best-data";
import {
  activitiesOf,
  BTB_SECTIONS,
  BTB_STATUSES,
  datesOf,
  isInProgress,
  isSectionKey,
  nextProgramCode,
  scheduleOf,
  shapeBtb,
  statusSlug,
  weeksFor,
  type BtbActivity,
  type BtbList,
} from "@/lib/being-the-best";

export const metadata: Metadata = { title: "Being the Best" };

const LATE = "lewat-jadwal";
const SHOULD_START = "jadwal-mulai";

export default async function BeingTheBestPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [unlocked, configured] = [await isUnlocked(), editPinConfigured()];

  let list: BtbList;
  let migrationNeeded = false;
  try {
    list = await getBtb();
  } catch (e) {
    // Function belum ada = migrasi belum dijalankan. Dibedakan dari galat lain:
    // halaman menjelaskan penyebabnya, bukan diam-diam tampil kosong.
    const detail = e instanceof DataError ? (e.detail ?? "") : "";
    if (/ig_btb_list|schema cache|does not exist|PGRST202/i.test(detail)) {
      migrationNeeded = true;
      list = { today: todayWib(), updated_at: null, programs: [], notes: [] };
    } else {
      throw e;
    }
  }

  const today = list.today ?? todayWib();
  const sections = shapeBtb(list);
  const programs = sections.flatMap((s) => s.programs);
  const acts = programs.flatMap(activitiesOf);
  const pics = [...new Set(acts.map((a) => a.pic).filter((p): p is string => Boolean(p)))];
  const weeks = weeksFor(datesOf(sections));
  const canEdit = unlocked && !migrationNeeded;

  // ---- filter --------------------------------------------------------------
  // Opsi status: daftar tetap + status lain yang mungkin ada di data, supaya tidak hilang dari pilihan.
  const statuses = [
    ...new Map([...BTB_STATUSES.map((s) => [statusSlug(s), s] as const), ...acts.map((a) => [statusSlug(a.status), a.status ?? "Status kosong"] as const)]).entries(),
  ];
  const bagianP = pickString(sp.bagian);
  const statusP = pickString(sp.status);
  const bagian = isSectionKey(bagianP) ? bagianP : null;
  const status = statusP && (statusP === LATE || statusP === SHOULD_START || statuses.some(([k]) => k === statusP)) ? statusP : null;
  const invalidParam = Boolean((bagianP && !bagian) || (statusP && !status));

  const sectionOf = new Map(programs.flatMap((p) => p.items.map((i) => [i.code, p.section] as const)));
  const visible = (a: BtbActivity) => {
    if (bagian && sectionOf.get(a.code) !== bagian) return false;
    if (!status) return true;
    const sch = scheduleOf(a, today);
    if (status === LATE) return sch === "late";
    if (status === SHOULD_START) return sch === "should-start";
    return statusSlug(a.status) === status;
  };
  const shown = acts.filter(visible).length;
  const filtered = Boolean(bagian || status);

  // ---- angka kepala halaman (seluruh timeline, tidak ikut filter) -------------
  const running = acts.filter((a) => isInProgress(a.status)).length;
  const late = acts.filter((a) => scheduleOf(a, today) === "late").length;
  const shouldStart = acts.filter((a) => scheduleOf(a, today) === "should-start").length;
  const first = acts.length ? acts.reduce((m, a) => (a.start < m ? a.start : m), acts[0].start) : null;
  const last = acts.length ? acts.reduce((m, a) => (a.end > m ? a.end : m), acts[0].end) : null;

  const allCodes = programs.flatMap((p) => [p.code, ...p.items.map((i) => i.code)]);
  const programCodes = programs.map((p) => p.code);
  const newProgramDraft = {
    section: "above" as const,
    code: nextProgramCode("above", programCodes, programs.filter((p) => p.section === "above").map((p) => p.code)),
  };

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Being the Best"
          subtitle={
            first && last
              ? `Timeline backward planning program Above & Below the Line, ${fmtYmd(first)} s.d. ${fmtYmd(last)}. Membaca bebas; mengubah perlu PIN tim yang sama dengan Content Plan.`
              : "Timeline backward planning program Above & Below the Line. Membaca bebas; mengubah perlu PIN tim yang sama dengan Content Plan."
          }
          actions={canEdit ? <AddProgramButton draft={newProgramDraft} /> : undefined}
          stats={[
            { label: "Aktivitas", value: String(acts.length), icon: ListChecksIcon, hint: `${programs.length} program, ${pics.length} PIC` },
            { label: "On Progress", value: String(running), icon: PlayIcon, hint: "Status dari tim" },
            {
              label: "Jadwal sudah mulai",
              value: String(shouldStart),
              icon: HourglassIcon,
              hint: "Status masih Not Started",
              title: "Hari ini masuk rentang Start s.d. End, tetapi status masih Not Started",
            },
            {
              label: "Lewat jadwal",
              value: String(late),
              icon: WarningIcon,
              hint: "End lewat, belum Done",
              title: "Tanggal End sudah lewat, tetapi status belum Done",
            },
          ]}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
              <QueryPills
                name="bagian"
                label="Bagian"
                value={bagian ?? ""}
                options={[{ value: "", label: "Semua" }, ...BTB_SECTIONS.map((s) => ({ value: s.key, label: s.label }))]}
              />
              <QueryPills
                name="status"
                label="Status"
                value={status ?? ""}
                options={[
                  { value: "", label: "Semua" },
                  ...statuses.map(([value, label]) => ({ value, label })),
                  { value: SHOULD_START, label: "Jadwal sudah mulai" },
                  { value: LATE, label: "Lewat jadwal" },
                ]}
              />
            </div>
            {!migrationNeeded ? <PinForm unlocked={unlocked} configured={configured} subject="timeline" /> : null}
          </div>
        </PageIntro>

        {invalidParam ? <Notice tone="warning">Filter di alamat halaman tidak dikenali, jadi diabaikan.</Notice> : null}

        {migrationNeeded ? (
          <Notice tone="warning">
            Tabel Being the Best belum ada di database. Jalankan <strong>supabase/migrations/20261112100000_ig_being_the_best.sql</strong> lalu{" "}
            <strong>20261112100100_ig_being_the_best_seed.sql</strong> (isi awal dari file xlsx) di SQL editor Supabase, kemudian muat ulang
            halaman ini.
          </Notice>
        ) : null}

        {programs.length ? (
          <Section
            title="Due per program"
            description="Mulai, selesai, dan lead time dihitung dari semua aktivitas program. Label minggu: W1 = minggu yang Senin-nya paling awal di bulan itu."
          >
            <DueLadder sections={sections} today={today} />
          </Section>
        ) : null}

        <section aria-label="Timeline" className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-4 shadow-card md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lead font-bold tracking-tight">Timeline</h2>
              <p className="mt-1 text-caption text-muted-foreground tabular-nums">
                {filtered ? `${shown} dari ${acts.length} aktivitas cocok dengan filter` : `${acts.length} aktivitas, ${weeks.length} minggu`}
              </p>
            </div>
            <ul aria-label="Keterangan warna" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted-foreground">
              {BTB_SECTIONS.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn("h-2.5 w-5 rounded-[4px]", sectionFill(s.key))} />
                  {s.label}
                </li>
              ))}
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-5 rounded-[4px] border border-brand-orange/40 bg-brand-orange-soft" />
                Minggu due
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-3.5 w-0.5 bg-brand-orange" />
                Hari ini ({fmtYmd(today)})
              </li>
            </ul>
          </div>

          {!programs.length ? (
            <EmptyState title={migrationNeeded ? "Timeline belum bisa dimuat." : "Belum ada program."}>
              {migrationNeeded
                ? "Jalankan dua migrasi di atas dulu."
                : canEdit
                  ? "Tambahkan program pertama lewat tombol Tambah program di kepala halaman."
                  : "Masukkan PIN tim di kepala halaman untuk mulai menambah program."}
            </EmptyState>
          ) : shown || (canEdit && !filtered) ? (
            <Gantt weeks={weeks} sections={sections} today={today} visible={visible} edit={canEdit ? { pics, codes: allCodes } : null} />
          ) : (
            <EmptyState title={filtered ? "Tidak ada aktivitas yang cocok dengan filter." : "Belum ada aktivitas bertanggal."}>
              {filtered ? (
                <Link href="/being-the-best" scroll={false} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}>
                  Reset filter
                </Link>
              ) : (
                "Masukkan PIN tim di kepala halaman untuk menambah aktivitas."
              )}
            </EmptyState>
          )}
          <p className="text-caption text-muted-foreground">
            Durasi = hari kerja Senin s.d. Jumat, inklusif, seperti rumus NETWORKDAYS di file (tanpa daftar libur). &ldquo;Jadwal sudah
            mulai&rdquo; dan &ldquo;Lewat jadwal&rdquo; dihitung dari tanggal hari ini (WIB), bukan diisi tim. Tandai Done supaya aktivitas
            yang sudah selesai tidak terhitung lewat jadwal.
          </p>
        </section>

        {list.notes.length ? (
          <Section title="Asumsi dan catatan" description="Disalin apa adanya dari sheet Ringkasan di file timeline awal.">
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.notes.map((n, i) => (
                <li key={i} className="flex gap-3 rounded-tile border border-border/70 bg-card/85 p-4 text-body-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-caption font-bold text-brand-green-strong tabular-nums">
                    {i + 1}
                  </span>
                  <p className="min-w-0">{n}</p>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {!migrationNeeded ? (
          <p className="text-caption text-muted-foreground">
            Isi awal dari file timeline &ldquo;Being The Best&rdquo; (xlsx tim, 12 Nov 2026), sesudahnya diubah lewat halaman ini.
            {list.updated_at ? ` Terakhir diubah ${fmtDateTime(list.updated_at)}.` : ""}
          </p>
        ) : null}
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
