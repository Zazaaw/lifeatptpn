import type { Metadata } from "next";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BookmarkSimpleIcon,
  ChatCircleIcon,
  ClockCountdownIcon,
  EyeIcon,
  FastForwardIcon,
  HeartIcon,
  HourglassHighIcon,
  PaperPlaneTiltIcon,
  UserCirclePlusIcon,
  UserFocusIcon,
} from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { Notice } from "@/components/notice";
import { PostThumb } from "@/components/post-thumb";
import { KindChip } from "@/components/kind-chip";
import { CommentsPanel } from "@/components/comments/comments-panel";
import { commentsPermissionMissing, getMediaComments, getMediaDetail, getMeta } from "@/lib/data";
import { DAY_NAMES, fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtRelative, fmtSeconds, isNum } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import { parseRange, pickString, rangeQuery } from "@/lib/range";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail konten" };

const COMMENTS_PER_PAGE = 40;
/** Teks pengganti angka: tampil lebih redup supaya tidak terbaca sebagai nilai. */
const EMPTY_VALUES = new Set(["Belum ada", "Tidak tersedia"]);
/** Kolom mengikuti jumlah tile supaya tidak ada tile yatim di baris terakhir (bento cell count). */
const EXTRA_COLS: Record<number, string> = { 3: "2xl:grid-cols-3", 4: "2xl:grid-cols-4", 5: "2xl:grid-cols-3", 6: "2xl:grid-cols-3" };

/** Rasio terhadap jangkauan; null bila salah satu tidak ada atau jangkauan 0 (bukan pembagian dengan nol). */
function perReach(v: number | null, reach: number | null) {
  return isNum(v) && isNum(reach) && reach > 0 ? v / reach : null;
}

export default async function KontenDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  // ID media Instagram hanya angka; tolak sebelum menyentuh database.
  if (!/^\d{5,30}$/.test(id)) notFound();
  const sp = await searchParams;
  const range = parseRange(sp);
  const search = (pickString(sp.q) ?? "").trim().slice(0, 80);
  const cpage = Math.max(1, Number.parseInt(pickString(sp.cpage) ?? "1", 10) || 1);

  const [detail, comments, meta] = await Promise.all([
    getMediaDetail(id),
    // Pencarian "@username" dicocokkan tanpa tanda @ (username tersimpan tanpa @).
    getMediaComments({ id, search: search.replace(/^@+/, "") || null, limit: COMMENTS_PER_PAGE, offset: (cpage - 1) * COMMENTS_PER_PAGE }),
    getMeta(),
  ]);
  if (!detail) notFound();

  const m = detail.media;
  const snaps = detail.snapshots;
  const kind = KIND_LABEL[m.content_kind];
  const firstAge = snaps[0]?.post_age_hours ?? null;
  const rangeParams = { from: range.from, to: range.to };
  const commentsTotal = m.comments_count ?? m.comments;

  // Empat interaksi, masing-masing dibanding jangkauan post. Bar tanpa lintasan
  // (skill-ui-ux §9.F); panjang relatif terhadap interaksi terbesar di post ini.
  const interactions: { label: string; icon: Icon; value: number | null; rate: number | null }[] = [
    { label: "Suka", icon: HeartIcon, value: m.likes, rate: perReach(m.likes, m.reach) },
    { label: "Komentar", icon: ChatCircleIcon, value: commentsTotal, rate: perReach(commentsTotal, m.reach) },
    { label: "Disimpan", icon: BookmarkSimpleIcon, value: m.saves, rate: m.save_rate ?? perReach(m.saves, m.reach) },
    { label: "Dibagikan", icon: PaperPlaneTiltIcon, value: m.shares, rate: m.share_rate ?? perReach(m.shares, m.reach) },
  ];
  const maxInteraction = Math.max(1, ...interactions.map((x) => x.value ?? 0));

  const extra: { label: string; icon: Icon; value: string; hint?: string }[] = [
    { label: "Views 24 jam pertama", icon: HourglassHighIcon, value: fmtInt(m.views_24h, "Belum ada"), hint: m.views_24h === null ? "hanya untuk post yang dipantau sejak tayang" : undefined },
    { label: "Views 7 hari pertama", icon: ClockCountdownIcon, value: fmtInt(m.views_7d, "Belum ada") },
  ];
  if (m.content_kind === "reels") {
    extra.push(
      { label: "Rata-rata durasi tonton", icon: EyeIcon, value: fmtSeconds(m.reels_avg_watch_time_ms) },
      {
        label: "Skip rate",
        icon: FastForwardIcon,
        value: m.reels_skip_rate === null ? "Tidak tersedia" : `${fmtInt(m.reels_skip_rate)}%`,
        hint: "penonton yang langsung lewat",
      }
    );
  }
  if (m.follows !== null) extra.push({ label: "Follow dari post ini", icon: UserCirclePlusIcon, value: fmtInt(m.follows) });
  if (m.profile_visits !== null) extra.push({ label: "Kunjungan profil", icon: UserFocusIcon, value: fmtInt(m.profile_visits) });

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link href={`/konten?${rangeQuery(range)}`} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeftIcon aria-hidden /> Kembali ke daftar konten
          </Link>
          {m.permalink ? (
            <a href={m.permalink} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "default" })}>
              Buka di Instagram <ArrowSquareOutIcon aria-hidden />
              <span className="sr-only">(tab baru)</span>
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,24rem)_1fr] 2xl:grid-cols-[minmax(0,30rem)_1fr]">
          {/* Kolom kiri: gambar + caption, menempel saat halaman digulir */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-card border border-border/70 bg-card/85 p-2 shadow-card">
              <PostThumb src={m.thumb_url} alt={`Thumbnail ${kind}`} className="aspect-square w-full rounded-[1.25rem]" />
            </div>
            <div className="rounded-card border border-border/70 bg-card/85 p-5 shadow-card">
              <p className="text-caption font-semibold text-muted-foreground">Caption</p>
              <p className="mt-2 max-h-72 overflow-y-auto pr-1 text-body-sm whitespace-pre-line break-words">{m.caption?.trim() || "Tanpa caption"}</p>
            </div>
          </div>

          {/* Kolom kanan: angka */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                <KindChip kind={m.content_kind} />
                <span>Diposting hari {DAY_NAMES[m.posted_dow - 1]}</span>
              </div>
              <h1 className="text-h5 font-bold tracking-tight md:text-h4">{fmtDateTime(m.posted_at)}</h1>
              <p className="text-body-sm text-muted-foreground">Angka terakhir diambil {fmtRelative(m.metrics_at)}.</p>
            </div>

            {/* Papan skor */}
            <section aria-label="Angka utama" className="ink-glow overflow-hidden rounded-card p-6 text-ink-foreground shadow-ink md:p-8">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
                <div className="flex flex-col-reverse sm:pr-6">
                  <dt className="mt-2 flex items-center gap-1.5 text-body-sm text-ink-muted">
                    <EyeIcon className="size-4" aria-hidden /> Views
                  </dt>
                  <dd className="text-kpi font-bold tracking-tight tabular-nums 2xl:text-display" title={fmtInt(m.views)}>
                    {fmtCompact(m.views)}
                  </dd>
                </div>
                <div className="flex flex-col-reverse sm:px-6">
                  <dt className="mt-2 text-body-sm text-ink-muted">Jangkauan (akun unik)</dt>
                  <dd className="text-kpi font-bold tracking-tight tabular-nums 2xl:text-display" title={fmtInt(m.reach)}>
                    {fmtCompact(m.reach)}
                  </dd>
                </div>
                <div className="flex flex-col-reverse sm:pl-6">
                  <dt className="mt-2 text-body-sm text-ink-muted">Engagement rate</dt>
                  <dd className="text-kpi font-bold tracking-tight tabular-nums text-brand-orange 2xl:text-display">{fmtPct(m.engagement_rate)}</dd>
                </div>
              </dl>
            </section>

            {/* Interaksi dibanding jangkauan */}
            <section aria-labelledby="interaksi-title" className="rounded-card border border-border/70 bg-card/85 p-5 shadow-card md:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="interaksi-title" className="text-lead font-bold tracking-tight">
                  Interaksi
                </h2>
                <p className="text-caption text-muted-foreground">Persen = dibagi jangkauan post ini</p>
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {interactions.map((x) => (
                  <li key={x.label} className="flex flex-col gap-3 rounded-tile bg-muted/60 p-4">
                    <p className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground">
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-card text-foreground shadow-sm">
                        <x.icon className="size-4" weight="bold" aria-hidden />
                      </span>
                      {x.label}
                    </p>
                    <p className="text-h4 font-bold tracking-tight tabular-nums">{fmtInt(x.value)}</p>
                    <div className="flex flex-col gap-1.5">
                      <span className="block h-1.5 rounded-full bg-chart-1" style={{ width: `${isNum(x.value) ? Math.max(3, (x.value / maxInteraction) * 100) : 0}%` }} aria-hidden />
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {x.rate === null ? "Rasio tidak tersedia" : `${fmtPct(x.rate)} dari jangkauan`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Metrik lain" className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", EXTRA_COLS[extra.length])}>
              {extra.map((x) => (
                <div key={x.label} className="flex items-center gap-4 rounded-tile border border-border/70 bg-card/85 p-4 shadow-card">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-brand-green-strong">
                    <x.icon className="size-5" weight="bold" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-caption font-medium text-muted-foreground">{x.label}</p>
                    <p className={cn("text-lead font-bold tabular-nums", EMPTY_VALUES.has(x.value) && "text-body font-semibold text-muted-foreground")}>
                      {x.value}
                    </p>
                    {x.hint ? <p className="text-caption text-muted-foreground">{x.hint}</p> : null}
                  </div>
                </div>
              ))}
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Pertumbuhan views</CardTitle>
                <CardDescription>Setiap titik adalah satu catatan sinkron. Post umur di bawah 7 hari dicatat tiap jam.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {firstAge !== null && firstAge > 26 ? (
                  <Notice>
                    Pencatatan post ini dimulai saat umurnya sudah {fmtInt(firstAge)} jam, karena post terbit sebelum sistem
                    berjalan. Kurva awal dan views 24 jam pertama tidak bisa direkonstruksi.
                  </Notice>
                ) : null}
                {snaps.length > 1 ? (
                  <LineChart points={snaps.map((s) => ({ x: s.captured_at, y: s.views }))} seriesLabel="Views" xFormat="datetime" xLabel="Dicatat pada" />
                ) : (
                  <p className="text-body-sm text-muted-foreground">
                    Baru ada {snaps.length} catatan. Grafik muncul setelah angka post ini berubah pada sinkron berikutnya.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <CommentsPanel
          data={comments}
          basePath={`/konten/${id}`}
          baseQuery={rangeParams}
          search={search}
          permissionMissing={commentsPermissionMissing(meta)}
        />
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
